import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavegacionService } from '../../core/services/navegacion.service';

/**
 * Ficha de la ruta en marcha: destino, distancia, tiempo y acciones.
 *
 * Lee el estado del servicio de navegación en vez de recibirlo por entradas:
 * hay seis valores que cambian a la vez cada pocos segundos y pasarlos uno a
 * uno solo añadiría ruido.
 */
@Component({
  selector: 'app-panel-ruta',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './panel-ruta.component.html',
  styleUrls: ['./panel-ruta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRutaComponent {
  readonly nav = inject(NavegacionService);

  /** Encuadrar es cosa del mapa, no del panel: se delega hacia arriba. */
  readonly encuadrar = output<void>();

  /** Navegación paso a paso real, delegada en la app de Google Maps. */
  abrirNavegacion(): void {
    const destino = this.nav.destino();
    if (!destino) {
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destino.latitude},${destino.longitude}&travelmode=walking`,
      '_blank',
      'noopener'
    );
  }
}
