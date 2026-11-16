import { useState, type FormEvent } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { diffDays, formatDM, fromISO, toISO, today } from '../lib/dates';
import { useLocalStorage } from '../lib/storage';
import { CalendarIcon, GridIcon, ListIcon } from './Icons';
import {
  Button, Card, CardHead, CardTitle, Chip, Empty, Field, FieldRow, FormActions, Input, List, ListItem, Segmented, SegmentedOption,
  Select, Tag, Textarea, TwoCol, cn, formClass, type TagTone,
} from '../ui';

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

const PRIORITY_TONE: Record<TaskPriority, TagTone> = { alta: 'bad', media: 'warn', baja: 'neutral' };
const DEADLINE_TONE: Record<string, string> = { late: 'text-bad-ink', soon: 'text-warn-ink', normal: 'text-ink-2', ok: 'text-good-ink' };
const STATUS_TONE: Record<TaskStatus, string> = { pendiente: '', en_progreso: 'text-accent-text', completada: 'text-good-ink' };

/** Franja superior de la tarjeta según la prioridad (la etiqueta lo dice también con texto). */
const PRIORITY_EDGE: Record<TaskPriority, string> = { alta: 'border-t-bad', media: 'border-t-warn', baja: 'border-t-axis' };

type View = 'lista' | 'tarjetas';

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
  onCreate: (draft: Omit<Task, 'id'>) => void;
  onUpdate: (id: string, draft: Omit<Task, 'id'>) => void;
  onStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

function deadlineInfo(task: Task) {
  if (task.status === 'completada') return { text: 'Hecha', tone: 'ok' };
  const days = diffDays(today(), fromISO(task.deadline));
  if (days < 0) return { text: `Vencida hace ${-days} ${-days === 1 ? 'día' : 'días'}`, tone: 'late' };
  if (days === 0) return { text: 'Vence hoy', tone: 'soon' };
  if (days <= 3) return { text: `Quedan ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'soon' };
  return { text: `Quedan ${days} días`, tone: 'normal' };
}

export default function TasksModule({ tasks, onCreate, onUpdate, onStatus, onDelete }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('activas');
  const [view, setView] = useLocalStorage<View>('pd.tasks.view', 'lista');

  const save = (e: FormEvent) => {
    e.preventDefault();
    const clean = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    if (!clean.name || !clean.deadline) return;
    if (editingId) onUpdate(editingId, clean);
    else onCreate(clean);
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
    onDelete(t.id);
    if (editingId === t.id) cancel();
  };

  const setStatus = (t: Task, status: TaskStatus) => onStatus(t.id, status);

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
    <TwoCol>
      <Card>
        <CardTitle>{editingId ? 'Editar pendiente' : 'Nuevo pendiente'}</CardTitle>
        <form className={formClass} onSubmit={save}>
          <Field label="Nombre de la actividad">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej. Reparar la licuadora"
              required
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Detalles, a quién entregar, materiales…"
            />
          </Field>
          <FieldRow>
            <Field label="Estado">
              <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridad">
              <Select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}>
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>
          <Field label="Plazo (fecha límite)">
            <Input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} required />
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
        <CardHead>
          <h2>Pendientes</h2>
          <Segmented role="group" aria-label="Forma de ver los pendientes">
            <SegmentedOption active={view === 'lista'} onClick={() => setView('lista')}>
              <span className="inline-flex items-center gap-1.5">
                <ListIcon size={15} />
                Lista
              </span>
            </SegmentedOption>
            <SegmentedOption active={view === 'tarjetas'} onClick={() => setView('tarjetas')}>
              <span className="inline-flex items-center gap-1.5">
                <GridIcon size={15} />
                Tarjetas
              </span>
            </SegmentedOption>
          </Segmented>
        </CardHead>
        <div className="mb-3.5 flex flex-wrap gap-1.5" role="tablist">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} role="tab" aria-selected={filter === f.id}>
              {f.label} <span className="opacity-75">{counts[f.id]}</span>
            </Chip>
          ))}
        </div>

        {visible.length === 0 ? (
          <Empty>No hay pendientes en este filtro.</Empty>
        ) : (
          // key={view}: al cambiar de vista los elementos vuelven a entrar escalonados.
          <List key={view} className={cn(view === 'tarjetas' && 'grid gap-3 sm:grid-cols-2')}>
            {visible.map((t, i) => {
              const dl = deadlineInfo(t);
              const done = t.status === 'completada';

              const name = <strong className={cn(done && 'text-muted line-through')}>{t.name}</strong>;
              const priority = <Tag tone={PRIORITY_TONE[t.priority]}>Prioridad {PRIORITY_LABEL[t.priority].toLowerCase()}</Tag>;
              const deadline = (
                <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold', DEADLINE_TONE[dl.tone])}>
                  <CalendarIcon size={14} />
                  {formatDM(fromISO(t.deadline))} · {dl.text}
                </span>
              );
              const status = (
                <Select
                  className={cn('min-h-9 w-auto px-2 py-1 text-[13px] md:min-h-8 md:text-[13px]', STATUS_TONE[t.status])}
                  value={t.status}
                  onChange={(e) => setStatus(t, e.target.value as TaskStatus)}
                  aria-label={`Cambiar estado de ${t.name}`}
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              );
              const actions = (
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => edit(t)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(t)}>
                    Eliminar
                  </Button>
                </div>
              );

              if (view === 'tarjetas') {
                return (
                  <ListItem
                    key={t.id}
                    index={i}
                    editing={editingId === t.id}
                    className={cn('flex-col flex-nowrap items-stretch gap-2.5 border-t-[3px] p-4', PRIORITY_EDGE[t.priority])}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {priority}
                      {deadline}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base leading-snug">{name}</span>
                      {t.description && <p className="line-clamp-3 text-[13px] text-ink-2">{t.description}</p>}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-grid pt-2.5">
                      {status}
                      {actions}
                    </div>
                  </ListItem>
                );
              }

              return (
                <ListItem key={t.id} index={i} editing={editingId === t.id}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {name}
                      {priority}
                    </div>
                    {t.description && <p className="text-[13px] text-ink-2">{t.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                      {deadline}
                      {status}
                    </div>
                  </div>
                  {actions}
                </ListItem>
              );
            })}
          </List>
        )}
      </Card>
    </TwoCol>
  );
}
