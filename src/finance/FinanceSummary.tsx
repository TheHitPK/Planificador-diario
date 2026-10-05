import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinanceData, Rates } from './types';
import { ACCOUNTS, ACCOUNT_CURRENCY, ACCOUNT_ICON, ACCOUNT_LABEL } from './constants';
import {
  balances, fmtAccount, fmtBs, fmtEur, fmtNum, fmtUsd, isTransfer, movementUsd, parseAmount, toBs, toUsd, totals,
  usdtAverageRate,
} from './calc';
import { MONTH_NAMES, MONTH_SHORT, formatDM, fromISO, toISO, today } from '../lib/dates';
import type { RateStatus } from './FinanceModule';
import { EASE_OUT } from '../lib/motion';
import { PencilIcon, RefreshIcon } from '../components/Icons';
import {
  BigNumber, Button, Card, CardHead, CardTitle, ChartFrame, ChartTip, Empty, Field, FieldRow, FormActions, Grid2, Hint, Input,
  MiniStat, MiniStats, Segmented, SegmentedOption, Stack, Swatch, chart, cn,
} from '../ui';

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
    <Stack>
      <RatesCard rates={rates} status={rateStatus} onRefresh={onRefreshRates} onSave={onSaveRates} avgUsdt={avgUsdt} />

      <Card delay={0.06}>
        <CardTitle>Lo que tengo</CardTitle>
        {tot ? (
          <div className="mb-[18px] flex flex-wrap items-end gap-8">
            <div className="flex flex-col">
              <span className="text-[13px] text-ink-2">Total en dólares</span>
              <BigNumber>{fmtUsd(tot.usd)}</BigNumber>
            </div>
            <MiniStat label="En bolívares (BCV $)" value={fmtBs(tot.bs)} />
            <MiniStat label="En euros (BCV €)" value={fmtEur(tot.eur)} />
          </div>
        ) : (
          <p className="mb-4 text-ink-2">Carga la tasa BCV para ver tus totales convertidos.</p>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ACCOUNTS.map((a) => (
            <div
              key={a}
              className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-linear-160 from-surface to-field px-3.5 py-3 transition duration-300 ease-out-expo hover:-translate-y-[3px] hover:border-accent/30 hover:shadow-card"
            >
              <div className="flex gap-1.5 text-[13px] font-semibold text-ink-2">
                <span aria-hidden>{ACCOUNT_ICON[a]}</span>
                <span>{ACCOUNT_LABEL[a]}</span>
              </div>
              <strong className={cn('font-display text-[19px] tabular-nums', bal[a] < 0 && 'text-bad-ink')}>{fmtAccount(a, bal[a])}</strong>
              {rates && (
                <span className="text-[13px] text-ink-2">
                  ≈ {ACCOUNT_CURRENCY[a] === 'USD' ? fmtBs(toBs(a, bal[a], rates.usd)) : fmtUsd(toUsd(a, bal[a], rates.usd))}
                </span>
              )}
              {a === 'usdt' && avgUsdt && (
                <span className="text-[13px] text-ink-2">
                  Compra prom.: {fmtNum(avgUsdt)} Bs · {fmtBs(bal[a] * avgUsdt)}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Grid2>
        <Card>
          <CardTitle>{MONTH_NAMES[t.getMonth()]}</CardTitle>
          <MiniStats>
            <MiniStat label="Entradas" value={fmtUsd(inUsd)} valueClassName="text-good-ink" />
            <MiniStat label="Salidas" value={fmtUsd(outUsd)} />
            <MiniStat label="Balance" value={fmtUsd(inUsd - outUsd)} valueClassName={inUsd - outUsd >= 0 ? 'text-good-ink' : 'text-bad-ink'} />
          </MiniStats>
          <MiniStats>
            <MiniStat label="Gastos" value={fmtUsd(gastoUsd)} />
            <MiniStat label="Costos" value={fmtUsd(costoUsd)} />
          </MiniStats>

          <h3 className="mt-4 mb-2.5">Salidas por categoría</h3>
          {byCategory.length === 0 ? (
            <Empty>Sin salidas este mes.</Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {byCategory.map(([cat, v], i) => (
                <li key={cat} className="grid grid-cols-[90px_1fr_80px] items-center gap-2.5 text-[13px] sm:grid-cols-[130px_1fr_90px]">
                  <span className="truncate text-ink-2" title={cat}>
                    {cat}
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <motion.span
                      className="block h-full rounded-full bg-linear-to-r from-dawn-400 to-flow-out"
                      initial={{ width: 0 }}
                      animate={{ width: `${maxCat ? (v / maxCat) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 }}
                    />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{fmtUsd(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card delay={0.08}>
          <CardHead>
            <h2>Entradas vs salidas</h2>
            <div className="flex gap-3.5 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Swatch className="bg-flow-in" /> Entradas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Swatch className="bg-flow-out" /> Salidas
              </span>
            </div>
          </CardHead>
          <p className="text-[13px] text-ink-2">Últimos 6 meses, en $ (sin cambios de divisas)</p>
          <ChartFrame className="mt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={chart.axis} tick={chart.tick} />
                <YAxis tickLine={false} axisLine={false} tick={chart.tick} tickFormatter={(v) => `$${v}`} />
                <Tooltip cursor={chart.barCursor} content={<FinTooltip />} isAnimationActive={false} />
                <Bar dataKey="entradas" fill="var(--flow-in)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Bar dataKey="salidas" fill="var(--flow-out)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Card>
      </Grid2>

      <Calculator rates={rates} avgUsdt={avgUsdt} />
    </Stack>
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
    <ChartTip title={p.detail}>
      <div>
        <Swatch className="bg-flow-in" /> Entradas: <strong>{fmtUsd(p.entradas)}</strong>
      </div>
      <div>
        <Swatch className="bg-flow-out" /> Salidas: <strong>{fmtUsd(p.salidas)}</strong>
      </div>
      <div className="text-ink-2">Balance: {fmtUsd(p.entradas - p.salidas)}</div>
    </ChartTip>
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

  const rate = (label: string, value: number | null | undefined) => (
    <div className="flex flex-col">
      <span className="text-[13px] text-ink-2">{label}</span>
      <strong className="font-display text-[22px] tabular-nums">{value ? `${fmtNum(value)} Bs` : '—'}</strong>
    </div>
  );

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-8">
        {rate('BCV Dólar', rates?.usd)}
        {rate('BCV Euro', rates?.eur)}
        {rate('Tu USDT (compra prom.)', avgUsdt)}
      </div>
      <div className="flex flex-col gap-1.5 lg:items-end">
        {rates && (
          <span className="text-[13px] text-ink-2">
            {rates.source === 'bcv' ? 'Tasa oficial BCV' : 'Tasa escrita a mano'} del {formatDM(fromISO(rates.date))}
          </span>
        )}
        {status.state === 'error' && <Hint tone="warn">{status.message}</Hint>}
        <FormActions>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={status.state === 'loading'}>
            <RefreshIcon size={14} className={cn(status.state === 'loading' && 'animate-spin')} />
            {status.state === 'loading' ? 'Actualizando…' : 'Actualizar BCV'}
          </Button>
          <Button variant="ghost" size="sm" onClick={startEdit}>
            <PencilIcon size={14} />
            Escribir tasa
          </Button>
        </FormActions>
      </div>
      {editing && (
        <FieldRow className="w-full">
          <Field label="BCV $ (Bs)">
            <Input inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </Field>
          <Field label="BCV € (Bs)">
            <Input inputMode="decimal" value={eur} onChange={(e) => setEur(e.target.value)} />
          </Field>
          <FormActions className="items-end">
            <Button variant="primary" size="sm" onClick={save}>
              Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </FormActions>
        </FieldRow>
      )}
    </Card>
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
    <Card>
      <CardTitle>Calculadora</CardTitle>
      <div className="flex flex-col gap-3.5">
        <FieldRow>
          <Field label="Monto">
            <Input amount inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Moneda" as="div">
            <Segmented>
              {(
                [
                  ['USD', '$'],
                  ['EUR', '€'],
                  ['VES', 'Bs'],
                  ['USDT', 'USDT'],
                ] as [CalcUnit, string][]
              ).map(([u, l]) => (
                <SegmentedOption key={u} active={unit === u} onClick={() => setUnit(u)}>
                  {l}
                </SegmentedOption>
              ))}
            </Segmented>
          </Field>
          <Field label="Tasa USDT (Bs)">
            <Input
              inputMode="decimal"
              value={usdtRate}
              onChange={(e) => setUsdtRate(e.target.value)}
              placeholder={avgUsdt ? `${fmtNum(avgUsdt)} (tu promedio)` : rates ? `${fmtNum(rates.usd)} (BCV)` : ''}
            />
          </Field>
        </FieldRow>
        {rows.length === 0 ? (
          <p className="text-ink-2">{rates ? 'Escribe un monto válido.' : 'Necesitas la tasa BCV para convertir.'}</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {rows
              .filter((r) => r.unit !== unit)
              .map((r) => (
                <div key={r.unit} className="flex flex-col rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="text-[13px] text-ink-2">{r.label}</span>
                  <strong className="font-display text-lg tabular-nums">{r.value}</strong>
                </div>
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}
