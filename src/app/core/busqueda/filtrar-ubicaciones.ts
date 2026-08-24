import { Location } from '../models/location.interface';

/**
 * Normaliza para comparar: sin acentos, sin mayúsculas y sin espacios
 * sobrantes. Así "calculo" encuentra "Cálculo".
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Campos por los que se busca una clase. Se filtran los vacíos: carrera y
 * bloque no existen en los registros antiguos y sin esto se colaría el texto
 * "undefined" en la comparación.
 */
function textoBuscable(ubicacion: Location): string {
  return [
    ubicacion.subject,
    ubicacion.teacher,
    ubicacion.career,
    ubicacion.block,
    ubicacion.parallel,
    ubicacion.schedule,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Coincidencias por materia, docente, paralelo u horario. Sin término
 * devuelve la lista entera.
 *
 * Es una función pura y no un método del componente: así se puede probar
 * sin montar un mapa ni Angular.
 */
export function filtrarUbicaciones(
  ubicaciones: readonly Location[],
  termino: string
): Location[] {
  const buscado = normalizar(termino);
  if (!buscado) {
    return [...ubicaciones];
  }

  // Separamos la búsqueda en palabras individuales
  const palabras = buscado.split(/\s+/);

  // Un aula coincide si TODAS las palabras de búsqueda existen en sus datos, sin importar el orden
  return ubicaciones.filter((u) => {
    const textoAula = normalizar(textoBuscable(u));
    return palabras.every((palabra) => textoAula.includes(palabra));
  });
}
