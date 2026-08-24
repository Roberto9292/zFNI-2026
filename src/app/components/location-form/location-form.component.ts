import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.interface';
import { crearOpcionesMapa, crearPin } from '../../core/maps/mapa';
import { MapaTecladoDirective } from '../../shared/directives/mapa-teclado.directive';
import { FNI_CENTRO, FNI_ZOOM } from '../../core/constants/fni';

@Component({
  selector: 'app-location-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    GoogleMapsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTimepickerModule,
    MapaTecladoDirective,
  ],
  templateUrl: './location-form.component.html',
  styleUrls: ['./location-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideNativeDateAdapter(),
    // Localizacion boliviana pero forzando el ciclo de 24 h (extension
    // Unicode -u-hc-h23): es-BO por defecto muestra "08:00 a. m.", y los
    // horarios se guardan en 24 h, asi que lo elegido debe coincidir con lo
    // que se almacena.
    { provide: MAT_DATE_LOCALE, useValue: 'es-BO-u-hc-h23' },
  ],
})
export class LocationFormComponent {
  private fb = inject(FormBuilder);
  public locationService = inject(LocationService);
  private snackBar = inject(MatSnackBar);

  /** Presente solo si el formulario se abrio dentro de un dialogo. */
  private dialogRef = inject<MatDialogRef<unknown> | null>(MatDialogRef, {
    optional: true,
  });

  center = signal<google.maps.LatLngLiteral>(FNI_CENTRO);
  zoom = signal(FNI_ZOOM);
  markerPosition = signal<google.maps.LatLngLiteral | null>(null);

  readonly mapOptions = crearOpcionesMapa();

  locationForm: FormGroup;

  constructor() {
    this.locationForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(2)]],
      teacher: ['', [Validators.required, Validators.minLength(2)]],
      career: ['', [Validators.required, Validators.minLength(2)]],
      block: ['', [Validators.required]],
      parallel: ['', [Validators.required]],
      horaInicio: [null as Date | null, [Validators.required]],
      horaFin: [null as Date | null, [Validators.required]],
      latitude: ['', [Validators.required]],
      longitude: ['', [Validators.required]],
    });

    this.locationForm.addValidators(LocationFormComponent.rangoHorario);
  }

  onMapClick(event: google.maps.MapMouseEvent): void {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      this.markerPosition.set({ lat, lng });

      this.locationForm.patchValue({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      });
    }
  }

  readonly mapaRef = viewChild(GoogleMap);

  onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    this.onMapClick(event);
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.center.set({ lat, lng });
          this.markerPosition.set({ lat, lng });

          this.locationForm.patchValue({
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
          });
        },
        (error) => {
          this.snackBar.open('Error al obtener ubicación actual', 'Cerrar', {
            duration: 3000,
          });
        }
      );
    } else {
      this.snackBar.open('Geolocalización no soportada', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  /** true cuando el formulario se abrio en un dialogo y necesita su marco. */
  get enDialogo(): boolean {
    return this.dialogRef !== null;
  }

  /** La hora de fin debe ser posterior a la de inicio. */
  private static rangoHorario(grupo: AbstractControl): ValidationErrors | null {
    const inicio = grupo.get('horaInicio')?.value as Date | null;
    const fin = grupo.get('horaFin')?.value as Date | null;
    if (inicio && fin && fin.getTime() <= inicio.getTime()) {
      return { rangoHorario: true };
    }
    return null;
  }

  /**
   * Firestore guarda el horario como texto ("08:00 - 10:00"): componemos aqui
   * para no cambiar el formato de los datos que ya existen.
   */
  private componerHorario(): string {
    const hhmm = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}`;

    const inicio = this.locationForm.value.horaInicio as Date;
    const fin = this.locationForm.value.horaFin as Date;
    return `${hhmm(inicio)} - ${hhmm(fin)}`;
  }

  cerrar(): void {
    this.dialogRef?.close(false);
  }

  async onSubmit(): Promise<void> {
    if (this.locationForm.valid) {
      try {
        const location: Location = {
          subject: this.locationForm.value.subject,
          teacher: this.locationForm.value.teacher,
          career: this.locationForm.value.career,
          block: this.locationForm.value.block,
          parallel: this.locationForm.value.parallel,
          schedule: this.componerHorario(),
          latitude: parseFloat(this.locationForm.value.latitude),
          longitude: parseFloat(this.locationForm.value.longitude),
        };

        await this.locationService.addLocation(location);

        this.snackBar.open('Ubicación guardada exitosamente', 'Cerrar', {
          duration: 3000,
        });

        this.resetForm();
        this.dialogRef?.close(true);
      } catch (error: any) {
        this.snackBar.open(
          error.message || 'Error al guardar ubicación',
          'Cerrar',
          {
            duration: 3000,
          }
        );
      }
    }
  }

  resetForm(): void {
    this.locationForm.reset();
    this.markerPosition.set(null);
  }
}
