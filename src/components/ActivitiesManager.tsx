import { useState, type FormEvent } from 'react';
import type { Activity } from '../types';

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
    <div className="two-col">
      <section className="card">
        <h2>{editingId ? 'Editar disciplina' : 'Nueva disciplina'}</h2>
        <form className="form" onSubmit={save}>
          <label className="field">
            <span>Icono</span>
            <div className="icon-picker">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`icon-opt ${draft.icon === ic ? 'selected' : ''}`}
                  onClick={() => setDraft({ ...draft, icon: ic })}
                  aria-label={`Icono ${ic}`}
                >
                  {ic}
                </button>
              ))}
            </div>
            <input
              className="input icon-input"
              value={draft.icon}
              maxLength={4}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="O escribe un emoji"
            />
          </label>
          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej. Meditar 10 min"
              required
            />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea
              className="input"
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Detalle de la disciplina"
            />
          </label>
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
        <h2>Mis disciplinas ({activities.length})</h2>
        {activities.length === 0 ? (
          <p className="empty">Todavía no hay disciplinas.</p>
        ) : (
          <ul className="list">
            {activities.map((a, i) => (
              <li key={a.id} className={`list-item ${editingId === a.id ? 'editing' : ''}`}>
                <span className="list-icon" aria-hidden>
                  {a.icon}
                </span>
                <div className="list-body">
                  <strong>{a.name}</strong>
                  {a.description && <p className="muted small">{a.description}</p>}
                </div>
                <div className="list-actions">
                  <button className="btn icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                    ↑
                  </button>
                  <button
                    className="btn icon"
                    onClick={() => move(i, 1)}
                    disabled={i === activities.length - 1}
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                  <button className="btn ghost small" onClick={() => edit(a)}>
                    Editar
                  </button>
                  <button className="btn danger small" onClick={() => remove(a)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
