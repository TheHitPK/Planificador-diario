import type { Activity, Checks } from '../types';
import { toISO } from './dates';

export type Level = 'red' | 'yellow' | 'green' | 'none';

/** Umbrales del semáforo: verde = todo, amarillo = 40 % o más, rojo = menos del 40 %. */
export const YELLOW_FROM = 0.4;

export function levelFor(ratio: number | null): Level {
  if (ratio === null) return 'none';
  if (ratio >= 1) return 'green';
  if (ratio >= YELLOW_FROM) return 'yellow';
  return 'red';
}

export const LEVEL_LABEL: Record<Level, string> = {
  green: 'Completo',
  yellow: 'A medias',
  red: 'Bajo',
  none: 'Sin datos',
};

export const LEVEL_ICON: Record<Level, string> = {
  green: '✓',
  yellow: '◐',
  red: '✕',
  none: '·',
};

/** Número de actividades (existentes) marcadas en un día. */
export function doneOn(checks: Checks, date: Date, activities: Activity[]) {
  const done = checks[toISO(date)] ?? [];
  return activities.filter((a) => done.includes(a.id)).length;
}

/**
 * Un día cuenta para las estadísticas si ya pasó (o es hoy) y no es anterior
 * al primer día en que empezaste a usar la app.
 */
export const isCountable = (date: Date, todayDate: Date, startISO: string) =>
  date <= todayDate && toISO(date) >= startISO;

export interface PeriodStats {
  done: number;
  total: number;
  ratio: number | null;
}

export function periodStats(
  days: Date[],
  checks: Checks,
  activities: Activity[],
  todayDate: Date,
  startISO: string,
): PeriodStats {
  const counted = days.filter((d) => isCountable(d, todayDate, startISO));
  const total = counted.length * activities.length;
  const done = counted.reduce((sum, d) => sum + doneOn(checks, d, activities), 0);
  return { done, total, ratio: total > 0 ? done / total : null };
}

export const pct = (ratio: number | null) => (ratio === null ? '—' : `${Math.round(ratio * 100)}%`);
