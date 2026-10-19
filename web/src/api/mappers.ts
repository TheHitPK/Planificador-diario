/**
 * Traducción entre el modelo del frontend (valores en español, minúsculas)
 * y el de la API (enums en inglés, mayúsculas).
 */
import type { Activity, Task, TaskPriority, TaskStatus } from '../types';
import type {
  Account, ExpenseClass, ExpenseReason, IncomeType, Movement, Rates,
} from '../finance/types';
import type {
  Activity as ActivityLevel, BodyEntry, Food, FoodUnit, Goal, LogEntry, Meal, Profile, Sex, Targets,
} from '../nutrition/types';
import { addDays, toISO, today } from '../lib/dates';

const invert = <K extends string, V extends string>(m: Record<K, V>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>;

// ---------------------------------------------------------------- disciplinas

export interface ApiDiscipline {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  position: number;
  archived: boolean;
}

export const toActivity = (d: ApiDiscipline): Activity => ({
  id: d.id,
  name: d.name,
  icon: d.icon,
  description: d.description ?? '',
});

export const fromActivity = (a: Omit<Activity, 'id'>) => ({
  name: a.name,
  icon: a.icon,
  description: a.description || null,
});

export interface ApiPlanningRange {
  days: { date: string; completed: string[] }[];
}

// ------------------------------------------------------------------ pendientes

const TASK_STATUS: Record<TaskStatus, string> = { pendiente: 'PENDING', en_progreso: 'IN_PROGRESS', completada: 'COMPLETED' };
const TASK_PRIORITY: Record<TaskPriority, string> = { alta: 'HIGH', media: 'MEDIUM', baja: 'LOW' };
const TASK_STATUS_BACK = invert(TASK_STATUS);
const TASK_PRIORITY_BACK = invert(TASK_PRIORITY);

export interface ApiTask {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string;
}

export const toTask = (t: ApiTask): Task => ({
  id: t.id,
  name: t.name,
  description: t.description ?? '',
  status: TASK_STATUS_BACK[t.status],
  priority: TASK_PRIORITY_BACK[t.priority],
  deadline: t.deadline,
});

export const fromTask = (t: Omit<Task, 'id'>) => ({
  name: t.name,
  description: t.description || null,
  status: TASK_STATUS[t.status],
  priority: TASK_PRIORITY[t.priority],
  deadline: t.deadline,
});

export const taskStatusToApi = (s: TaskStatus) => TASK_STATUS[s];

// -------------------------------------------------------------------- finanzas

const ACCOUNT: Record<Account, string> = {
  zelle: 'ZELLE', efectivo_usd: 'CASH_USD', usdt: 'USDT',
  efectivo_bs: 'CASH_VES', transferencia: 'BANK_TRANSFER', pagomovil: 'PAGO_MOVIL',
};
const INCOME: Record<IncomeType, string> = {
  sueldo: 'SALARY', venta: 'SALE', servicio: 'SERVICE', cambio: 'EXCHANGE',
  regalo: 'GIFT', prestamo: 'LOAN', reembolso: 'REFUND', otro: 'OTHER',
};
const REASON: Record<ExpenseReason, string> = {
  compra: 'PURCHASE', pago: 'PAYMENT', venta_divisas: 'CURRENCY_SALE', cambio: 'EXCHANGE', otro: 'OTHER',
};
const CLASS: Record<ExpenseClass, string> = { gasto: 'EXPENSE', costo: 'COST' };
const ACCOUNT_BACK = invert(ACCOUNT);
const INCOME_BACK = invert(INCOME);
const REASON_BACK = invert(REASON);
const CLASS_BACK = invert(CLASS);

export interface ApiMovement {
  id: string;
  kind: 'INCOME' | 'EXPENSE';
  date: string;
  account: string;
  amount: number;
  description: string | null;
  incomeType: string | null;
  expenseReason: string | null;
  expenseClass: string | null;
  category: string | null;
  rateUsd: number;
  rateEur: number;
  usdtRate: number | null;
  transferGroupId: string | null;
}

export const toMovement = (m: ApiMovement): Movement => ({
  id: m.id,
  kind: m.kind === 'INCOME' ? 'entrada' : 'salida',
  date: m.date,
  account: ACCOUNT_BACK[m.account],
  amount: Number(m.amount),
  description: m.description ?? '',
  incomeType: m.incomeType ? INCOME_BACK[m.incomeType] : undefined,
  reason: m.expenseReason ? REASON_BACK[m.expenseReason] : undefined,
  expenseClass: m.expenseClass ? CLASS_BACK[m.expenseClass] : undefined,
  category: m.category ?? undefined,
  rateUsd: Number(m.rateUsd),
  rateEur: Number(m.rateEur),
  usdtRate: m.usdtRate != null ? Number(m.usdtRate) : undefined,
  linkId: m.transferGroupId ?? undefined,
});

export const fromMovement = (m: Movement) => ({
  kind: m.kind === 'entrada' ? 'INCOME' : 'EXPENSE',
  date: m.date,
  account: ACCOUNT[m.account],
  amount: m.amount,
  description: m.description || null,
  incomeType: m.incomeType ? INCOME[m.incomeType] : null,
  expenseReason: m.reason ? REASON[m.reason] : null,
  expenseClass: m.expenseClass ? CLASS[m.expenseClass] : null,
  category: m.category ?? null,
  rateUsd: m.rateUsd,
  rateEur: m.rateEur,
  usdtRate: m.account === 'usdt' ? (m.usdtRate ?? null) : null,
});

/** Un cambio de divisas se crea con un solo request a partir de sus dos lados. */
export const fromExchange = (out: Movement, inn: Movement) => ({
  date: out.date,
  reason: REASON[out.reason ?? 'cambio'],
  fromAccount: ACCOUNT[out.account],
  fromAmount: out.amount,
  toAccount: ACCOUNT[inn.account],
  toAmount: inn.amount,
  description: out.description || null,
  rateUsd: out.rateUsd,
  rateEur: out.rateEur,
  usdtCostRate: out.account === 'usdt' ? (out.usdtRate ?? null) : null,
});

export interface ApiRates {
  date: string;
  usd: number;
  eur: number;
  source: 'BCV' | 'MANUAL';
}

export const toRates = (r: ApiRates): Rates => ({
  date: r.date,
  usd: Number(r.usd),
  eur: Number(r.eur),
  source: r.source === 'BCV' ? 'bcv' : 'manual',
});

// ------------------------------------------------------------------- nutrición

const UNIT: Record<FoodUnit, string> = { g: 'G', ml: 'ML', unidad: 'UNIT' };
const MEAL: Record<Meal, string> = { desayuno: 'BREAKFAST', almuerzo: 'LUNCH', cena: 'DINNER', merienda: 'SNACK' };
const SEX: Record<Sex, string> = { hombre: 'MALE', mujer: 'FEMALE' };
const ACTIVITY: Record<ActivityLevel, string> = {
  sedentario: 'SEDENTARY', ligero: 'LIGHT', moderado: 'MODERATE', alto: 'HIGH', muy_alto: 'VERY_HIGH',
};
const GOAL: Record<Goal, string> = {
  perder: 'LOSE_FAT', recomposicion: 'RECOMPOSITION', mantener: 'MAINTAIN', ganar: 'GAIN_MUSCLE',
};
const UNIT_BACK = invert(UNIT);
const MEAL_BACK = invert(MEAL);
const SEX_BACK = invert(SEX);
const ACTIVITY_BACK = invert(ACTIVITY);
const GOAL_BACK = invert(GOAL);

interface ApiMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ApiFood extends ApiMacros {
  id: string;
  name: string;
  unit: string;
  portion: number;
  global: boolean;
}

export const toFood = (f: ApiFood): Food => ({
  id: f.id,
  name: f.name,
  unit: UNIT_BACK[f.unit],
  per: Number(f.portion),
  kcal: Number(f.kcal),
  protein: Number(f.protein),
  carbs: Number(f.carbs),
  fat: Number(f.fat),
  fiber: Number(f.fiber),
  global: f.global,
});

export const fromFood = (f: Food) => ({
  name: f.name,
  unit: UNIT[f.unit],
  portion: f.per,
  kcal: f.kcal,
  protein: f.protein,
  carbs: f.carbs,
  fat: f.fat,
  fiber: f.fiber,
});

export interface ApiLogEntry {
  id: string;
  date: string;
  meal: string;
  foodId: string | null;
  name: string;
  amount: number;
  unit: string;
  macros: ApiMacros;
}

export const toLogEntry = (e: ApiLogEntry): LogEntry => ({
  id: e.id,
  date: e.date,
  meal: MEAL_BACK[e.meal],
  name: e.name,
  amount: Number(e.amount),
  unit: UNIT_BACK[e.unit],
  foodId: e.foodId ?? undefined,
  kcal: Number(e.macros.kcal),
  protein: Number(e.macros.protein),
  carbs: Number(e.macros.carbs),
  fat: Number(e.macros.fat),
  fiber: Number(e.macros.fiber),
});

/** Con alimento: el servidor calcula los macros. Sin alimento: registro rápido. */
export const fromLogEntry = (e: LogEntry) =>
  e.foodId
    ? { date: e.date, meal: MEAL[e.meal], foodId: e.foodId, amount: e.amount }
    : {
        date: e.date, meal: MEAL[e.meal], name: e.name,
        kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber,
      };

export interface ApiBody {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  note: string | null;
}

export const toBody = (b: ApiBody): BodyEntry => ({
  id: b.id,
  date: b.date,
  weight: Number(b.weightKg),
  bodyFat: b.bodyFatPct != null ? Number(b.bodyFatPct) : undefined,
  waist: b.waistCm != null ? Number(b.waistCm) : undefined,
  note: b.note ?? undefined,
});

export const fromBody = (b: BodyEntry) => ({
  date: b.date,
  weightKg: b.weight,
  bodyFatPct: b.bodyFat ?? null,
  waistCm: b.waist ?? null,
  note: b.note ?? null,
});

export interface ApiProfile {
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  goal: string | null;
  targets: ApiMacros;
  complete: boolean;
}

export const toProfile = (p: ApiProfile): Profile | null =>
  p.complete && p.sex && p.age != null && p.heightCm != null && p.activityLevel && p.goal
    ? {
        sex: SEX_BACK[p.sex],
        age: p.age,
        height: Number(p.heightCm),
        activity: ACTIVITY_BACK[p.activityLevel],
        goal: GOAL_BACK[p.goal],
      }
    : null;

export const toTargets = (t: ApiMacros): Targets => ({
  kcal: Number(t.kcal),
  protein: Number(t.protein),
  carbs: Number(t.carbs),
  fat: Number(t.fat),
  fiber: Number(t.fiber),
});

/** El frontend maneja edad; la API guarda fecha de nacimiento (se aproxima a hoy − edad). */
export const fromProfile = (p: Profile) => {
  const birth = today();
  birth.setFullYear(birth.getFullYear() - p.age);
  return {
    sex: SEX[p.sex],
    birthDate: toISO(addDays(birth, -1)),
    heightCm: p.height,
    activityLevel: ACTIVITY[p.activity],
    goal: GOAL[p.goal],
  };
};

export const fromTargets = (t: Targets) => ({
  kcal: Math.round(t.kcal),
  protein: Math.round(t.protein),
  carbs: Math.round(t.carbs),
  fat: Math.round(t.fat),
  fiber: Math.round(t.fiber),
});
