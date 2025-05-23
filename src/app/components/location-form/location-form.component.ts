import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.interface';

@Component({
  selector: 'app-location-form',
  imports: [
    ReactiveFormsModule,
    GoogleMapsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './location-form.component.html',
  styleUrls: ['./location-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LocationService],
})
export class LocationFormComponent {
  private fb = inject(FormBuilder);
  public locationService = inject(LocationService);
  private snackBar = inject(MatSnackBar);

  center = signal<google.maps.LatLngLiteral>({ lat: -17.783, lng: -67.107 });
  zoom = signal(13);
  markerPosition = signal<google.maps.LatLngLiteral | null>(null);

  locationForm: FormGroup;

  constructor() {
    this.locationForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(2)]],
      teacher: ['', [Validators.required, Validators.minLength(2)]],
      parallel: ['', [Validators.required]],
      schedule: ['', [Validators.required]],
      latitude: ['', [Validators.required]],
      longitude: ['', [Validators.required]],
    });
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

  async onSubmit(): Promise<void> {
    if (this.locationForm.valid) {
      try {
        const location: Location = {
          subject: this.locationForm.value.subject,
          teacher: this.locationForm.value.teacher,
          parallel: this.locationForm.value.parallel,
          schedule: this.locationForm.value.schedule,
          latitude: parseFloat(this.locationForm.value.latitude),
          longitude: parseFloat(this.locationForm.value.longitude),
        };

        await this.locationService.addLocation(location);

        this.snackBar.open('Ubicación guardada exitosamente', 'Cerrar', {
          duration: 3000,
        });

        this.resetForm();
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
