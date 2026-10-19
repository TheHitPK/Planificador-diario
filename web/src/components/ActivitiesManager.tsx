import { useState, type FormEvent } from 'react';
import type { Activity } from '../types';
import { ArrowDownIcon, ArrowUpIcon } from './Icons';
import {
  Button, Card, CardTitle, Empty, Field, FormActions, IconBadge, Input, List, ListItem, Textarea, TwoCol, cn, formClass,
} from '../ui';

const ICONS = ['📚', '💧', '🏋️', '🛡️', '⏰', '🏃', '🧘', '🥗', '😴', '💻', '✍️', '🎸', '🙏', '🧹', '💰', '🚭', '📵', '🦷', '☀️', '🧠'];

interface Props {
  activities: Activity[];
  onCreate: (draft: Omit<Activity, 'id'>) => void;
  onUpdate: (id: string, draft: Omit<Activity, 'id'>) => void;
  onDelete: (id: string) => void;
  onReorder: (ordered: Activity[]) => void;
}

type Draft = Omit<Activity, 'id'>;
const EMPTY: Draft = { icon: '📚', name: '', description: '' };

export default function ActivitiesManager({ activities, onCreate, onUpdate, onDelete, onReorder }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const clean = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    if (!clean.name) return;
    if (editingId) onUpdate(editingId, clean);
    else onCreate(clean);
    cancel();
  };

  const edit = (a: Activity) => {
    setEditingId(a.id);
    setDraft({ icon: a.icon, name: a.name, description: a.description });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const remove = (a: Activity) => {
    if (!confirm(`¿Eliminar “${a.name}”? Dejará de aparecer en la tabla y en las estadísticas.`)) return;
    onDelete(a.id);
    if (editingId === a.id) cancel();
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= activities.length) return;
    const next = [...activities];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <TwoCol>
      <Card>
        <CardTitle>{editingId ? 'Editar disciplina' : 'Nueva disciplina'}</CardTitle>
        <form className={formClass} onSubmit={save}>
          <Field label="Icono" as="div">
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={cn(
                    'aspect-square rounded-[9px] border text-lg transition duration-150 ease-spring hover:scale-112',
                    draft.icon === ic ? 'border-accent bg-accent/10' : 'border-transparent bg-surface-2 hover:border-line',
                  )}
                  onClick={() => setDraft({ ...draft, icon: ic })}
                  aria-label={`Icono ${ic}`}
                  aria-pressed={draft.icon === ic}
                >
                  {ic}
                </button>
              ))}
            </div>
            <Input
              className="w-[140px]"
              value={draft.icon}
              maxLength={4}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="O escribe un emoji"
              aria-label="Icono personalizado"
            />
          </Field>
          <Field label="Nombre">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej. Meditar 10 min"
              required
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Detalle de la disciplina"
            />
          </Field>
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
        <CardTitle>Mis disciplinas ({activities.length})</CardTitle>
        {activities.length === 0 ? (
          <Empty>Todavía no hay disciplinas. Agrega la primera con el formulario.</Empty>
        ) : (
          <List>
            {activities.map((a, i) => (
              <ListItem key={a.id} index={i} editing={editingId === a.id}>
                <IconBadge>{a.icon}</IconBadge>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong>{a.name}</strong>
                  {a.description && <p className="text-[13px] text-ink-2">{a.description}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                    <ArrowUpIcon size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(i, 1)}
                    disabled={i === activities.length - 1}
                    aria-label="Bajar"
                  >
                    <ArrowDownIcon size={15} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => edit(a)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(a)}>
                    Eliminar
                  </Button>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </TwoCol>
  );
}
