import type { Account, Currency, ExpenseClass, ExpenseReason, IncomeType } from './types';

export const ACCOUNTS: Account[] = ['zelle', 'efectivo_usd', 'usdt', 'efectivo_bs', 'transferencia', 'pagomovil'];

export const ACCOUNT_LABEL: Record<Account, string> = {
  zelle: 'Zelle',
  efectivo_usd: 'Efectivo $',
  usdt: 'USDT',
  efectivo_bs: 'Efectivo Bs',
  transferencia: 'Transferencia',
  pagomovil: 'Pago Móvil',
};

export const ACCOUNT_ICON: Record<Account, string> = {
  zelle: '🏦',
  efectivo_usd: '💵',
  usdt: '💠',
  efectivo_bs: '💴',
  transferencia: '🔁',
  pagomovil: '📱',
};

export const ACCOUNT_CURRENCY: Record<Account, Currency> = {
  zelle: 'USD',
  efectivo_usd: 'USD',
  usdt: 'USD',
  efectivo_bs: 'VES',
  transferencia: 'VES',
  pagomovil: 'VES',
};

export const accountsOf = (c: Currency) => ACCOUNTS.filter((a) => ACCOUNT_CURRENCY[a] === c);

export const INCOME_LABEL: Record<IncomeType, string> = {
  sueldo: 'Sueldo / Salario',
  venta: 'Venta',
  servicio: 'Servicio / Trabajo',
  cambio: 'Cambio de divisas',
  regalo: 'Regalo',
  prestamo: 'Préstamo recibido',
  reembolso: 'Reembolso / Devolución',
  otro: 'Otro',
};

export const REASON_LABEL: Record<ExpenseReason, string> = {
  compra: 'Compra',
  pago: 'Pago (servicio, deuda…)',
  venta_divisas: 'Venta de divisas',
  cambio: 'Cambio entre cuentas',
  otro: 'Otro',
};

/** Motivos que solo mueven dinero de una cuenta a otra: no cuentan como gasto ni como ingreso. */
export const TRANSFER_REASONS: ExpenseReason[] = ['venta_divisas', 'cambio'];

export const CLASS_LABEL: Record<ExpenseClass, string> = {
  gasto: 'Gasto',
  costo: 'Costo',
};

export const CLASS_HINT: Record<ExpenseClass, string> = {
  gasto: 'Consumo personal o del día a día (comida, transporte, ocio…).',
  costo: 'Dinero invertido para producir o vender algo (insumos, materiales, mercancía…).',
};

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Transporte',
  'Servicios',
  'Salud',
  'Hogar',
  'Ropa',
  'Entretenimiento',
  'Educación',
  'Insumos / Materiales',
  'Mercancía',
  'Deudas',
  'Otro',
];
