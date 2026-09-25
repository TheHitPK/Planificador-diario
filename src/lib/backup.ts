import type { Activity, Checks, Task } from '../types';
import type { FinanceData } from '../finance/types';
import { toISO, today } from './dates';

export interface BackupData {
  activities: Activity[];
  checks: Checks;
  tasks: Task[];
  startISO: string;
  /** Opcional: los respaldos hechos antes del módulo de Finanzas no lo traen */
  finance?: FinanceData;
}

interface BackupFile extends BackupData {
  app: 'planificacion-diaria';
  version: 1 | 2;
  exportedAt: string;
}

/** Descarga todos los datos como un archivo .json. */
export function exportBackup(data: BackupData) {
  const file: BackupFile = { app: 'planificacion-diaria', version: 2, exportedAt: new Date().toISOString(), ...data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planificacion-respaldo-${toISO(today())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidFinance(f: unknown): f is FinanceData {
  if (!isObj(f) || !Array.isArray(f.movements) || !isObj(f.rateHistory)) return false;
  const movementsOk = f.movements.every(
    (m) =>
      isObj(m) &&
      isStr(m.id) &&
      (m.kind === 'entrada' || m.kind === 'salida') &&
      isStr(m.date) &&
      ISO_DATE.test(m.date) &&
      isStr(m.account) &&
      isNum(m.amount) &&
      isNum(m.rateUsd) &&
      isNum(m.rateEur),
  );
  const ratesOk =
    f.rates === null || (isObj(f.rates) && isNum(f.rates.usd) && isNum(f.rates.eur) && isStr(f.rates.date));
  return movementsOk && ratesOk;
}

/** Lee y valida un archivo de respaldo. Lanza un Error con un mensaje legible si no es válido. */
export async function parseBackup(file: File): Promise<BackupData> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!isObj(raw) || raw.app !== 'planificacion-diaria') {
    throw new Error('Este archivo no es un respaldo de Planificación diaria.');
  }

  const { activities, checks, tasks, startISO, finance } = raw;

  const activitiesOk =
    Array.isArray(activities) &&
    activities.every((a) => isObj(a) && isStr(a.id) && isStr(a.name) && isStr(a.icon) && isStr(a.description));
  const checksOk =
    isObj(checks) &&
    Object.entries(checks).every(([k, v]) => ISO_DATE.test(k) && Array.isArray(v) && v.every(isStr));
  const tasksOk =
    Array.isArray(tasks) &&
    tasks.every(
      (t) =>
        isObj(t) &&
        isStr(t.id) &&
        isStr(t.name) &&
        isStr(t.description) &&
        ['pendiente', 'en_progreso', 'completada'].includes(t.status as string) &&
        ['alta', 'media', 'baja'].includes(t.priority as string) &&
        isStr(t.deadline) &&
        ISO_DATE.test(t.deadline),
    );
  const startOk = isStr(startISO) && ISO_DATE.test(startISO);
  const financeOk = finance === undefined || isValidFinance(finance);

  if (!activitiesOk || !checksOk || !tasksOk || !startOk || !financeOk) {
    throw new Error('El respaldo está incompleto o dañado.');
  }

  return {
    activities: activities as Activity[],
    checks: checks as Checks,
    tasks: tasks as Task[],
    startISO: startISO as string,
    finance: finance as FinanceData | undefined,
  };
}
