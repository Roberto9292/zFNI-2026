import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
} from '@angular/core';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '../../core/models/location.interface';

@Component({
  selector: 'app-location-detail',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './location-detail.component.html',
  styleUrls: ['./location-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationDetailComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<LocationDetailComponent>);

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public location: Location) {}

  close(): void {
    this.bottomSheetRef.dismiss();
  }

  /**
   * Cierra devolviendo 'ruta': el mapa lo interpreta como la orden de trazar
   * el camino hasta esta ubicacion.
   */
  comoLlegar(): void {
    this.bottomSheetRef.dismiss('ruta');
  }

  /** Navegacion paso a paso real, delegada a Google Maps. */
  abrirEnGoogleMaps(): void {
    const destino = `${this.location.latitude},${this.location.longitude}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=walking`,
      '_blank',
      'noopener'
    );
  }
}
