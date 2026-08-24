import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FNI_CENTRO, FNI_ZOOM } from '../../core/constants/fni';
import { filtrarUbicaciones } from '../../core/busqueda/filtrar-ubicaciones';
import { crearOpcionesMapa, crearPin } from '../../core/maps/mapa';
import { Location } from '../../core/models/location.interface';
import { LocationService } from '../../core/services/location.service';
import { NavegacionService } from '../../core/services/navegacion.service';
import { MapaTecladoDirective } from '../../shared/directives/mapa-teclado.directive';
import { LocationDetailComponent } from '../location-detail/location-detail.component';
import { PanelRutaComponent } from '../panel-ruta/panel-ruta.component';

/**
 * Mapa del campus: busca aulas, las muestra y delega el seguimiento de ruta.
 *
 * Solo se ocupa de presentar. El filtrado vive en una función pura y el
 * seguimiento del GPS en NavegacionService, que tiene ciclo de vida propio.
 */
@Component({
  selector: 'app-map-view',
  imports: [
    GoogleMapsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MapaTecladoDirective,
    PanelRutaComponent,
  ],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent {
  private ubicaciones = inject(LocationService);
  private hojaInferior = inject(MatBottomSheet);
  private aviso = inject(MatSnackBar);

  /** Público: la plantilla lee su estado directamente. */
  readonly nav = inject(NavegacionService);

  readonly mapaRef = viewChild(GoogleMap);

  /** Avisa al contenedor para que aparte sus botones mientras hay ruta. */
  readonly rutaActiva = output<boolean>();

  // --- Búsqueda ------------------------------------------------------------

  /** Acepta texto o Location: el autocompletado emite el objeto al elegir. */
  readonly busqueda = new FormControl<string | Location>('', {
    nonNullable: true,
  });

  private valorBusqueda = toSignal(this.busqueda.valueChanges, {
    initialValue: '' as string | Location,
  });

  readonly termino = computed(() => {
    const valor = this.valorBusqueda();
    return typeof valor === 'string' ? valor : valor.subject;
  });

  readonly locations = computed(() => this.ubicaciones.locations());
  readonly locationCount = computed(() => this.locations().length);

  readonly resultados = computed(() =>
    filtrarUbicaciones(this.locations(), this.termino())
  );

  readonly hayBusqueda = computed(() => this.termino().trim().length > 0);

  // --- Paginación del panel de resultados ----------------------------------

  /** Se pinta por tramos: con cientos de coincidencias el panel se atasca. */
  private static readonly TRAMO = 5;

  readonly visibles = signal(MapViewComponent.TRAMO);

  readonly resultadosVisibles = computed(() =>
    this.resultados().slice(0, this.visibles())
  );

  readonly restantes = computed(() =>
    Math.max(0, this.resultados().length - this.visibles())
  );

  // --- Mapa ----------------------------------------------------------------

  readonly mapCenter = signal<google.maps.LatLngLiteral>(FNI_CENTRO);
  readonly mapZoom = signal(FNI_ZOOM);

  readonly mapOptions = crearOpcionesMapa({ conEstiloPropio: true });

  readonly opcionesTrazado: google.maps.PolylineOptions = {
    strokeColor: '#1a56ff',
    strokeOpacity: 0.9,
    strokeWeight: 5,
    geodesic: true,
  };

  /** Ancho de móvil: los botones pasan a circulares para no comer mapa. */
  readonly esMovil = signal(matchMedia('(max-width: 640px)').matches);

  /** Ubicación elegida en el buscador, para distinguirla en el mapa. */
  readonly seleccionada = signal<Location | null>(null);

  /**
   * La clave incluye si está destacado: MapAdvancedMarker guarda el contenido
   * pero no lo reaplica al marcador ya creado, así que cambiar de color exige
   * recrearlo y para eso la clave de @for tiene que cambiar.
   */
  readonly marcadores = computed(() => {
    const destacadaId = this.seleccionada()?.id;
    const destinoId = this.nav.destino()?.id;

    return this.resultados().map((location) => {
      const destacar = location.id === destacadaId || location.id === destinoId;
      return {
        clave: `${location.id}${destacar ? '|destacado' : ''}`,
        location,
        contenido: crearPin(destacar),
      };
    });
  });

  /** Destino cuya ruta ya se encuadró, para no repetirlo en cada recálculo. */
  private encuadrada: string | null = null;

  constructor() {
    const anchoMovil = matchMedia('(max-width: 640px)');
    const alCambiar = () => this.esMovil.set(anchoMovil.matches);
    anchoMovil.addEventListener('change', alCambiar);

    effect(() => this.rutaActiva.emit(this.nav.activa()));

    // Cada búsqueda nueva empieza por el primer tramo.
    effect(() => {
      this.termino();
      this.visibles.set(MapViewComponent.TRAMO);
    });

    // Encuadra la ruta la primera vez que hay trazado, y solo esa vez: si no,
    // cada recálculo al caminar devolvería la cámara y el usuario no podría
    // mirar otra parte del mapa.
    effect(() => {
      const destino = this.nav.destino();
      const puntos = this.nav.trazado();

      if (!destino || puntos.length < 2 || this.encuadrada === destino.id) {
        return;
      }

      this.encuadrada = destino.id ?? null;
      this.encuadrarRuta();
    });

    inject(DestroyRef).onDestroy(() => {
      anchoMovil.removeEventListener('change', alCambiar);
      this.nav.detener();
    });
  }

  // --- Acciones ------------------------------------------------------------

  cargarMas(): void {
    if (this.restantes() > 0) {
      this.visibles.update((n) => n + MapViewComponent.TRAMO);
    }
  }

  limpiarBusqueda(): void {
    this.busqueda.setValue('');
  }

  /** Texto que queda en el campo al elegir una opción del panel. */
  mostrarNombre(valor: string | Location | null): string {
    if (!valor) {
      return '';
    }
    return typeof valor === 'string' ? valor : valor.subject;
  }

  tituloMarcador(location: Location): string {
    return `${location.subject} - ${location.teacher} (${location.parallel})`;
  }

  irA(location: Location): void {
    this.seleccionada.set(location);
    this.mapCenter.set({ lat: location.latitude, lng: location.longitude });
    this.mapZoom.set(18);
    this.abrirDetalle(location);
  }

  abrirDetalle(location: Location): void {
    this.hojaInferior
      .open(LocationDetailComponent, {
        data: location,
        panelClass: 'location-detail-panel',
      })
      .afterDismissed()
      .subscribe((resultado) => {
        if (resultado === 'ruta') {
          this.iniciarRuta(location);
        }
      });
  }

  iniciarRuta(destino: Location): void {
    this.seleccionada.set(destino);

    const empezo = this.nav.iniciar(destino, () =>
      this.aviso.open('No se pudo obtener tu ubicación', 'Cerrar', {
        duration: 4000,
      })
    );

    if (!empezo) {
      this.aviso.open('Geolocalización no soportada', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  encuadrarRuta(): void {
    const mapa = this.mapaRef()?.googleMap;
    const puntos = this.nav.trazado();
    if (!mapa || puntos.length < 2) {
      return;
    }

    const limites = new google.maps.LatLngBounds();
    puntos.forEach((p) => limites.extend(p));
    mapa.fitBounds(limites, 80);
  }

  encuadrarTodas(): void {
    const mapa = this.mapaRef()?.googleMap;
    const encontradas = this.resultados();
    if (!mapa || encontradas.length === 0) {
      return;
    }

    if (encontradas.length === 1) {
      this.mapCenter.set({
        lat: encontradas[0].latitude,
        lng: encontradas[0].longitude,
      });
      this.mapZoom.set(18);
      return;
    }

    const limites = new google.maps.LatLngBounds();
    encontradas.forEach((l) =>
      limites.extend({ lat: l.latitude, lng: l.longitude })
    );
    mapa.fitBounds(limites, 64);
  }

}
