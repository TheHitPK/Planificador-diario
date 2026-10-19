import { useState, type FormEvent } from 'react';
import type { Food, FoodUnit } from './types';
import { fmt1, kcalFromMacros } from './calc';
import { parseAmount } from '../finance/calc';
import { XIcon } from '../components/Icons';
import {
  Button, Card, CardHead, CardTitle, ColHead, Field, FieldRow, FormActions, FormError, Hint, Input, Select, Table, Td, Th, Tr,
  TwoCol, formClass,
} from '../ui';

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
    <TwoCol>
      <Card>
        <CardTitle>{editingId ? 'Editar alimento' : 'Nuevo alimento'}</CardTitle>
        <form className={formClass} onSubmit={save}>
          <Field label="Nombre">
            <Input {...field('name')} placeholder="Ej. Pan árabe integral" />
          </Field>
          <FieldRow>
            <Field label="Valores por">
              <Input inputMode="decimal" {...field('per')} />
            </Field>
            <Field label="Unidad">
              <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as FoodUnit })}>
                {(Object.keys(UNIT_LABEL) as FoodUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Proteína (g)">
              <Input inputMode="decimal" {...field('protein')} />
            </Field>
            <Field label="Carbos (g)">
              <Input inputMode="decimal" {...field('carbs')} />
            </Field>
            <Field label="Grasa (g)">
              <Input inputMode="decimal" {...field('fat')} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Calorías">
              <Input inputMode="decimal" {...field('kcal')} placeholder={`${autoKcal} (auto)`} />
            </Field>
            <Field label="Fibra (g)">
              <Input inputMode="decimal" {...field('fiber')} />
            </Field>
          </FieldRow>
          <Hint>Copia los valores de la etiqueta nutricional. Si dejas las calorías vacías se calculan de los macros.</Hint>
          {error && <FormError>{error}</FormError>}
          <FormActions>
            <Button type="submit" variant="primary">
              {editingId ? 'Guardar cambios' : 'Agregar'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={cancel}>
                Cancelar
              </Button>
            )}
          </FormActions>
        </form>
      </Card>

      <Card delay={0.08}>
        <CardHead>
          <h2>Mis alimentos ({foods.length})</h2>
          <Input
            className="sm:w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar alimento"
          />
        </CardHead>
        <Table compact>
          <thead>
            <tr>
              <ColHead align="left">Alimento</ColHead>
              <ColHead>Porción</ColHead>
              <ColHead>kcal</ColHead>
              <ColHead>Prot.</ColHead>
              <ColHead>Carbos</ColHead>
              <ColHead>Grasa</ColHead>
              <ColHead>Fibra</ColHead>
              <ColHead />
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <Tr key={f.id} highlight={editingId === f.id}>
                <Th scope="row" align="left" className="font-semibold">
                  {f.name}
                </Th>
                <Td>
                  {fmt1(f.per)} {f.unit === 'unidad' ? 'u' : f.unit}
                </Td>
                <Td>{fmt1(f.kcal)}</Td>
                <Td>{fmt1(f.protein)}</Td>
                <Td>{fmt1(f.carbs)}</Td>
                <Td>{fmt1(f.fat)}</Td>
                <Td>{fmt1(f.fiber)}</Td>
                <Td align="right" className="whitespace-nowrap">
                  {f.global ? (
                    <span className="text-[13px] text-ink-2" title="Catálogo compartido: crea uno propio para ajustar los valores">
                      Catálogo
                    </span>
                  ) : (
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => edit(f)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => remove(f)} aria-label={`Eliminar ${f.name}`}>
                        <XIcon size={14} />
                      </Button>
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-3.5 text-[13px] text-ink-2">Valores iniciales aproximados. Ajústalos a las marcas que compras.</p>
      </Card>
    </TwoCol>
  );
}
