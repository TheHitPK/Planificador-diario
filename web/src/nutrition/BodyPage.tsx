import { useMemo, useState, type FormEvent } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BodyEntry, Profile } from './types';
import { bmi, bmiLabel, fmt1 } from './calc';
import { parseAmount } from '../finance/calc';
import { formatDM, fromISO, toISO, today } from '../lib/dates';
import { XIcon } from '../components/Icons';
import {
  Button, Card, CardTitle, ChartFrame, ChartTip, ColHead, Empty, Field, FieldRow, FormActions, FormError, Grid2, Hint, Input,
  Stack, Table, Td, Th, Tr, TwoCol, chart, cn, formClass,
} from '../ui';

interface Props {
  body: BodyEntry[];
  profile: Profile | null;
  onSave: (entry: BodyEntry) => void;
  onDelete: (id: string) => void;
}

export default function BodyPage({ body, profile, onSave, onDelete }: Props) {
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
    const entry: BodyEntry = { id: '', date, weight: w, bodyFat: bf, waist: wa, note: note.trim() || undefined };
    // Un registro por día: si ya existe ese día, se reemplaza
    onSave(entry);
    setWeight('');
    setBodyFat('');
    setWaist('');
    setNote('');
    setError('');
  };

  const remove = (b: BodyEntry) => {
    if (!confirm(`¿Eliminar el registro del ${formatDM(fromISO(b.date))}?`)) return;
    onDelete(b.id);
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
    <Stack>
      <Card>
        <CardTitle>Cómo estoy</CardTitle>
        {!last ? (
          <p className="text-ink-2">Registra tu peso para ver tu progreso.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
      </Card>

      <TwoCol>
        <Card>
          <CardTitle>Nuevo registro</CardTitle>
          <form className={formClass} onSubmit={save}>
            <Field label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Peso (kg)">
              <Input amount inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej. 78,4" />
            </Field>
            <FieldRow>
              <Field label="% de grasa">
                <Input inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="Opcional" />
              </Field>
              <Field label="Cintura (cm)">
                <Input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Opcional" />
              </Field>
            </FieldRow>
            <Field label="Nota">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. En ayunas, báscula del gym" />
            </Field>
            <Hint>Consejo: pésate en ayunas, a la misma hora y en la misma báscula. Si ya hay un registro ese día, se reemplaza.</Hint>
            {error && <FormError>{error}</FormError>}
            <FormActions>
              <Button type="submit" variant="primary">
                Guardar registro
              </Button>
            </FormActions>
          </form>
        </Card>

        <Card delay={0.08}>
          <CardTitle>Historial</CardTitle>
          {sorted.length === 0 ? (
            <Empty>Sin registros todavía. Guarda tu peso de hoy para empezar.</Empty>
          ) : (
            <Table compact>
              <thead>
                <tr>
                  <ColHead align="left">Fecha</ColHead>
                  <ColHead>Peso</ColHead>
                  <ColHead>% grasa</ColHead>
                  <ColHead>Magra</ColHead>
                  <ColHead>Cintura</ColHead>
                  <ColHead />
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((b) => (
                  <Tr key={b.id}>
                    <Th scope="row" align="left" className="font-semibold">
                      {formatDM(fromISO(b.date))}/{b.date.slice(0, 4)}
                      {b.note && <div className="text-[13px] font-normal text-ink-2">{b.note}</div>}
                    </Th>
                    <Td>{fmt1(b.weight)} kg</Td>
                    <Td>{b.bodyFat !== undefined ? `${fmt1(b.bodyFat)} %` : '—'}</Td>
                    <Td>{b.bodyFat !== undefined ? `${fmt1(b.weight * (1 - b.bodyFat / 100))} kg` : '—'}</Td>
                    <Td>{b.waist !== undefined ? `${fmt1(b.waist)} cm` : '—'}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      <Button variant="danger" size="sm" onClick={() => remove(b)} aria-label="Eliminar">
                        <XIcon size={14} />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </TwoCol>

      {chartData.length >= 2 && (
        <Grid2>
          <Card>
            <CardTitle>Peso (kg)</CardTitle>
            <TrendChart data={chartData} dataKey="weight" unit="kg" color="var(--flow-in)" />
          </Card>
          {hasFat && (
            <Card delay={0.08}>
              <CardTitle>% de grasa</CardTitle>
              <TrendChart data={chartData} dataKey="bodyFat" unit="%" color="var(--macro-fat)" />
            </Card>
          )}
        </Grid2>
      )}
    </Stack>
  );
}

function Stat({ label, value, sub, delta, unit }: { label: string; value: string; sub?: string; delta?: number | null; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-transparent bg-surface-2 px-3.5 py-3 transition duration-300 ease-out-expo hover:-translate-y-[3px] hover:border-accent/30 hover:shadow-card">
      <span className="text-[13px] text-ink-2">{label}</span>
      <strong className="font-display text-[22px] tabular-nums">{value}</strong>
      {delta !== undefined && delta !== null && (
        <span className={cn('text-[13px] font-semibold', delta <= 0 ? 'text-good-ink' : 'text-warn-ink')}>
          {delta > 0 ? '▲ +' : delta < 0 ? '▼ −' : ''}
          {fmt1(Math.abs(delta))} {unit}
        </span>
      )}
      {sub && <span className="text-[13px] text-ink-2">{sub}</span>}
    </div>
  );
}

function TrendChart({
  data, dataKey, unit, color,
}: {
  data: { label: string; weight: number; bodyFat: number | null }[];
  dataKey: 'weight' | 'bodyFat';
  unit: string;
  color: string;
}) {
  const dot = { fill: color, stroke: 'var(--surface)', strokeWidth: 2 };
  return (
    <ChartFrame className="mt-2">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={chart.axis} tick={chart.tick} minTickGap={16} />
          <YAxis
            domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={chart.tick}
            tickFormatter={(v: number) => fmt1(Math.round(v * 10) / 10)}
          />
          <Tooltip
            cursor={chart.lineCursor}
            isAnimationActive={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTip title={(payload[0].payload as { label: string }).label}>
                  <strong>
                    {fmt1(payload[0].value as number)} {unit}
                  </strong>
                </ChartTip>
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, ...dot }}
            activeDot={{ r: 6, ...dot }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
