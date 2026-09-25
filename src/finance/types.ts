/** Dónde está el dinero. Las tres primeras son en dólares, las otras en bolívares. */
export type Account = 'zelle' | 'efectivo_usd' | 'usdt' | 'efectivo_bs' | 'transferencia' | 'pagomovil';

export type Currency = 'USD' | 'VES';

export type MovementKind = 'entrada' | 'salida';

export type IncomeType =
  | 'sueldo'
  | 'venta'
  | 'servicio'
  | 'cambio'
  | 'regalo'
  | 'prestamo'
  | 'reembolso'
  | 'otro';

export type ExpenseReason = 'compra' | 'pago' | 'venta_divisas' | 'cambio' | 'otro';

/** Gasto = consumo del día a día. Costo = dinero invertido para producir o vender algo. */
export type ExpenseClass = 'gasto' | 'costo';

export interface Movement {
  id: string;
  kind: MovementKind;
  /** YYYY-MM-DD */
  date: string;
  account: Account;
  amount: number;
  description: string;

  /** Solo entradas */
  incomeType?: IncomeType;

  /** Solo salidas */
  reason?: ExpenseReason;
  expenseClass?: ExpenseClass;
  category?: string;

  /** Tasa BCV del dólar (Bs por $) usada en este movimiento */
  rateUsd: number;
  /** Tasa BCV del euro (Bs por €) usada en este movimiento */
  rateEur: number;
  /** Solo cuenta USDT: Bs por USDT a la que se compró (entrada) o tasa de costo al gastarlo (salida) */
  usdtRate?: number;

  /** Une la salida y la entrada de un cambio / venta de divisas */
  linkId?: string;
}

export interface Rates {
  usd: number;
  eur: number;
  /** Fecha de la tasa (YYYY-MM-DD) */
  date: string;
  source: 'bcv' | 'manual';
}

export interface FinanceData {
  movements: Movement[];
  rates: Rates | null;
  /** Tasas guardadas por día, para prellenar movimientos de fechas pasadas */
  rateHistory: Record<string, { usd: number; eur: number }>;
}
