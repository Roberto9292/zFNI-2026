import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '../models/location.interface';
import { ModoViaje, RutaService } from './ruta.service';

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

  /**
   * Metros que hay que moverse para pedir una ruta nueva. En vehiculo se
   * avanza mucho mas rapido, asi que con el umbral de a pie se pediria una
   * ruta cada pocos segundos sin que la anterior haya envejecido.
   */
  private static readonly UMBRAL_RECALCULO: Record<ModoViaje, number> = {
    pie: 25,
    vehiculo: 80,
  };

  readonly destino = signal<Location | null>(null);

  /** Como se desplaza el usuario: dentro del campus tambien se circula. */
  readonly modo = signal<ModoViaje>('pie');
  readonly miPosicion = signal<google.maps.LatLngLiteral | null>(null);
  readonly precision = signal<number | null>(null);

  readonly trazado = signal<google.maps.LatLngLiteral[]>([]);
  readonly metros = signal<number | null>(null);
  readonly minutos = signal<number | null>(null);

  /** true si el router falló y se muestra la línea recta de reserva. */
  readonly aproximada = signal(false);

  readonly activa = computed(() => this.destino() !== null);

  /** Etiqueta del tiempo estimado, que depende del modo. */
  readonly modoTexto = computed(() =>
    this.modo() === 'pie' ? 'a pie' : 'en vehículo'
  );

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
  iniciar(
    destino: Location,
    alFallar: () => void,
    modo: ModoViaje = 'pie'
  ): boolean {
    if (!navigator.geolocation) {
      return false;
    }

    this.detener();
    this.destino.set(destino);
    this.modo.set(modo);

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
    this.modo.set('pie');
    this.miPosicion.set(null);
    this.precision.set(null);
    this.trazado.set([]);
    this.metros.set(null);
    this.minutos.set(null);
    this.aproximada.set(false);
    this.origenCalculado = null;
  }

  /**
   * Cambia entre ir a pie y en vehículo sobre la ruta en marcha, sin volver a
   * pedir la posición: ya la tenemos, solo hay que trazar el camino otra vez.
   */
  cambiarModo(modo: ModoViaje): void {
    if (this.modo() === modo) {
      return;
    }

    this.modo.set(modo);

    const destino = this.destino();
    const aqui = this.miPosicion();
    if (destino && aqui) {
      void this.recalcular(aqui, destino, true);
    }
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

    const modo = this.modo();

    if (!primera && movido < NavegacionService.UMBRAL_RECALCULO[modo]) {
      return;
    }

    this.origenCalculado = origen;
    const meta = { lat: destino.latitude, lng: destino.longitude };
    const ruta = await this.rutas.calcular(origen, meta, modo);

    // El usuario pudo cerrar la ruta o cambiar de modo mientras se resolvía
    // la petición: lo que llegue ya no corresponde a lo que se ve.
    if (this.destino()?.id !== destino.id || this.modo() !== modo) {
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
