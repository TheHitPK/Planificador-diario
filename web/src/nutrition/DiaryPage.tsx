import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Food, LogEntry, Meal, NutritionData } from './types';
import { MEALS, MEAL_ICON, MEAL_LABEL } from './defaults';
import { dayEntries, fmt1, kcalFromMacros, macrosFor, sumMacros } from './calc';
import { DAY_NAMES, DAY_SHORT, addDays, formatDM, fromISO, toISO, today, weekdayIndex } from '../lib/dates';
import { parseAmount } from '../finance/calc';
import MacroBars from './MacroBars';
import type { NutritionOps } from './NutritionModule';
import { EASE_OUT } from '../lib/motion';
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, XIcon } from '../components/Icons';
import {
  Button, Card, CardHead, CardTitle, ChartFrame, ChartTip, Field, FieldRow, FormActions, FormError, Hint, Input, MiniStat,
  MiniStats, Segmented, SegmentedOption, Stack, TwoCol, chart, cn, formClass,
} from '../ui';

interface Props {
  data: NutritionData;
  ops: NutritionOps;
}

const UNIT_LABEL = { g: 'g', ml: 'ml', unidad: 'unid.' } as const;

/** Comida sugerida según la hora. */
const mealForNow = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? 'desayuno' : h < 16 ? 'almuerzo' : h < 19 ? 'merienda' : 'cena';
};

export default function DiaryPage({ data, ops }: Props) {
  const todayISO = toISO(today());
  const [date, setDate] = useState(todayISO);
  const d = fromISO(date);

  // El día visible y los 6 anteriores (gráfico semanal) deben estar cargados.
  const { ensureRange } = ops;
  useEffect(() => {
    ensureRange(toISO(addDays(fromISO(date), -7)), date);
  }, [date, ensureRange]);

  const entries = useMemo(() => dayEntries(data.log, date), [data.log, date]);
  const consumed = sumMacros(entries);
  const left = data.targets.kcal - consumed.kcal;

  const shift = (n: number) => setDate(toISO(addDays(d, n)));
  const dayLabel =
    date === todayISO ? 'Hoy' : date === toISO(addDays(today(), -1)) ? 'Ayer' : `${DAY_NAMES[weekdayIndex(d)]} ${formatDM(d)}`;

  const addEntries = ops.addEntries;
  const remove = ops.removeEntry;

  const copyPrevious = () => {
    const prevISO = toISO(addDays(d, -1));
    const prev = dayEntries(data.log, prevISO);
    if (prev.length === 0) return alert('El día anterior no tiene comidas registradas.');
    if (!confirm(`¿Copiar ${prev.length} alimentos del día anterior a este día?`)) return;
    ops.copyDay(prevISO, date);
  };

  // Últimos 7 días (terminando en el día que estás viendo)
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(d, i - 6);
    const iso = toISO(day);
    const m = sumMacros(dayEntries(data.log, iso));
    return { label: DAY_SHORT[weekdayIndex(day)], detail: `${DAY_SHORT[weekdayIndex(day)]} ${formatDM(day)}`, ...m, logged: m.kcal > 0 };
  });
  const logged = week.filter((w) => w.logged);
  const avg = (k: 'kcal' | 'protein') => (logged.length ? logged.reduce((s, w) => s + w[k], 0) / logged.length : 0);

  return (
    <Stack>
      <Card>
        <CardHead>
          <div>
            <h2>{dayLabel}</h2>
            <p className="text-ink-2">
              {left >= 0 ? `Te quedan ${fmt1(left)} kcal` : `Te pasaste ${fmt1(-left)} kcal`} · {entries.length} alimentos
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" className="px-2.5" onClick={() => shift(-1)} aria-label="Día anterior">
              <ChevronLeftIcon />
            </Button>
            <Button variant="ghost" onClick={() => setDate(todayISO)} disabled={date === todayISO}>
              Hoy
            </Button>
            <Button variant="ghost" className="px-2.5" onClick={() => shift(1)} aria-label="Día siguiente">
              <ChevronRightIcon />
            </Button>
          </div>
        </CardHead>
        <MacroBars key={date} consumed={consumed} targets={data.targets} />
      </Card>

      <TwoCol>
        <AddFoodForm foods={data.foods} date={date} onAdd={addEntries} />

        <Card delay={0.08}>
          <CardHead>
            <h2>Comidas</h2>
            <Button variant="ghost" size="sm" onClick={copyPrevious}>
              <CopyIcon size={14} />
              Copiar día anterior
            </Button>
          </CardHead>
          {MEALS.map((meal) => {
            const items = entries.filter((e) => e.meal === meal);
            const total = sumMacros(items);
            return (
              <div key={meal} className="border-t border-grid py-3 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>
                    {MEAL_ICON[meal]} {MEAL_LABEL[meal]}
                  </strong>
                  <span className="text-[13px] text-ink-2">
                    {fmt1(total.kcal)} kcal · P {fmt1(total.protein)} · C {fmt1(total.carbs)} · G {fmt1(total.fat)}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="pt-1.5 text-[13px] text-ink-2">Sin alimentos</p>
                ) : (
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                    <AnimatePresence initial={false}>
                      {items.map((e) => (
                        <motion.li
                          key={e.id}
                          layout="position"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                          transition={{ duration: 0.35, ease: EASE_OUT }}
                          className="grid grid-cols-[1fr_auto] items-center gap-2.5 rounded-ctl bg-surface-2 px-2.5 py-2 transition-colors duration-150 hover:bg-accent/10 sm:grid-cols-[1fr_auto_auto]"
                        >
                          <div>
                            <span className="font-semibold">{e.name}</span>
                            <span className="text-[13px] text-ink-2">
                              {' '}
                              · {fmt1(e.amount)} {UNIT_LABEL[e.unit]}
                            </span>
                            <div className="text-[13px] text-ink-2">
                              P {fmt1(e.protein)} g · C {fmt1(e.carbs)} g · G {fmt1(e.fat)} g
                              {e.fiber > 0 && ` · Fibra ${fmt1(e.fiber)} g`}
                            </div>
                          </div>
                          <strong className="whitespace-nowrap tabular-nums">{fmt1(e.kcal)} kcal</strong>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="col-start-2 sm:col-start-auto"
                            onClick={() => remove(e.id)}
                            aria-label={`Quitar ${e.name}`}
                          >
                            <XIcon size={14} />
                          </Button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            );
          })}
        </Card>
      </TwoCol>

      <Card>
        <CardHead>
          <div>
            <h2>Últimos 7 días</h2>
            <p className="text-[13px] text-ink-2">Calorías por día · la línea es tu objetivo ({fmt1(data.targets.kcal)} kcal)</p>
          </div>
          <MiniStats className="mb-0">
            <MiniStat label="Promedio kcal" value={fmt1(Math.round(avg('kcal')))} />
            <MiniStat label="Promedio proteína" value={`${fmt1(Math.round(avg('protein')))} g`} />
            <MiniStat label="Días registrados" value={`${logged.length}/7`} />
          </MiniStats>
        </CardHead>
        <ChartFrame className="mt-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={week} margin={{ top: 12, right: 8, bottom: 0, left: -8 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={chart.axis} tick={chart.tick} />
              <YAxis tickLine={false} axisLine={false} tick={chart.tick} />
              <Tooltip cursor={chart.barCursor} content={<WeekTip target={data.targets.kcal} />} isAnimationActive={false} />
              <ReferenceLine y={data.targets.kcal} stroke="var(--ink-2)" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <Bar dataKey="kcal" fill="var(--macro-kcal)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>
    </Stack>
  );
}

function WeekTip({
  active, payload, target,
}: {
  active?: boolean;
  payload?: { payload: { detail: string; kcal: number; protein: number; carbs: number; fat: number } }[];
  target: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <ChartTip title={p.detail}>
      <div>
        <strong>{fmt1(p.kcal)} kcal</strong> <span className="text-ink-2">({target ? Math.round((p.kcal / target) * 100) : 0}%)</span>
      </div>
      <div className="text-ink-2">
        P {fmt1(p.protein)} g · C {fmt1(p.carbs)} g · G {fmt1(p.fat)} g
      </div>
    </ChartTip>
  );
}

function AddFoodForm({ foods, date, onAdd }: { foods: Food[]; date: string; onAdd: (items: LogEntry[]) => void }) {
  const [mode, setMode] = useState<'lista' | 'rapido'>('lista');
  const [meal, setMeal] = useState<Meal>(mealForNow);
  const [search, setSearch] = useState('');
  const [foodId, setFoodId] = useState('');
  const [amount, setAmount] = useState('');
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [error, setError] = useState('');

  const filtered = foods
    .filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const food = foods.find((f) => f.id === foodId) ?? null;
  const nAmount = parseAmount(amount);
  const preview = food && nAmount > 0 ? macrosFor(food, nAmount) : null;

  const pick = (f: Food) => {
    setFoodId(f.id);
    setAmount(String(f.per));
    setError('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'lista') {
      if (!food) return setError('Elige un alimento de la lista.');
      if (!(nAmount > 0)) return setError('Escribe la cantidad.');
      onAdd([{ id: '', date, meal, name: food.name, amount: nAmount, unit: food.unit, foodId: food.id, ...macrosFor(food, nAmount) }]);
      setAmount(String(food.per));
    } else {
      const p = parseAmount(quick.protein) || 0;
      const c = parseAmount(quick.carbs) || 0;
      const g = parseAmount(quick.fat) || 0;
      const kcal = parseAmount(quick.kcal) > 0 ? parseAmount(quick.kcal) : kcalFromMacros(p, c, g);
      if (!quick.name.trim()) return setError('Escribe qué comiste.');
      if (!(kcal > 0)) return setError('Escribe las calorías o los macros.');
      onAdd([
        {
          id: '', date, meal, name: quick.name.trim(), amount: 1, unit: 'unidad',
          kcal, protein: p, carbs: c, fat: g, fiber: parseAmount(quick.fiber) || 0,
        },
      ]);
      setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
    }
    setError('');
  };

  const q = (k: keyof typeof quick) => ({
    value: quick[k],
    onChange: (e: { target: { value: string } }) => setQuick({ ...quick, [k]: e.target.value }),
  });

  return (
    <Card>
      <CardTitle>Agregar alimento</CardTitle>
      <form className={formClass} onSubmit={submit}>
        <Field label="Comida" as="div">
          <Segmented cols2>
            {MEALS.map((m) => (
              <SegmentedOption key={m} active={meal === m} onClick={() => setMeal(m)}>
                {MEAL_ICON[m]} {MEAL_LABEL[m]}
              </SegmentedOption>
            ))}
          </Segmented>
        </Field>

        <Segmented>
          <SegmentedOption active={mode === 'lista'} onClick={() => setMode('lista')}>
            De mi lista
          </SegmentedOption>
          <SegmentedOption active={mode === 'rapido'} onClick={() => setMode('rapido')}>
            Registro rápido
          </SegmentedOption>
        </Segmented>

        {mode === 'lista' ? (
          <>
            <Field label="Buscar alimento">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. pollo, arepa, avena…" />
            </Field>
            <ul
              className="m-0 flex max-h-60 list-none flex-col gap-0.5 overflow-y-auto rounded-xl border border-line p-1"
              role="listbox"
              aria-label="Alimentos"
            >
              {filtered.length === 0 && (
                <li className="px-2.5 py-2 text-[13px] text-ink-2">No hay coincidencias. Agrégalo en “Alimentos”.</li>
              )}
              {filtered.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={f.id === foodId}
                    className={cn(
                      'flex w-full justify-between gap-2 rounded-lg px-2.5 py-[7px] text-left text-sm transition-colors duration-150',
                      f.id === foodId ? 'bg-accent/18' : 'hover:bg-surface-2',
                    )}
                    onClick={() => pick(f)}
                  >
                    <span>{f.name}</span>
                    <span className="text-[13px] text-ink-2">
                      {fmt1(f.kcal)} kcal / {f.per} {UNIT_LABEL[f.unit]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {food && (
              <Field label={`Cantidad de “${food.name}” (${UNIT_LABEL[food.unit]})`}>
                <Input amount inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {preview && (
                  <Hint>
                    <strong>{fmt1(preview.kcal)} kcal</strong> · P {fmt1(preview.protein)} g · C {fmt1(preview.carbs)} g · G {fmt1(preview.fat)} g
                    {preview.fiber > 0 && ` · Fibra ${fmt1(preview.fiber)} g`}
                  </Hint>
                )}
              </Field>
            )}
          </>
        ) : (
          <>
            <Field label="¿Qué comiste?">
              <Input {...q('name')} placeholder="Ej. Empanada de queso" />
            </Field>
            <FieldRow>
              <Field label="Proteína (g)">
                <Input inputMode="decimal" {...q('protein')} />
              </Field>
              <Field label="Carbos (g)">
                <Input inputMode="decimal" {...q('carbs')} />
              </Field>
              <Field label="Grasa (g)">
                <Input inputMode="decimal" {...q('fat')} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Calorías">
                <Input
                  inputMode="decimal"
                  {...q('kcal')}
                  placeholder={`${kcalFromMacros(parseAmount(quick.protein) || 0, parseAmount(quick.carbs) || 0, parseAmount(quick.fat) || 0)} (auto)`}
                />
              </Field>
              <Field label="Fibra (g)">
                <Input inputMode="decimal" {...q('fiber')} />
              </Field>
            </FieldRow>
            <Hint>Si dejas las calorías vacías se calculan de los macros (4 · 4 · 9).</Hint>
          </>
        )}

        {error && <FormError>{error}</FormError>}
        <FormActions>
          <Button type="submit" variant="primary">
            Agregar a {MEAL_LABEL[meal].toLowerCase()}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
