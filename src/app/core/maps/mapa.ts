/**
 * Configuración común de los mapas. Estaba repetida en los dos componentes
 * que muestran un mapa, con el riesgo de que se separaran al tocar solo uno.
 */

/** Identificador del estilo en Google Cloud (Maps Studio). */
export const MAP_ID = 'fb8757a3bfd70c7f9dcba22a';

const TIPOS_DE_MAPA = ['roadmap', 'satellite', 'hybrid', 'terrain'];

/** Pantalla táctil sin puntero fino: no basta con mirar el ancho. */
export function esPantallaTactil(): boolean {
  return matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export interface OpcionesMapa {
  /** Los marcadores avanzados y el estilo propio exigen un Map ID. */
  conEstiloPropio?: boolean;
  /** Street View solo aporta en el mapa de consulta. */
  streetView?: boolean;
}

export function crearOpcionesMapa(
  opciones: OpcionesMapa = {}
): google.maps.MapOptions {
  const tactil = esPantallaTactil();

  return {
    ...(opciones.conEstiloPropio ? { mapId: MAP_ID } : {}),
    mapTypeId: 'hybrid',
    mapTypeControl: true,
    mapTypeControlOptions: { mapTypeIds: TIPOS_DE_MAPA },
    streetViewControl: opciones.streetView ?? false,
    // En táctil el zoom se hace con pinza y esos botones solo ocupan la
    // esquina que necesitan las acciones de la app.
    zoomControl: !tactil,
    rotateControl: false,
    fullscreenControl: !matchMedia('(max-width: 640px)').matches,
    keyboardShortcuts: true,
    gestureHandling: 'greedy',
    clickableIcons: false,
    disableDefaultUI: false,
  };
}

/** Colores de los marcadores, en un solo sitio. */
export const COLOR_PIN = {
  normal: { fondo: '#d32f2f', borde: '#8e0000' },
  destacado: { fondo: '#12a150', borde: '#0a6b34' },
} as const;

/**
 * Cada marcador necesita su propio nodo: el contenido de un marcador avanzado
 * es un elemento del DOM y uno solo no puede estar en dos sitios a la vez.
 */
export function crearPin(destacado: boolean): HTMLElement {
  const color = destacado ? COLOR_PIN.destacado : COLOR_PIN.normal;

  return new google.maps.marker.PinElement({
    background: color.fondo,
    borderColor: color.borde,
    glyphColor: '#ffffff',
    scale: destacado ? 1.3 : 1,
  }).element;
}
