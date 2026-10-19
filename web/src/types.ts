export interface Activity {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/** Actividades cumplidas por día: { "2026-09-25": ["id1", "id2"] } */
export type Checks = Record<string, string[]>;

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';
export type TaskPriority = 'alta' | 'media' | 'baja';

export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Fecha límite en formato YYYY-MM-DD */
  deadline: string;
}
