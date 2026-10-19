export type FoodUnit = 'g' | 'ml' | 'unidad';

/** Valores nutricionales por cada `per` unidades (ej. por 100 g o por 1 unidad). */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Food extends Macros {
  id: string;
  name: string;
  unit: FoodUnit;
  per: number;
  /** Del catálogo compartido: solo lectura. */
  global?: boolean;
}

export type Meal = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';

/** Un alimento consumido. Guarda sus macros calculados para que editar el alimento no cambie el historial. */
export interface LogEntry extends Macros {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  meal: Meal;
  name: string;
  amount: number;
  unit: FoodUnit;
  foodId?: string;
}

export interface BodyEntry {
  id: string;
  date: string;
  /** kg */
  weight: number;
  /** % de grasa corporal */
  bodyFat?: number;
  /** cm */
  waist?: number;
  note?: string;
}

export type Sex = 'hombre' | 'mujer';
export type Activity = 'sedentario' | 'ligero' | 'moderado' | 'alto' | 'muy_alto';
export type Goal = 'perder' | 'recomposicion' | 'mantener' | 'ganar';

export interface Profile {
  sex: Sex;
  age: number;
  /** cm */
  height: number;
  activity: Activity;
  goal: Goal;
}

export type Targets = Macros;

export interface NutritionData {
  foods: Food[];
  log: LogEntry[];
  body: BodyEntry[];
  profile: Profile | null;
  targets: Targets;
}
