import { useMemo, useState, type FormEvent } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BodyEntry, Profile } from './types';
import { bmi, bmiLabel, fmt1 } from './calc';
import { parseAmount } from '../finance/calc';
import { formatDM, fromISO, toISO, today } from '../lib/dates';
import { newId } from '../lib/storage';

interface Props {
  body: BodyEntry[];
  profile: Profile | null;
  onChange: (fn: (prev: BodyEntry[]) => BodyEntry[]) => void;
}

export default function BodyPage({ body, profile, onChange }: Props) {
  const [date, setDate] = useState(toISO(today()));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const sorted = useMemo(() => [...body].sort((a, b) => a.date.localeCompare(b.date)), [body]);
  const last = sorted[sorted.length - 1] ?? null;
  const first = sorted[0] ?? null;
  const lastFat = [...sorted].reverse().find((b) => b.bodyFat !== undefined);
  const firstFat = sorted.find((b) => b.bodyFat !== undefined);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const w = parseAmount(weight);
    const bf = bodyFat.trim() ? parseAmount(bodyFat) : undefined;
    const wa = waist.trim() ? parseAmount(waist) : undefined;
    if (!(w > 0 && w < 400)) return setError('Escribe un peso válido en kg.');
    if (bf !== undefined && !(bf > 2 && bf < 70)) return setError('El % de grasa debe estar entre 2 y 70.');
    if (wa !== undefined && !(wa > 30 && wa < 250)) return setError('La cintura debe estar en cm.');
    const entry: BodyEntry = { id: newId(), date, weight: w, bodyFat: bf, waist: wa, note: note.trim() || undefined };
    // Un registro por día: si ya existe ese día, se reemplaza
    onChange((prev) => [...prev.filter((b) => b.date !== date), entry]);
    setWeight('');
    setBodyFat('');
    setWaist('');
    setNote('');
    setError('');
  };

  const remove = (b: BodyEntry) => {
    if (!confirm(`¿Eliminar el registro del ${formatDM(fromISO(b.date))}?`)) return;
    onChange((prev) => prev.filter((x) => x.id !== b.id));
  };

  const chartData = sorted.map((b) => ({
    label: formatDM(fromISO(b.date)),
    weight: b.weight,
    bodyFat: b.bodyFat ?? null,
    lean: b.bodyFat !== undefined ? Math.round(b.weight * (1 - b.bodyFat / 100) * 10) / 10 : null,
  }));
  const hasFat = chartData.some((c) => c.bodyFat !== null);

  const imc = last && profile ? bmi(last.weight, profile.height) : null;
  const delta = (a?: number, b?: number) => (a !== undefined && b !== undefined ? a - b : null);
  const dW = last && first && last !== first ? delta(last.weight, first.weight) : null;
  const dF = lastFat && firstFat && lastFat !== firstFat ? delta(lastFat.bodyFat, firstFat.bodyFat) : null;

  return (
    <div className="nutri">
      <section className="card">
        <h2>Cómo estoy</h2>
        {!last ? (
          <p className="muted">Registra tu peso para ver tu progreso.</p>
        ) : (
          <div className="body-stats">
            <Stat label="Peso" value={`${fmt1(last.weight)} kg`} delta={dW} unit="kg" sub={`desde ${formatDM(fromISO(first!.date))}`} />
            <Stat
              label="% de grasa"
              value={lastFat ? `${fmt1(lastFat.bodyFat!)} %` : '—'}
              delta={dF}
              unit="%"
              sub={firstFat ? `desde ${formatDM(fromISO(firstFat.date))}` : 'sin registrar'}
            />
            <Stat
              label="Masa magra"
              value={lastFat ? `${fmt1(last.weight * (1 - lastFat.bodyFat! / 100))} kg` : '—'}
              sub="Músculo, huesos, agua…"
            />
            <Stat label="Masa grasa" value={lastFat ? `${fmt1((last.weight * lastFat.bodyFat!) / 100)} kg` : '—'} sub="Peso × % de grasa" />
            <Stat
              label="IMC"
              value={imc ? fmt1(imc) : '—'}
              sub={imc ? `${bmiLabel(imc)} · no distingue músculo de grasa` : 'Pon tu estatura en Objetivos'}
            />
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Nuevo registro</h2>
          <form className="form" onSubmit={save}>
            <label className="field">
              <span>Fecha</span>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>Peso (kg)</span>
              <input className="input amount-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej. 78,4" />
            </label>
            <div className="field-row">
              <label className="field">
                <span>% de grasa</span>
                <input className="input" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="Opcional" />
              </label>
              <label className="field">
                <span>Cintura (cm)</span>
                <input className="input" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Opcional" />
              </label>
            </div>
            <label className="field">
              <span>Nota</span>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. En ayunas, báscula del gym" />
            </label>
            <span className="hint">Consejo: pésate en ayunas, a la misma hora y en la misma báscula. Si ya hay un registro ese día, se reemplaza.</span>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn primary">
                Guardar
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Historial</h2>
          {sorted.length === 0 ? (
            <p className="empty">Sin registros todavía.</p>
          ) : (
            <div className="table-wrap">
              <table className="grid foods-table">
                <thead>
                  <tr>
                    <th className="col-day">Fecha</th>
                    <th>Peso</th>
                    <th>% grasa</th>
                    <th>Magra</th>
                    <th>Cintura</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...sorted].reverse().map((b) => (
                    <tr key={b.id}>
                      <th scope="row" className="col-day">
                        {formatDM(fromISO(b.date))}/{b.date.slice(0, 4)}
                        {b.note && <div className="muted small">{b.note}</div>}
                      </th>
                      <td>{fmt1(b.weight)} kg</td>
                      <td>{b.bodyFat !== undefined ? `${fmt1(b.bodyFat)} %` : '—'}</td>
                      <td>{b.bodyFat !== undefined ? `${fmt1(b.weight * (1 - b.bodyFat / 100))} kg` : '—'}</td>
                      <td>{b.waist !== undefined ? `${fmt1(b.waist)} cm` : '—'}</td>
                      <td className="row-actions">
                        <button className="btn danger small" onClick={() => remove(b)} aria-label="Eliminar">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {chartData.length >= 2 && (
        <div className="stats-grid">
          <section className="card">
            <h2>Peso (kg)</h2>
            <TrendChart data={chartData} dataKey="weight" unit="kg" className="line-weight" />
          </section>
          {hasFat && (
            <section className="card">
              <h2>% de grasa</h2>
              <TrendChart data={chartData} dataKey="bodyFat" unit="%" className="line-fat" />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, delta, unit }: { label: string; value: string; sub?: string; delta?: number | null; unit?: string }) {
  return (
    <div className="body-stat">
      <span className="muted small">{label}</span>
      <strong className="body-value">{value}</strong>
      {delta !== undefined && delta !== null && (
        <span className={`small delta ${delta <= 0 ? 'down' : 'up'}`}>
          {delta > 0 ? '▲ +' : delta < 0 ? '▼ −' : ''}
          {fmt1(Math.abs(delta))} {unit}
        </span>
      )}
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}

function TrendChart({
  data, dataKey, unit, className,
}: {
  data: { label: string; weight: number; bodyFat: number | null }[];
  dataKey: 'weight' | 'bodyFat';
  unit: string;
  className: string;
}) {
  return (
    <div className="stat-chart fin-chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} minTickGap={16} />
          <YAxis
            domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#898781' }}
            tickFormatter={(v: number) => fmt1(Math.round(v * 10) / 10)}
          />
          <Tooltip
            cursor={{ className: 'chart-crosshair' }}
            isAnimationActive={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tip">
                  <div className="chart-tip-title">{(payload[0].payload as { label: string }).label}</div>
                  <strong>
                    {fmt1(payload[0].value as number)} {unit}
                  </strong>
                </div>
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            className={className}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
