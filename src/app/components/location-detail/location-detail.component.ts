import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Inject,
  signal,
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

  isDeleting = signal(false);
  deleteButtonIcon = computed(() =>
    this.isDeleting() ? 'hourglass_empty' : 'delete'
  );
  deleteButtonText = computed(() =>
    this.isDeleting() ? 'Eliminando...' : 'Eliminar'
  );
  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public location: Location) {}

  close(): void {
    this.bottomSheetRef.dismiss();
  }
}
