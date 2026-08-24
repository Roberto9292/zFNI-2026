import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MapViewComponent } from '../map-view/map-view.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MapViewComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardComponent {
  public authService = inject(AuthService);

  /** Se calcula al vuelo para que el aviso no envejezca solo. */
  readonly anio = new Date().getFullYear();

  /** Ancho de movil: el boton principal pasa a circular para no comer mapa. */
  readonly esMovil = signal(matchMedia('(max-width: 640px)').matches);

  /** Con una ruta en marcha el boton de registrar estorba: se aparta. */
  readonly rutaActiva = signal(false);
  private dialog = inject(MatDialog);

  constructor() {
    const consulta = matchMedia('(max-width: 640px)');
    const alCambiar = () => this.esMovil.set(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    inject(DestroyRef).onDestroy(() =>
      consulta.removeEventListener('change', alCambiar)
    );
  }

  /**
   * El formulario ya no ocupa media pantalla: buscar un aula es el uso
   * habitual y registrar es puntual, asi que vive en un dialogo. Se carga
   * bajo demanda para no pesar en el arranque.
   */
  async abrirRegistro(): Promise<void> {
    const { LocationFormComponent } = await import(
      '../location-form/location-form.component'
    );

    this.dialog.open(LocationFormComponent, {
      // 880 y no 760: los dos campos de hora comparten media columna, y
      // "Hora de finalización" necesita ~160px de etiqueta. Con 760 se
      // recortaba.
      width: 'min(880px, 100vw)',
      maxWidth: '100vw',
      maxHeight: '92dvh',
      panelClass: 'dialogo-registro',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ariaLabel: 'Registrar nueva ubicación',
    });
  }

  async onSignOut(): Promise<void> {
    await this.authService.signOut();
  }
}
