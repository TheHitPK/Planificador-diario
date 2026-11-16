import type { BackupData } from '../lib/backup';
import { api } from './client';

export interface ImportResult {
  disciplines: number;
  checks: number;
  tasks: number;
  movements: number;
  foods: number;
  foodLogEntries: number;
  bodyMeasurements: number;
  profile: boolean;
}

/** Sube un respaldo (formato del frontend) a la cuenta. El servidor lo rechaza si la cuenta ya tiene datos. */
export async function importToServer(data: BackupData): Promise<ImportResult> {
  return api.post<ImportResult>('/import/legacy', { app: 'planificacion-diaria', version: 3, ...data });
}

export const describeImport = (r: ImportResult) =>
  `Importado: ${r.disciplines} disciplinas, ${r.checks} días marcados, ${r.tasks} pendientes, ` +
  `${r.movements} movimientos, ${r.foodLogEntries} comidas y ${r.bodyMeasurements} registros corporales.`;

// ---------------------------------------------------------------------------
// Datos que la versión anterior guardaba en este navegador (localStorage).

const LEGACY_KEYS = [
  'pd.activities', 'pd.checks', 'pd.tasks', 'pd.start',
  'pd.fin.movements', 'pd.fin.rates', 'pd.fin.rateHistory',
  'pd.nut.foods', 'pd.nut.log', 'pd.nut.body', 'pd.nut.profile', 'pd.nut.targets',
];
const MIGRATED_KEY = 'pd.migrated';

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

/** ¿Hay datos de la versión sin servidor que aún no se han subido? */
export function hasLegacyData(): boolean {
  if (read(MIGRATED_KEY)) return false;
  return LEGACY_KEYS.some((k) => read(k) !== undefined);
}

export function markLegacyMigrated() {
  try {
    localStorage.setItem(MIGRATED_KEY, JSON.stringify(new Date().toISOString()));
  } catch {
    /* sin storage no hay aviso que ocultar */
  }
}

/** Arma un respaldo con lo guardado en el navegador (mismo formato que "Exportar" de la versión anterior). */
export function readLegacyData(): BackupData {
  return {
    activities: read('pd.activities') ?? [],
    checks: read('pd.checks') ?? {},
    tasks: read('pd.tasks') ?? [],
    startISO: read('pd.start') ?? new Date().toISOString().slice(0, 10),
    finance: {
      movements: read('pd.fin.movements') ?? [],
      rates: read('pd.fin.rates') ?? null,
      rateHistory: read('pd.fin.rateHistory') ?? {},
    },
    nutrition: {
      foods: read('pd.nut.foods') ?? [],
      log: read('pd.nut.log') ?? [],
      body: read('pd.nut.body') ?? [],
      profile: read('pd.nut.profile') ?? null,
      targets: read('pd.nut.targets') ?? { kcal: 2000, protein: 140, carbs: 200, fat: 60, fiber: 28 },
    },
  };
}
