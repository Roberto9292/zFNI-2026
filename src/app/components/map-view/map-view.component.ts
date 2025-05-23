import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.interface';
import { LocationDetailComponent } from '../location-detail/location-detail.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-map-view',
  imports: [GoogleMapsModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LocationService],
})
export class MapViewComponent {
  private locationService = inject(LocationService);
  private bottomSheet = inject(MatBottomSheet);

  locations = computed(() => this.locationService.locations());
  locationCount = computed(() => this.locations().length);

  mapCenter = signal<google.maps.LatLngLiteral>({ lat: -17.783, lng: -67.107 }); // Oruro, Bolivia
  mapZoom = signal(12);

  mapOptions: google.maps.MapOptions = {
    mapId: 'MAP_ID',
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
    clickableIcons: false,
    disableDefaultUI: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  advancedMarkerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
  };

  constructor() {
    effect(() => {
      this.adjustMapToMarkers();
    });

    this.locationService.setupRealtimeListener();
  }

  onMarkerClick(location: Location): void {
    this.bottomSheet.open(LocationDetailComponent, {
      data: location,
      panelClass: 'location-detail-panel',
    });
  }

  private adjustMapToMarkers(): void {
    const locations = this.locations();

    if (locations.length > 0) {
      if (locations.length === 1) {
        this.mapCenter.set({
          lat: locations[0].latitude,
          lng: locations[0].longitude,
        });
        this.mapZoom.set(15);
      } else {
        const latSum = locations.reduce((sum, loc) => sum + loc.latitude, 0);
        const lngSum = locations.reduce((sum, loc) => sum + loc.longitude, 0);

        this.mapCenter.set({
          lat: latSum / locations.length,
          lng: lngSum / locations.length,
        });
        this.mapZoom.set(12);
      }
    }
  }

  getMarkerTitle(location: Location): string {
    return `${location.subject} - ${location.teacher} (${location.parallel})`;
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.mapCenter.set({ lat, lng });
          this.mapZoom.set(15);
        },
        (error) => {
          console.error('Error al obtener ubicación actual:', error);
        }
      );
    } else {
      console.error('Geolocalización no soportada');
    }
  }
}
