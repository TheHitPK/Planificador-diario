import { useState, type FormEvent } from 'react';
import type { Food, FoodUnit } from './types';
import { fmt1, kcalFromMacros } from './calc';
import { parseAmount } from '../finance/calc';

interface Props {
  foods: Food[];
  onSave: (food: Food, isNew: boolean) => void;
  onDelete: (id: string) => void;
}

type Draft = Record<'name' | 'per' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', string> & { unit: FoodUnit };
const EMPTY: Draft = { name: '', per: '100', unit: 'g', kcal: '', protein: '', carbs: '', fat: '', fiber: '' };

const UNIT_LABEL: Record<FoodUnit, string> = { g: 'gramos', ml: 'mililitros', unidad: 'unidad(es)' };

export default function FoodsPage({ foods, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const n = (k: keyof Draft) => parseAmount(String(draft[k])) || 0;
  const autoKcal = kcalFromMacros(n('protein'), n('carbs'), n('fat'));

  const save = (e: FormEvent) => {
    e.preventDefault();
    const per = parseAmount(draft.per);
    if (!draft.name.trim()) return setError('Escribe el nombre.');
    if (!(per > 0)) return setError('La porción debe ser mayor que 0.');
    const kcal = parseAmount(draft.kcal) > 0 ? parseAmount(draft.kcal) : autoKcal;
    const food: Food = {
      id: editingId ?? '',
      name: draft.name.trim(),
      per,
      unit: draft.unit,
      kcal,
      protein: n('protein'),
      carbs: n('carbs'),
      fat: n('fat'),
      fiber: n('fiber'),
    };
    onSave(food, !editingId);
    cancel();
  };

  const edit = (f: Food) => {
    setEditingId(f.id);
    setDraft({
      name: f.name, per: String(f.per), unit: f.unit, kcal: String(f.kcal), protein: String(f.protein),
      carbs: String(f.carbs), fat: String(f.fat), fiber: String(f.fiber),
    });
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setError('');
  };

  const remove = (f: Food) => {
    if (!confirm(`¿Eliminar “${f.name}” de tu lista? Lo que ya registraste no cambia.`)) return;
    onDelete(f.id);
    if (editingId === f.id) cancel();
  };

  const field = (k: keyof Draft) => ({
    value: String(draft[k]),
    onChange: (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value }),
  });

  const visible = foods
    .filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="two-col">
      <section className="card">
        <h2>{editingId ? 'Editar alimento' : 'Nuevo alimento'}</h2>
        <form className="form" onSubmit={save}>
          <label className="field">
            <span>Nombre</span>
            <input className="input" {...field('name')} placeholder="Ej. Pan árabe integral" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Valores por</span>
              <input className="input" inputMode="decimal" {...field('per')} />
            </label>
            <label className="field">
              <span>Unidad</span>
              <select className="input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as FoodUnit })}>
                {(Object.keys(UNIT_LABEL) as FoodUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Proteína (g)</span>
              <input className="input" inputMode="decimal" {...field('protein')} />
            </label>
            <label className="field">
              <span>Carbos (g)</span>
              <input className="input" inputMode="decimal" {...field('carbs')} />
            </label>
            <label className="field">
              <span>Grasa (g)</span>
              <input className="input" inputMode="decimal" {...field('fat')} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Calorías</span>
              <input className="input" inputMode="decimal" {...field('kcal')} placeholder={`${autoKcal} (auto)`} />
            </label>
            <label className="field">
              <span>Fibra (g)</span>
              <input className="input" inputMode="decimal" {...field('fiber')} />
            </label>
          </div>
          <span className="hint">Copia los valores de la etiqueta nutricional. Si dejas las calorías vacías se calculan de los macros.</span>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn primary">
              {editingId ? 'Guardar cambios' : 'Agregar'}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={cancel}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Mis alimentos ({foods.length})</h2>
          <input className="input search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
        </div>
        <div className="table-wrap">
          <table className="grid foods-table">
            <thead>
              <tr>
                <th className="col-day">Alimento</th>
                <th>Porción</th>
                <th>kcal</th>
                <th>Prot.</th>
                <th>Carbos</th>
                <th>Grasa</th>
                <th>Fibra</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.id} className={editingId === f.id ? 'is-today' : ''}>
                  <th scope="row" className="col-day">
                    {f.name}
                  </th>
                  <td>
                    {fmt1(f.per)} {f.unit === 'unidad' ? 'u' : f.unit}
                  </td>
                  <td>{fmt1(f.kcal)}</td>
                  <td>{fmt1(f.protein)}</td>
                  <td>{fmt1(f.carbs)}</td>
                  <td>{fmt1(f.fat)}</td>
                  <td>{fmt1(f.fiber)}</td>
                  <td className="row-actions">
                    {f.global ? (
                      <span className="muted small" title="Catálogo compartido: crea uno propio para ajustar los valores">
                        Catálogo
                      </span>
                    ) : (
                      <>
                        <button className="btn ghost small" onClick={() => edit(f)}>
                          Editar
                        </button>
                        <button className="btn danger small" onClick={() => remove(f)}>
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small note">Valores iniciales aproximados. Ajústalos a las marcas que compras.</p>
      </section>
    </div>
  );
}
