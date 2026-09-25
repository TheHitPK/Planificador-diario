const pad = (n: number) => String(n).padStart(2, '0');

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Fecha local en formato YYYY-MM-DD (sin desfase por zona horaria). */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** Índice del día con la semana empezando en lunes (0 = lunes, 6 = domingo). */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export const startOfWeek = (d: Date) => addDays(d, -weekdayIndex(d));

export const formatDM = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

export const range = (start: Date, count: number) => Array.from({ length: count }, (_, i) => addDays(start, i));

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Diferencia en días completos entre dos fechas (b - a). */
export const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);
