import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '../models/location.interface';
import { RutaService } from './ruta.service';

/**
 * Sigue al usuario hasta un destino: mantiene la posición, pide la ruta por
 * calles y la recalcula cuando merece la pena.
 *
 * Vive fuera del componente del mapa porque es estado con ciclo de vida
 * propio (una suscripción al GPS que hay que cerrar), no pintura.
 */
@Injectable({ providedIn: 'root' })
export class NavegacionService {
  private rutas = inject(RutaService);

  /** Metros que hay que moverse para pedir una ruta nueva. */
  private static readonly UMBRAL_RECALCULO = 25;

  readonly destino = signal<Location | null>(null);
  readonly miPosicion = signal<google.maps.LatLngLiteral | null>(null);
  readonly precision = signal<number | null>(null);

  readonly trazado = signal<google.maps.LatLngLiteral[]>([]);
  readonly metros = signal<number | null>(null);
  readonly minutos = signal<number | null>(null);

  /** true si el router falló y se muestra la línea recta de reserva. */
  readonly aproximada = signal(false);

  readonly activa = computed(() => this.destino() !== null);

  readonly distanciaTexto = computed(() => {
    const m = this.metros();
    if (m === null) {
      return '';
    }
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m} m`;
  });

  private vigilanciaId: number | null = null;
  private origenCalculado: google.maps.LatLngLiteral | null = null;

  /** Distancia entre dos puntos en metros (fórmula del haversine). */
  static metrosEntre(
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral
  ): number {
    const R = 6371000;
    const rad = (grados: number) => (grados * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * Empieza a seguir la posición hasta `destino`.
   * @returns false si el navegador no ofrece geolocalización.
   */
  iniciar(destino: Location, alFallar: () => void): boolean {
    if (!navigator.geolocation) {
      return false;
    }

    this.detener();
    this.destino.set(destino);

    this.vigilanciaId = navigator.geolocation.watchPosition(
      (posicion) => {
        const { latitude, longitude, accuracy } = posicion.coords;
        const aqui = { lat: latitude, lng: longitude };
        const primera = this.miPosicion() === null;

        this.miPosicion.set(aqui);
        this.precision.set(Math.round(accuracy));
        void this.recalcular(aqui, destino, primera);
      },
      () => {
        alFallar();
        this.detener();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    );

    return true;
  }

  detener(): void {
    if (this.vigilanciaId !== null) {
      navigator.geolocation.clearWatch(this.vigilanciaId);
      this.vigilanciaId = null;
    }

    this.destino.set(null);
    this.miPosicion.set(null);
    this.precision.set(null);
    this.trazado.set([]);
    this.metros.set(null);
    this.minutos.set(null);
    this.aproximada.set(false);
    this.origenCalculado = null;
  }

  /**
   * Solo pide ruta en la primera lectura y cuando el usuario se aleja del
   * punto desde el que se calculó: sin ese umbral, cada temblor del GPS
   * lanzaría una petición.
   */
  private async recalcular(
    origen: google.maps.LatLngLiteral,
    destino: Location,
    primera: boolean
  ): Promise<void> {
    const movido = this.origenCalculado
      ? NavegacionService.metrosEntre(this.origenCalculado, origen)
      : Infinity;

    if (!primera && movido < NavegacionService.UMBRAL_RECALCULO) {
      return;
    }

    this.origenCalculado = origen;
    const meta = { lat: destino.latitude, lng: destino.longitude };
    const ruta = await this.rutas.calcular(origen, meta);

    // El usuario pudo cerrar la ruta mientras se resolvía la petición.
    if (this.destino()?.id !== destino.id) {
      return;
    }

    if (ruta) {
      // El router engancha los extremos a la calzada más cercana: añadimos
      // los puntos reales para cerrar el último tramo, como hace Google.
      this.trazado.set([origen, ...ruta.puntos, meta]);
      this.metros.set(ruta.metros);
      this.minutos.set(ruta.minutos);
      this.aproximada.set(false);
      return;
    }

    this.trazado.set([origen, meta]);
    this.metros.set(Math.round(NavegacionService.metrosEntre(origen, meta)));
    this.minutos.set(null);
    this.aproximada.set(true);
  }
}
