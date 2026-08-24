import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Ruta {
  /** Vertices del camino, ya en el orden que espera Google Maps. */
  puntos: google.maps.LatLngLiteral[];
  /** Distancia real por calles, en metros. */
  metros: number;
  /** Minutos a pie, estimados por nosotros (ver nota abajo). */
  minutos: number;
}

interface RespuestaOsrm {
  code: string;
  routes?: Array<{
    distance: number;
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
  private static readonly METROS_POR_MINUTO = 5000 / 60;

  private static readonly SERVIDOR = 'https://router.project-osrm.org/route/v1';

  async calcular(
    origen: google.maps.LatLngLiteral,
    destino: google.maps.LatLngLiteral
  ): Promise<Ruta | null> {
    // OSRM pide longitud antes que latitud, al reves que Google.
    const tramo = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
    const url = `${RutaService.SERVIDOR}/foot/${tramo}?overview=full&geometries=geojson`;

    try {
      const r = await firstValueFrom(this.http.get<RespuestaOsrm>(url));
      const ruta = r.code === 'Ok' ? r.routes?.[0] : undefined;
      if (!ruta) {
        return null;
      }

      return {
        puntos: ruta.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        metros: Math.round(ruta.distance),
        // El servidor publico enruta con perfil de coche aunque se le pida
        // "foot", asi que su duracion no sirve: la calculamos nosotros.
        minutos: Math.max(
          1,
          Math.round(ruta.distance / RutaService.METROS_POR_MINUTO)
        ),
      };
    } catch {
      return null;
    }
  }
}
