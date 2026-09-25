import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinanceData, Rates } from './types';
import { ACCOUNTS, ACCOUNT_CURRENCY, ACCOUNT_ICON, ACCOUNT_LABEL } from './constants';
import {
  balances, fmtAccount, fmtBs, fmtEur, fmtNum, fmtUsd, isTransfer, movementUsd, parseAmount, toBs, toUsd, totals,
  usdtAverageRate,
} from './calc';
import { MONTH_NAMES, MONTH_SHORT, formatDM, fromISO, toISO, today } from '../lib/dates';
import type { RateStatus } from './FinanceModule';

interface Props {
  data: FinanceData;
  rateStatus: RateStatus;
  onRefreshRates: () => void;
  onSaveRates: (r: Rates) => void;
}

export default function FinanceSummary({ data, rateStatus, onRefreshRates, onSaveRates }: Props) {
  const { movements, rates } = data;
  const bal = useMemo(() => balances(movements), [movements]);
  const tot = totals(bal, rates);
  const avgUsdt = useMemo(() => usdtAverageRate(movements), [movements]);

  const t = today();
  const monthKey = toISO(t).slice(0, 7);
  const monthReal = movements.filter((m) => m.date.startsWith(monthKey) && !isTransfer(m));
  const sum = (pred: (m: (typeof movements)[number]) => boolean) =>
    monthReal.filter(pred).reduce((s, m) => s + movementUsd(m), 0);
  const inUsd = sum((m) => m.kind === 'entrada');
  const outUsd = sum((m) => m.kind === 'salida');
  const gastoUsd = sum((m) => m.kind === 'salida' && m.expenseClass === 'gasto');
  const costoUsd = sum((m) => m.kind === 'salida' && m.expenseClass === 'costo');

  // Últimos 6 meses: entradas vs salidas (en $)
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(t.getFullYear(), t.getMonth() - 5 + i, 1);
      const key = toISO(d).slice(0, 7);
      const items = movements.filter((m) => m.date.startsWith(key) && !isTransfer(m));
      const entradas = items.filter((m) => m.kind === 'entrada').reduce((s, m) => s + movementUsd(m), 0);
      const salidas = items.filter((m) => m.kind === 'salida').reduce((s, m) => s + movementUsd(m), 0);
      return {
        label: MONTH_SHORT[d.getMonth()],
        detail: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        entradas: Math.round(entradas * 100) / 100,
        salidas: Math.round(salidas * 100) / 100,
      };
    });
  }, [movements]);

  // Salidas del mes por categoría
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of monthReal) {
      if (m.kind !== 'salida') continue;
      const k = m.category ?? 'Otro';
      map.set(k, (map.get(k) ?? 0) + movementUsd(m));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthReal]);
  const maxCat = byCategory[0]?.[1] ?? 0;

  return (
    <div className="fin-summary">
      <RatesCard rates={rates} status={rateStatus} onRefresh={onRefreshRates} onSave={onSaveRates} avgUsdt={avgUsdt} />

      <section className="card">
        <h2>Lo que tengo</h2>
        {tot ? (
          <div className="totals">
            <div className="total-main">
              <span className="muted small">Total en dólares</span>
              <span className="hero">{fmtUsd(tot.usd)}</span>
            </div>
            <div>
              <span className="muted small">En bolívares (BCV $)</span>
              <strong>{fmtBs(tot.bs)}</strong>
            </div>
            <div>
              <span className="muted small">En euros (BCV €)</span>
              <strong>{fmtEur(tot.eur)}</strong>
            </div>
          </div>
        ) : (
          <p className="muted">Carga la tasa BCV para ver tus totales convertidos.</p>
        )}

        <div className="accounts-grid">
          {ACCOUNTS.map((a) => (
            <div key={a} className={`account-tile ${bal[a] < 0 ? 'negative' : ''}`}>
              <div className="account-head">
                <span aria-hidden>{ACCOUNT_ICON[a]}</span>
                <span>{ACCOUNT_LABEL[a]}</span>
              </div>
              <strong className="account-amount">{fmtAccount(a, bal[a])}</strong>
              {rates && (
                <span className="muted small">
                  ≈ {ACCOUNT_CURRENCY[a] === 'USD' ? fmtBs(toBs(a, bal[a], rates.usd)) : fmtUsd(toUsd(a, bal[a], rates.usd))}
                </span>
              )}
              {a === 'usdt' && avgUsdt && (
                <span className="muted small">
                  Compra prom.: {fmtNum(avgUsdt)} Bs · {fmtBs(bal[a] * avgUsdt)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="stats-grid">
        <section className="card">
          <h2>{MONTH_NAMES[t.getMonth()]}</h2>
          <div className="mini-stats">
            <div>
              <span className="muted small">Entradas</span>
              <strong className="amt-in">{fmtUsd(inUsd)}</strong>
            </div>
            <div>
              <span className="muted small">Salidas</span>
              <strong className="amt-out">{fmtUsd(outUsd)}</strong>
            </div>
            <div>
              <span className="muted small">Balance</span>
              <strong className={inUsd - outUsd >= 0 ? 'amt-in' : 'amt-neg'}>{fmtUsd(inUsd - outUsd)}</strong>
            </div>
          </div>
          <div className="mini-stats">
            <div>
              <span className="muted small">Gastos</span>
              <strong>{fmtUsd(gastoUsd)}</strong>
            </div>
            <div>
              <span className="muted small">Costos</span>
              <strong>{fmtUsd(costoUsd)}</strong>
            </div>
          </div>

          <h3 className="sub-h">Salidas por categoría</h3>
          {byCategory.length === 0 ? (
            <p className="empty">Sin salidas este mes.</p>
          ) : (
            <ul className="cat-bars">
              {byCategory.map(([cat, v]) => (
                <li key={cat}>
                  <span className="cat-name">{cat}</span>
                  <span className="cat-track">
                    <span className="cat-fill" style={{ width: `${maxCat ? (v / maxCat) * 100 : 0}%` }} />
                  </span>
                  <span className="cat-value">{fmtUsd(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Entradas vs salidas</h2>
            <div className="legend">
              <span><i className="sw sw-in" /> Entradas</span>
              <span><i className="sw sw-out" /> Salidas</span>
            </div>
          </div>
          <p className="muted small">Últimos 6 meses, en $ (sin cambios de divisas)</p>
          <div className="stat-chart fin-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap="24%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#898781' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip cursor={{ className: 'chart-cursor' }} content={<FinTooltip />} isAnimationActive={false} />
                <Bar dataKey="entradas" className="bar-in" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Bar dataKey="salidas" className="bar-out" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <Calculator rates={rates} avgUsdt={avgUsdt} />
    </div>
  );
}

function FinTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { detail: string; entradas: number; salidas: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{p.detail}</div>
      <div><i className="sw sw-in" /> Entradas: <strong>{fmtUsd(p.entradas)}</strong></div>
      <div><i className="sw sw-out" /> Salidas: <strong>{fmtUsd(p.salidas)}</strong></div>
      <div className="muted">Balance: {fmtUsd(p.entradas - p.salidas)}</div>
    </div>
  );
}

function RatesCard({
  rates, status, onRefresh, onSave, avgUsdt,
}: {
  rates: Rates | null;
  status: RateStatus;
  onRefresh: () => void;
  onSave: (r: Rates) => void;
  avgUsdt: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [usd, setUsd] = useState('');
  const [eur, setEur] = useState('');

  const startEdit = () => {
    setUsd(rates ? String(rates.usd) : '');
    setEur(rates ? String(rates.eur) : '');
    setEditing(true);
  };

  const save = () => {
    const u = parseAmount(usd);
    const e = parseAmount(eur);
    if (!(u > 0) || !(e > 0)) return;
    onSave({ usd: u, eur: e, date: toISO(today()), source: 'manual' });
    setEditing(false);
  };

  return (
    <section className="card rates-card">
      <div className="rates-values">
        <div>
          <span className="muted small">BCV Dólar</span>
          <strong className="rate">{rates ? `${fmtNum(rates.usd)} Bs` : '—'}</strong>
        </div>
        <div>
          <span className="muted small">BCV Euro</span>
          <strong className="rate">{rates ? `${fmtNum(rates.eur)} Bs` : '—'}</strong>
        </div>
        <div>
          <span className="muted small">Tu USDT (compra prom.)</span>
          <strong className="rate">{avgUsdt ? `${fmtNum(avgUsdt)} Bs` : '—'}</strong>
        </div>
      </div>
      <div className="rates-meta">
        {rates && (
          <span className="muted small">
            {rates.source === 'bcv' ? 'Tasa oficial BCV' : 'Tasa escrita a mano'} del {formatDM(fromISO(rates.date))}
          </span>
        )}
        {status.state === 'error' && <span className="hint warn">{status.message}</span>}
        <div className="form-actions">
          <button className="btn ghost small" onClick={onRefresh} disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Actualizando…' : '↻ Actualizar BCV'}
          </button>
          <button className="btn ghost small" onClick={startEdit}>
            ✎ Escribir tasa
          </button>
        </div>
      </div>
      {editing && (
        <div className="field-row rates-edit">
          <label className="field">
            <span>BCV $ (Bs)</span>
            <input className="input" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </label>
          <label className="field">
            <span>BCV € (Bs)</span>
            <input className="input" inputMode="decimal" value={eur} onChange={(e) => setEur(e.target.value)} />
          </label>
          <div className="form-actions end">
            <button className="btn primary small" onClick={save}>
              Guardar
            </button>
            <button className="btn ghost small" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type CalcUnit = 'USD' | 'EUR' | 'VES' | 'USDT';

function Calculator({ rates, avgUsdt }: { rates: Rates | null; avgUsdt: number | null }) {
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<CalcUnit>('USD');
  const [usdtRate, setUsdtRate] = useState('');

  const n = parseAmount(amount);
  const uRate = parseAmount(usdtRate) > 0 ? parseAmount(usdtRate) : avgUsdt ?? rates?.usd ?? 0;

  // Todo pasa primero a bolívares
  const bs =
    !rates || !(n >= 0)
      ? null
      : unit === 'VES'
        ? n
        : unit === 'USD'
          ? n * rates.usd
          : unit === 'EUR'
            ? n * rates.eur
            : n * uRate;

  const rows: { label: string; value: string; unit: CalcUnit }[] =
    bs === null || !rates
      ? []
      : [
          { unit: 'VES', label: 'Bolívares', value: fmtBs(bs) },
          { unit: 'USD', label: 'Dólares (BCV $)', value: fmtUsd(bs / rates.usd) },
          { unit: 'EUR', label: 'Euros (BCV €)', value: fmtEur(bs / rates.eur) },
          { unit: 'USDT', label: `USDT (a ${fmtNum(uRate)} Bs)`, value: `${fmtNum(uRate ? bs / uRate : 0)} USDT` },
        ];

  return (
    <section className="card">
      <h2>Calculadora</h2>
      <div className="calc">
        <div className="field-row">
          <label className="field">
            <span>Monto</span>
            <input className="input amount-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <div className="field">
            <span>Moneda</span>
            <div className="segmented">
              {(
                [
                  ['USD', '$'],
                  ['EUR', '€'],
                  ['VES', 'Bs'],
                  ['USDT', 'USDT'],
                ] as [CalcUnit, string][]
              ).map(([u, l]) => (
                <button type="button" key={u} className={unit === u ? 'active' : ''} onClick={() => setUnit(u)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Tasa USDT (Bs)</span>
            <input
              className="input"
              inputMode="decimal"
              value={usdtRate}
              onChange={(e) => setUsdtRate(e.target.value)}
              placeholder={avgUsdt ? `${fmtNum(avgUsdt)} (tu promedio)` : rates ? `${fmtNum(rates.usd)} (BCV)` : ''}
            />
          </label>
        </div>
        {rows.length === 0 ? (
          <p className="muted">{rates ? 'Escribe un monto válido.' : 'Necesitas la tasa BCV para convertir.'}</p>
        ) : (
          <div className="calc-results">
            {rows
              .filter((r) => r.unit !== unit)
              .map((r) => (
                <div key={r.unit}>
                  <span className="muted small">{r.label}</span>
                  <strong>{r.value}</strong>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
