import { useCallback, useMemo, useRef, useState } from 'react';
import type { Activity, Checks } from '../../types';
import { api } from '../client';
import { fromActivity, toActivity, type ApiDiscipline, type ApiPlanningRange } from '../mappers';
import { addDays, fromISO, toISO, today } from '../../lib/dates';
import { useToast } from '../../components/Toaster';

type Draft = Omit<Activity, 'id'>;

/** Disciplinas y días cumplidos. Los días se cargan por rangos a medida que se navega. */
export function usePlanningStore() {
  const notify = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checks, setChecks] = useState<Checks>({});
  const loadedDays = useRef(new Set<string>());

  const fetchRange = useCallback(async (from: string, to: string) => {
    const res = await api.get<ApiPlanningRange>(`/planning?from=${from}&to=${to}`);
    setChecks((prev) => {
      const next = { ...prev };
      for (const d of res.days) {
        if (d.completed.length) next[d.date] = d.completed;
        else delete next[d.date];
      }
      return next;
    });
    for (let d = fromISO(from); d <= fromISO(to); d = addDays(d, 1)) loadedDays.current.add(toISO(d));
  }, []);

  /** Carga inicial: disciplinas + el año en curso (lo que usan la tabla y las estadísticas). */
  const load = useCallback(async () => {
    loadedDays.current.clear();
    const year = today().getFullYear();
    const [list] = await Promise.all([
      api.get<ApiDiscipline[]>('/disciplines'),
      fetchRange(`${year}-01-01`, `${year}-12-31`),
    ]);
    setActivities(list.map(toActivity));
  }, [fetchRange]);

  /** Asegura que un rango (ej. una semana de otro año) esté cargado. */
  const ensureRange = useCallback(
    (from: string, to: string) => {
      for (let d = fromISO(from); d <= fromISO(to); d = addDays(d, 1)) {
        if (!loadedDays.current.has(toISO(d))) {
          fetchRange(from, to).catch((e: Error) => notify(e.message));
          return;
        }
      }
    },
    [fetchRange, notify],
  );

  /** Marca/desmarca al instante y revierte si la API falla. */
  const toggle = useCallback(
    (iso: string, activityId: string) => {
      const was = (checks[iso] ?? []).includes(activityId);
      const apply = (on: boolean) =>
        setChecks((prev) => {
          const current = prev[iso] ?? [];
          return { ...prev, [iso]: on ? [...new Set([...current, activityId])] : current.filter((id) => id !== activityId) };
        });
      apply(!was);
      const path = `/planning/${iso}/disciplines/${activityId}`;
      (was ? api.del(path) : api.put(path)).catch((e: Error) => {
        apply(was);
        notify(e.message);
      });
    },
    [checks, notify],
  );

  const createActivity = useCallback(
    async (draft: Draft) => {
      try {
        const d = await api.post<ApiDiscipline>('/disciplines', fromActivity(draft));
        setActivities((prev) => [...prev, toActivity(d)]);
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const updateActivity = useCallback(
    async (id: string, draft: Draft) => {
      try {
        const d = await api.put<ApiDiscipline>(`/disciplines/${id}`, fromActivity(draft));
        setActivities((prev) => prev.map((a) => (a.id === id ? toActivity(d) : a)));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      try {
        await api.del(`/disciplines/${id}`);
        setActivities((prev) => prev.filter((a) => a.id !== id));
        setChecks((prev) =>
          Object.fromEntries(Object.entries(prev).map(([day, ids]) => [day, ids.filter((x) => x !== id)])),
        );
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const reorder = useCallback(
    async (ordered: Activity[]) => {
      const previous = activities;
      setActivities(ordered);
      try {
        await api.put('/disciplines/order', { ids: ordered.map((a) => a.id) });
      } catch (e) {
        setActivities(previous);
        notify((e as Error).message);
      }
    },
    [activities, notify],
  );

  /** Las estadísticas cuentan desde el primer día con algo marcado. */
  const startISO = useMemo(() => {
    const days = Object.keys(checks).filter((d) => checks[d].length > 0).sort();
    return days[0] ?? toISO(today());
  }, [checks]);

  return { activities, checks, startISO, load, ensureRange, toggle, createActivity, updateActivity, deleteActivity, reorder };
}
