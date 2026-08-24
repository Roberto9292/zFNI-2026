export interface Location {
  id?: string;
  subject: string; // Materia
  teacher: string; // Docente
  /**
   * Opcionales porque los registros creados antes de añadir estos campos no
   * los tienen. El formulario sí los exige para los nuevos.
   */
  career?: string; // Carrera
  block?: string; // Bloque
  parallel: string; // Paralelo
  schedule: string; // Horario
  latitude: number; // Latitud
  longitude: number; // Longitud
}
