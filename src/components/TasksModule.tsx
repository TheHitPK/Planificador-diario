import { useState, type FormEvent } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { newId } from '../lib/storage';
import { diffDays, formatDM, fromISO, toISO, today } from '../lib/dates';

const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };
const STATUS_ORDER: Record<TaskStatus, number> = { en_progreso: 0, pendiente: 1, completada: 2 };

type Draft = Omit<Task, 'id'>;
const emptyDraft = (): Draft => ({
  name: '',
  description: '',
  status: 'pendiente',
  priority: 'media',
  deadline: toISO(today()),
});

type Filter = 'activas' | TaskStatus | 'todas';

interface Props {
  tasks: Task[];
  onChange: (next: Task[]) => void;
}

function deadlineInfo(task: Task) {
  if (task.status === 'completada') return { text: 'Hecha', tone: 'ok' };
  const days = diffDays(today(), fromISO(task.deadline));
  if (days < 0) return { text: `Vencida hace ${-days} ${-days === 1 ? 'día' : 'días'}`, tone: 'late' };
  if (days === 0) return { text: 'Vence hoy', tone: 'soon' };
  if (days <= 3) return { text: `Quedan ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'soon' };
  return { text: `Quedan ${days} días`, tone: 'normal' };
}

export default function TasksModule({ tasks, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('activas');

  const save = (e: FormEvent) => {
    e.preventDefault();
    const clean = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    if (!clean.name || !clean.deadline) return;
    if (editingId) onChange(tasks.map((t) => (t.id === editingId ? { ...t, ...clean } : t)));
    else onChange([...tasks, { id: newId(), ...clean }]);
    cancel();
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const edit = (t: Task) => {
    setEditingId(t.id);
    setDraft({ name: t.name, description: t.description, status: t.status, priority: t.priority, deadline: t.deadline });
  };

  const remove = (t: Task) => {
    if (!confirm(`¿Eliminar “${t.name}”?`)) return;
    onChange(tasks.filter((x) => x.id !== t.id));
    if (editingId === t.id) cancel();
  };

  const setStatus = (t: Task, status: TaskStatus) => onChange(tasks.map((x) => (x.id === t.id ? { ...x, status } : x)));

  const visible = tasks
    .filter((t) =>
      filter === 'todas' ? true : filter === 'activas' ? t.status !== 'completada' : t.status === filter,
    )
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.deadline.localeCompare(b.deadline) ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );

  const counts = {
    activas: tasks.filter((t) => t.status !== 'completada').length,
    pendiente: tasks.filter((t) => t.status === 'pendiente').length,
    en_progreso: tasks.filter((t) => t.status === 'en_progreso').length,
    completada: tasks.filter((t) => t.status === 'completada').length,
    todas: tasks.length,
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'activas', label: 'Activas' },
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'en_progreso', label: 'En progreso' },
    { id: 'completada', label: 'Completadas' },
    { id: 'todas', label: 'Todas' },
  ];

  return (
    <div className="two-col">
      <section className="card">
        <h2>{editingId ? 'Editar pendiente' : 'Nuevo pendiente'}</h2>
        <form className="form" onSubmit={save}>
          <label className="field">
            <span>Nombre de la actividad</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej. Reparar la licuadora"
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
              placeholder="Detalles, a quién entregar, materiales…"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Estado</span>
              <select
                className="input"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridad</span>
              <select
                className="input"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
              >
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Plazo (fecha límite)</span>
            <input
              type="date"
              className="input"
              value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
              required
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
        <h2>Pendientes</h2>
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
              role="tab"
              aria-selected={filter === f.id}
            >
              {f.label} <span className="chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty">No hay nada aquí.</p>
        ) : (
          <ul className="list">
            {visible.map((t) => {
              const dl = deadlineInfo(t);
              return (
                <li key={t.id} className={`list-item task ${t.status === 'completada' ? 'done' : ''}`}>
                  <div className="list-body">
                    <div className="task-top">
                      <strong className="task-name">{t.name}</strong>
                      <span className={`tag prio-${t.priority}`}>Prioridad {PRIORITY_LABEL[t.priority].toLowerCase()}</span>
                    </div>
                    {t.description && <p className="muted small">{t.description}</p>}
                    <div className="task-meta">
                      <span className={`deadline dl-${dl.tone}`}>
                        📅 {formatDM(fromISO(t.deadline))} · {dl.text}
                      </span>
                      <select
                        className={`input status-select st-${t.status}`}
                        value={t.status}
                        onChange={(e) => setStatus(t, e.target.value as TaskStatus)}
                        aria-label="Cambiar estado"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="list-actions">
                    <button className="btn ghost small" onClick={() => edit(t)}>
                      Editar
                    </button>
                    <button className="btn danger small" onClick={() => remove(t)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
