import type { Activity, Food, Goal, Meal, Targets } from './types';

export const MEALS: Meal[] = ['desayuno', 'almuerzo', 'cena', 'merienda'];

export const MEAL_LABEL: Record<Meal, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  merienda: 'Meriendas',
};

export const MEAL_ICON: Record<Meal, string> = {
  desayuno: '🌅',
  almuerzo: '🍽️',
  cena: '🌙',
  merienda: '🍎',
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentario: 'Sedentario (poco o nada de ejercicio)',
  ligero: 'Ligero (1–3 días de ejercicio)',
  moderado: 'Moderado (3–5 días)',
  alto: 'Alto (6–7 días)',
  muy_alto: 'Muy alto (2 veces al día / trabajo físico)',
};

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
  muy_alto: 1.9,
};

export const GOAL_LABEL: Record<Goal, string> = {
  perder: 'Perder grasa',
  recomposicion: 'Recomposición (menos grasa, más músculo)',
  mantener: 'Mantener',
  ganar: 'Ganar músculo',
};

/** Ajuste de calorías sobre el gasto diario. */
export const GOAL_ADJUST: Record<Goal, number> = {
  perder: -0.2,
  recomposicion: -0.1,
  mantener: 0,
  ganar: 0.1,
};

/** Gramos de proteína por kg de peso corporal. */
export const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  perder: 2.2,
  recomposicion: 2.2,
  mantener: 1.8,
  ganar: 2.0,
};

export const DEFAULT_TARGETS: Targets = { kcal: 2000, protein: 140, carbs: 200, fat: 60, fiber: 28 };

const f = (
  id: string, name: string, per: number, unit: Food['unit'],
  kcal: number, protein: number, carbs: number, fat: number, fiber = 0,
): Food => ({ id, name, per, unit, kcal, protein, carbs, fat, fiber });

/** Valores aproximados (tablas USDA y etiquetas comunes). Edítalos según tus productos. */
export const DEFAULT_FOODS: Food[] = [
  f('f-arepa', 'Arepa mediana (sin relleno)', 1, 'unidad', 160, 3.5, 34, 1, 2),
  f('f-harina', 'Harina de maíz precocida', 100, 'g', 357, 7.1, 77, 1.7, 4),
  f('f-huevo', 'Huevo entero', 1, 'unidad', 72, 6.3, 0.4, 4.8),
  f('f-clara', 'Clara de huevo', 1, 'unidad', 17, 3.6, 0.2, 0.1),
  f('f-pollo', 'Pechuga de pollo cocida', 100, 'g', 165, 31, 0, 3.6),
  f('f-carne', 'Carne molida magra cocida', 100, 'g', 217, 26, 0, 12),
  f('f-atun', 'Atún en agua', 100, 'g', 116, 25.5, 0, 0.8),
  f('f-salmon', 'Salmón cocido', 100, 'g', 206, 22, 0, 12),
  f('f-arroz', 'Arroz blanco cocido', 100, 'g', 130, 2.7, 28.2, 0.3, 0.4),
  f('f-pasta', 'Pasta cocida', 100, 'g', 158, 5.8, 31, 0.9, 1.8),
  f('f-avena', 'Avena en hojuelas', 100, 'g', 389, 16.9, 66, 6.9, 10.6),
  f('f-pan', 'Pan blanco (rebanada)', 1, 'unidad', 66, 2.3, 12.3, 0.8, 0.6),
  f('f-caraotas', 'Caraotas negras cocidas', 100, 'g', 132, 8.9, 23.7, 0.5, 8.7),
  f('f-platano', 'Plátano cocido', 100, 'g', 122, 1.3, 32, 0.4, 2.3),
  f('f-papa', 'Papa cocida', 100, 'g', 87, 1.9, 20, 0.1, 1.8),
  f('f-batata', 'Batata cocida', 100, 'g', 90, 2, 20.7, 0.2, 3.3),
  f('f-cambur', 'Cambur (banana)', 1, 'unidad', 105, 1.3, 27, 0.4, 3.1),
  f('f-manzana', 'Manzana', 1, 'unidad', 95, 0.5, 25, 0.3, 4.4),
  f('f-aguacate', 'Aguacate', 100, 'g', 160, 2, 8.5, 14.7, 6.7),
  f('f-queso', 'Queso blanco duro', 100, 'g', 290, 20, 2, 22),
  f('f-leche', 'Leche entera', 100, 'ml', 61, 3.2, 4.8, 3.3),
  f('f-yogur', 'Yogur griego natural 0%', 100, 'g', 59, 10, 3.6, 0.4),
  f('f-whey', 'Proteína whey (1 scoop)', 1, 'unidad', 120, 24, 3, 1.5),
  f('f-mani', 'Mantequilla de maní (cucharada)', 1, 'unidad', 94, 4, 3.2, 8, 1),
  f('f-aceite', 'Aceite de oliva (cucharada)', 1, 'unidad', 119, 0, 0, 13.5),
];
