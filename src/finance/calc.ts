import { ACCOUNTS, ACCOUNT_CURRENCY, TRANSFER_REASONS } from './constants';
import type { Account, Movement, Rates } from './types';

const nf2 = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUsd = (n: number) => `$ ${nf2.format(n)}`;
export const fmtBs = (n: number) => `Bs ${nf2.format(n)}`;
export const fmtEur = (n: number) => `€ ${nf2.format(n)}`;
export const fmtUsdt = (n: number) => `${nf2.format(n)} USDT`;
export const fmtNum = (n: number) => nf2.format(n);

export const fmtAccount = (account: Account, n: number) =>
  account === 'usdt' ? fmtUsdt(n) : ACCOUNT_CURRENCY[account] === 'USD' ? fmtUsd(n) : fmtBs(n);

/**
 * Convierte texto a número aceptando "1234.5", "1234,5" y "1.234,50".
 * Devuelve NaN si no es un número válido.
 */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/\s/g, '');
  if (!t) return NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^-?\d*\.?\d+$/.test(normalized) ? Number(normalized) : NaN;
}

/** Signo del movimiento sobre el saldo. */
const sign = (m: Movement) => (m.kind === 'entrada' ? 1 : -1);

export function balances(movements: Movement[]): Record<Account, number> {
  const out = Object.fromEntries(ACCOUNTS.map((a) => [a, 0])) as Record<Account, number>;
  for (const m of movements) out[m.account] += sign(m) * m.amount;
  return out;
}

/** Valor en dólares de un monto de una cuenta, con la tasa BCV indicada. */
export const toUsd = (account: Account, amount: number, rateUsd: number) =>
  ACCOUNT_CURRENCY[account] === 'USD' ? amount : rateUsd > 0 ? amount / rateUsd : 0;

/** Valor en bolívares. Para USDT usa la tasa de compra si existe. */
export const toBs = (account: Account, amount: number, rateUsd: number, usdtRate?: number) =>
  ACCOUNT_CURRENCY[account] === 'VES' ? amount : amount * (account === 'usdt' && usdtRate ? usdtRate : rateUsd);

/** ¿Es solo un movimiento entre cuentas (cambio / venta de divisas)? */
export const isTransfer = (m: Movement) =>
  !!m.linkId || (m.kind === 'salida' && !!m.reason && TRANSFER_REASONS.includes(m.reason)) ||
  (m.kind === 'entrada' && m.incomeType === 'cambio');

/**
 * Tasa promedio (Bs por USDT) de los USDT que tienes, usando costo promedio ponderado:
 * cada entrada con tasa recalcula el promedio; las salidas reducen la cantidad sin cambiarlo.
 */
export function usdtAverageRate(movements: Movement[]): number | null {
  const sorted = movements
    .filter((m) => m.account === 'usdt')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'entrada' ? -1 : 1));
  let qty = 0;
  let avg: number | null = null;
  for (const m of sorted) {
    if (m.kind === 'entrada') {
      if (m.usdtRate && m.usdtRate > 0) {
        const base = Math.max(qty, 0);
        avg = avg === null ? m.usdtRate : (base * avg + m.amount * m.usdtRate) / (base + m.amount);
      }
      qty += m.amount;
    } else {
      qty -= m.amount;
    }
  }
  return avg;
}

export interface Totals {
  usd: number;
  bs: number;
  eur: number;
}

/** Patrimonio total convertido a $, Bs y € con las tasas actuales. */
export function totals(bal: Record<Account, number>, rates: Rates | null): Totals | null {
  if (!rates || rates.usd <= 0 || rates.eur <= 0) return null;
  let usd = 0;
  for (const a of ACCOUNTS) usd += toUsd(a, bal[a], rates.usd);
  const bs = usd * rates.usd;
  return { usd, bs, eur: bs / rates.eur };
}

/** Valor en $ de un movimiento con la tasa que tenía ese día. */
export const movementUsd = (m: Movement) => toUsd(m.account, m.amount, m.rateUsd);

export const movementBs = (m: Movement) => toBs(m.account, m.amount, m.rateUsd, m.usdtRate);
