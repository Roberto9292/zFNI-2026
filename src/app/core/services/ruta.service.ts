import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Cómo se desplaza el usuario dentro del campus. No es solo a pie: la
 * Ciudadela tiene vías internas por las que se circula en auto y en moto.
 */
export type ModoViaje = 'pie' | 'vehiculo';

export interface Ruta {
  /** Vertices del camino, ya en el orden que espera Google Maps. */
  puntos: google.maps.LatLngLiteral[];
  /** Distancia real por calles, en metros. */
  metros: number;
  /** Minutos de trayecto en el modo pedido. */
  minutos: number;
}

interface RespuestaOsrm {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}

/**
 * Rutas por calles con OSRM, el router de OpenStreetMap.
 *
 * Por que no la Directions API de Google: exige facturacion activa, que es
 * justo lo que bloquea este proyecto. Y extraer rutas de google.com/maps para
 * redibujarlas aqui lo prohiben sus terminos de uso.
 */
@Injectable({ providedIn: 'root' })
export class RutaService {
  private http = inject(HttpClient);

  /** Velocidad a pie de referencia: 5 km/h. */
  private static readonly METROS_POR_MINUTO_A_PIE = 5000 / 60;

  private static readonly SERVIDOR = 'https://router.project-osrm.org/route/v1';

  /**
   * El servidor publico enruta con perfil de coche siempre, incluso cuando se
   * le pide "foot": comprobado pidiendo el mismo tramo con los dos perfiles,
   * devuelve identica geometria e identica duracion.
   *
   * Consecuencia: hoy el trazado es el mismo en los dos modos y lo que cambia
   * es el tiempo estimado, calculado aqui a 5 km/h para el peaton. Se manda
   * igual el perfil correcto para que hospedar un OSRM propio sea cambiar la
   * URL y nada mas.
   */
  private static readonly PERFIL: Record<ModoViaje, string> = {
    pie: 'foot',
    vehiculo: 'driving',
  };

  async calcular(
    origen: google.maps.LatLngLiteral,
    destino: google.maps.LatLngLiteral,
    modo: ModoViaje = 'pie'
  ): Promise<Ruta | null> {
    // OSRM pide longitud antes que latitud, al reves que Google.
    const tramo = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
    const perfil = RutaService.PERFIL[modo];
    const url = `${RutaService.SERVIDOR}/${perfil}/${tramo}?overview=full&geometries=geojson`;

    try {
      const r = await firstValueFrom(this.http.get<RespuestaOsrm>(url));
      const ruta = r.code === 'Ok' ? r.routes?.[0] : undefined;
      if (!ruta) {
        return null;
      }

      return {
        puntos: ruta.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        metros: Math.round(ruta.distance),
        minutos:
          modo === 'vehiculo'
            ? Math.max(1, Math.round(ruta.duration / 60))
            : Math.max(
                1,
                Math.round(ruta.distance / RutaService.METROS_POR_MINUTO_A_PIE)
              ),
      };
    } catch {
      return null;
    }
  }
}
