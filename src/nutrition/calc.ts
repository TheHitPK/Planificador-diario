import type { BodyEntry, Food, LogEntry, Macros, Profile, Targets } from './types';
import { ACTIVITY_FACTOR, GOAL_ADJUST, GOAL_PROTEIN_PER_KG } from './defaults';

export const MACRO_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export const MACRO_LABEL: Record<MacroKey, string> = {
  kcal: 'Calorías',
  protein: 'Proteínas',
  carbs: 'Carbohidratos',
  fat: 'Grasas',
  fiber: 'Fibra',
};

export const MACRO_UNIT: Record<MacroKey, string> = {
  kcal: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
};

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros de una cantidad de un alimento. */
export function macrosFor(food: Food, amount: number): Macros {
  const k = food.per > 0 ? amount / food.per : 0;
  return {
    kcal: round1(food.kcal * k),
    protein: round1(food.protein * k),
    carbs: round1(food.carbs * k),
    fat: round1(food.fat * k),
    fiber: round1(food.fiber * k),
  };
}

export function sumMacros(items: Macros[]): Macros {
  const out = { ...ZERO };
  for (const m of items) for (const key of MACRO_KEYS) out[key] += m[key];
  for (const key of MACRO_KEYS) out[key] = round1(out[key]);
  return out;
}

export const dayEntries = (log: LogEntry[], iso: string) => log.filter((e) => e.date === iso);

/** Calorías que salen de los macros (4/4/9). Útil para revisar etiquetas. */
export const kcalFromMacros = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);

export const fmt1 = (n: number) => n.toLocaleString('es-VE', { maximumFractionDigits: 1 });

/** Último registro de peso (más reciente por fecha). */
export const latestBody = (body: BodyEntry[]) =>
  [...body].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

/** Último % de grasa registrado (puede ser de un día distinto al último peso). */
export const latestBodyFat = (body: BodyEntry[]) =>
  [...body].filter((b) => b.bodyFat !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0]?.bodyFat;

export interface Plan {
  bmr: number;
  tdee: number;
  targets: Targets;
  method: 'Katch-McArdle' | 'Mifflin-St Jeor';
  leanMass: number | null;
}

/**
 * Calcula objetivos:
 * - Metabolismo basal: Katch-McArdle si conoces tu % de grasa (más preciso), si no Mifflin-St Jeor.
 * - Gasto diario = basal × factor de actividad; se ajusta según el objetivo.
 * - Proteína por kg de peso; grasa 25 % de las calorías; carbohidratos el resto; fibra 14 g por cada 1000 kcal.
 */
export function computePlan(profile: Profile, weight: number, bodyFat?: number): Plan {
  const leanMass = bodyFat !== undefined && bodyFat > 0 && bodyFat < 70 ? weight * (1 - bodyFat / 100) : null;
  const bmr =
    leanMass !== null
      ? 370 + 21.6 * leanMass
      : 10 * weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === 'hombre' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[profile.activity];
  const kcal = Math.round((tdee * (1 + GOAL_ADJUST[profile.goal])) / 10) * 10;
  const protein = Math.round(weight * GOAL_PROTEIN_PER_KG[profile.goal]);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targets: { kcal, protein, carbs, fat, fiber },
    method: leanMass !== null ? 'Katch-McArdle' : 'Mifflin-St Jeor',
    leanMass: leanMass !== null ? round1(leanMass) : null,
  };
}

export const bmi = (weight: number, heightCm: number) => (heightCm > 0 ? weight / (heightCm / 100) ** 2 : null);

export function bmiLabel(v: number) {
  if (v < 18.5) return 'Bajo peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  return 'Obesidad';
}
