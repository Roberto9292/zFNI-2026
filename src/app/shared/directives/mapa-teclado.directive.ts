import { Directive, HostListener, input } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';

/**
 * Desplaza y acerca el mapa con el teclado cuando el contenedor tiene el foco.
 *
 * Google trae atajos propios, pero solo actúan si el foco cae en un div
 * interno suyo al que no se llega navegando con el tabulador. Esta directiva
 * los replica sobre un contenedor enfocable, y evita repetir el mismo bloque
 * en cada componente que muestra un mapa.
 */
@Directive({
  selector: '[appMapaTeclado]',
})
export class MapaTecladoDirective {
  /** Mapa al que se aplican las teclas. */
  readonly mapa = input.required<GoogleMap | undefined>({
    alias: 'appMapaTeclado',
  });

  /** Píxeles por pulsación. Con Shift el paso se triplica. */
  private static readonly PASO = 120;

  private static readonly DESPLAZAMIENTOS: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };

  @HostListener('keydown', ['$event'])
  alPulsar(evento: KeyboardEvent): void {
    const mapa = this.mapa()?.googleMap;
    if (!mapa) {
      return;
    }

    const direccion = MapaTecladoDirective.DESPLAZAMIENTOS[evento.key];
    if (direccion) {
      const paso = MapaTecladoDirective.PASO * (evento.shiftKey ? 3 : 1);
      mapa.panBy(direccion[0] * paso, direccion[1] * paso);
      evento.preventDefault();
      return;
    }

    const zoom = mapa.getZoom();
    if (zoom === undefined) {
      return;
    }

    if (evento.key === '+' || evento.key === '=') {
      mapa.setZoom(zoom + 1);
      evento.preventDefault();
    } else if (evento.key === '-' || evento.key === '_') {
      mapa.setZoom(zoom - 1);
      evento.preventDefault();
    }
  }
}
