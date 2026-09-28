import { useMemo, useState, type FormEvent } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Food, LogEntry, Meal, NutritionData } from './types';
import { MEALS, MEAL_ICON, MEAL_LABEL } from './defaults';
import { dayEntries, fmt1, kcalFromMacros, macrosFor, sumMacros } from './calc';
import { DAY_NAMES, DAY_SHORT, addDays, formatDM, fromISO, toISO, today, weekdayIndex } from '../lib/dates';
import { parseAmount } from '../finance/calc';
import { newId } from '../lib/storage';
import MacroBars from './MacroBars';

interface Props {
  data: NutritionData;
  setLog: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
}

const UNIT_LABEL = { g: 'g', ml: 'ml', unidad: 'unid.' } as const;

/** Comida sugerida según la hora. */
const mealForNow = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? 'desayuno' : h < 16 ? 'almuerzo' : h < 19 ? 'merienda' : 'cena';
};

export default function DiaryPage({ data, setLog }: Props) {
  const todayISO = toISO(today());
  const [date, setDate] = useState(todayISO);
  const d = fromISO(date);

  const entries = useMemo(() => dayEntries(data.log, date), [data.log, date]);
  const consumed = sumMacros(entries);
  const left = data.targets.kcal - consumed.kcal;

  const shift = (n: number) => setDate(toISO(addDays(d, n)));
  const dayLabel =
    date === todayISO ? 'Hoy' : date === toISO(addDays(today(), -1)) ? 'Ayer' : `${DAY_NAMES[weekdayIndex(d)]} ${formatDM(d)}`;

  const addEntries = (items: LogEntry[]) => setLog((prev) => [...prev, ...items]);
  const remove = (id: string) => setLog((prev) => prev.filter((e) => e.id !== id));

  const copyPrevious = () => {
    const prevISO = toISO(addDays(d, -1));
    const prev = dayEntries(data.log, prevISO);
    if (prev.length === 0) return alert('El día anterior no tiene comidas registradas.');
    if (!confirm(`¿Copiar ${prev.length} alimentos del día anterior a este día?`)) return;
    addEntries(prev.map((e) => ({ ...e, id: newId(), date })));
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
    <div className="nutri">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>{dayLabel}</h2>
            <p className="muted">
              {left >= 0 ? `Te quedan ${fmt1(left)} kcal` : `Te pasaste ${fmt1(-left)} kcal`} · {entries.length} alimentos
            </p>
          </div>
          <div className="week-nav">
            <button className="btn ghost" onClick={() => shift(-1)} aria-label="Día anterior">
              ‹
            </button>
            <button className="btn ghost" onClick={() => setDate(todayISO)} disabled={date === todayISO}>
              Hoy
            </button>
            <button className="btn ghost" onClick={() => shift(1)} aria-label="Día siguiente">
              ›
            </button>
          </div>
        </div>
        <MacroBars consumed={consumed} targets={data.targets} />
      </section>

      <div className="two-col">
        <AddFoodForm foods={data.foods} date={date} onAdd={addEntries} />

        <section className="card">
          <div className="card-head">
            <h2>Comidas</h2>
            <button className="btn ghost small" onClick={copyPrevious}>
              ⧉ Copiar día anterior
            </button>
          </div>
          {MEALS.map((meal) => {
            const items = entries.filter((e) => e.meal === meal);
            const total = sumMacros(items);
            return (
              <div key={meal} className="meal">
                <div className="meal-head">
                  <strong>
                    {MEAL_ICON[meal]} {MEAL_LABEL[meal]}
                  </strong>
                  <span className="muted small">
                    {fmt1(total.kcal)} kcal · P {fmt1(total.protein)} · C {fmt1(total.carbs)} · G {fmt1(total.fat)}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="muted small meal-empty">Sin alimentos</p>
                ) : (
                  <ul className="food-list">
                    {items.map((e) => (
                      <li key={e.id}>
                        <div>
                          <span className="food-name">{e.name}</span>
                          <span className="muted small">
                            {' '}
                            · {fmt1(e.amount)} {UNIT_LABEL[e.unit]}
                          </span>
                          <div className="muted small">
                            P {fmt1(e.protein)} g · C {fmt1(e.carbs)} g · G {fmt1(e.fat)} g
                            {e.fiber > 0 && ` · Fibra ${fmt1(e.fiber)} g`}
                          </div>
                        </div>
                        <strong className="food-kcal">{fmt1(e.kcal)} kcal</strong>
                        <button className="btn icon" onClick={() => remove(e.id)} aria-label={`Quitar ${e.name}`}>
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Últimos 7 días</h2>
            <p className="muted small">Calorías por día · la línea es tu objetivo ({fmt1(data.targets.kcal)} kcal)</p>
          </div>
          <div className="mini-stats">
            <div>
              <span className="muted small">Promedio kcal</span>
              <strong>{fmt1(Math.round(avg('kcal')))}</strong>
            </div>
            <div>
              <span className="muted small">Promedio proteína</span>
              <strong>{fmt1(Math.round(avg('protein')))} g</strong>
            </div>
            <div>
              <span className="muted small">Días registrados</span>
              <strong>{logged.length}/7</strong>
            </div>
          </div>
        </div>
        <div className="stat-chart fin-chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={week} margin={{ top: 12, right: 8, bottom: 0, left: -8 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#898781' }} />
              <Tooltip cursor={{ className: 'chart-cursor' }} content={<WeekTip target={data.targets.kcal} />} isAnimationActive={false} />
              <ReferenceLine y={data.targets.kcal} className="ref-line" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <Bar dataKey="kcal" className="bar-kcal" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
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
    <div className="chart-tip">
      <div className="chart-tip-title">{p.detail}</div>
      <div>
        <strong>{fmt1(p.kcal)} kcal</strong> <span className="muted">({target ? Math.round((p.kcal / target) * 100) : 0}%)</span>
      </div>
      <div className="muted">
        P {fmt1(p.protein)} g · C {fmt1(p.carbs)} g · G {fmt1(p.fat)} g
      </div>
    </div>
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
      onAdd([{ id: newId(), date, meal, name: food.name, amount: nAmount, unit: food.unit, foodId: food.id, ...macrosFor(food, nAmount) }]);
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
          id: newId(), date, meal, name: quick.name.trim(), amount: 1, unit: 'unidad',
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
    <section className="card">
      <h2>Agregar alimento</h2>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <span>Comida</span>
          <div className="segmented grid2">
            {MEALS.map((m) => (
              <button type="button" key={m} className={meal === m ? 'active' : ''} onClick={() => setMeal(m)}>
                {MEAL_ICON[m]} {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="segmented">
          <button type="button" className={mode === 'lista' ? 'active' : ''} onClick={() => setMode('lista')}>
            De mi lista
          </button>
          <button type="button" className={mode === 'rapido' ? 'active' : ''} onClick={() => setMode('rapido')}>
            Registro rápido
          </button>
        </div>

        {mode === 'lista' ? (
          <>
            <label className="field">
              <span>Buscar alimento</span>
              <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. pollo, arepa, avena…" />
            </label>
            <ul className="food-picker" role="listbox" aria-label="Alimentos">
              {filtered.length === 0 && <li className="muted small">No hay coincidencias. Agrégalo en “Alimentos”.</li>}
              {filtered.map((f) => (
                <li key={f.id}>
                  <button type="button" role="option" aria-selected={f.id === foodId} className={f.id === foodId ? 'selected' : ''} onClick={() => pick(f)}>
                    <span>{f.name}</span>
                    <span className="muted small">
                      {fmt1(f.kcal)} kcal / {f.per} {UNIT_LABEL[f.unit]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {food && (
              <label className="field">
                <span>
                  Cantidad de “{food.name}” ({UNIT_LABEL[food.unit]})
                </span>
                <input className="input amount-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {preview && (
                  <span className="hint">
                    <strong>{fmt1(preview.kcal)} kcal</strong> · P {fmt1(preview.protein)} g · C {fmt1(preview.carbs)} g · G {fmt1(preview.fat)} g
                    {preview.fiber > 0 && ` · Fibra ${fmt1(preview.fiber)} g`}
                  </span>
                )}
              </label>
            )}
          </>
        ) : (
          <>
            <label className="field">
              <span>¿Qué comiste?</span>
              <input className="input" {...q('name')} placeholder="Ej. Empanada de queso" />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Proteína (g)</span>
                <input className="input" inputMode="decimal" {...q('protein')} />
              </label>
              <label className="field">
                <span>Carbos (g)</span>
                <input className="input" inputMode="decimal" {...q('carbs')} />
              </label>
              <label className="field">
                <span>Grasa (g)</span>
                <input className="input" inputMode="decimal" {...q('fat')} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Calorías</span>
                <input
                  className="input"
                  inputMode="decimal"
                  {...q('kcal')}
                  placeholder={`${kcalFromMacros(parseAmount(quick.protein) || 0, parseAmount(quick.carbs) || 0, parseAmount(quick.fat) || 0)} (auto)`}
                />
              </label>
              <label className="field">
                <span>Fibra (g)</span>
                <input className="input" inputMode="decimal" {...q('fiber')} />
              </label>
            </div>
            <span className="hint">Si dejas las calorías vacías se calculan de los macros (4 · 4 · 9).</span>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn primary">
            Agregar a {MEAL_LABEL[meal].toLowerCase()}
          </button>
        </div>
      </form>
    </section>
  );
}
