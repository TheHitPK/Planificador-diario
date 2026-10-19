import { useCallback, useMemo, useRef, useState } from 'react';
import type { BodyEntry, Food, LogEntry, NutritionData, Profile, Targets } from '../../nutrition/types';
import { DEFAULT_TARGETS } from '../../nutrition/defaults';
import { api } from '../client';
import {
  fromBody, fromFood, fromLogEntry, fromProfile, fromTargets, toBody, toFood, toLogEntry, toProfile, toTargets,
  type ApiBody, type ApiFood, type ApiLogEntry, type ApiProfile,
} from '../mappers';
import { addDays, fromISO, toISO, today } from '../../lib/dates';
import { useToast } from '../../components/Toaster';

/** Días de comidas que se cargan al entrar; el resto se pide al navegar. */
const INITIAL_DAYS = 60;

export function useNutritionStore() {
  const notify = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [body, setBody] = useState<BodyEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const loadedDays = useRef(new Set<string>());

  const fetchLog = useCallback(async (from: string, to: string) => {
    const entries = (await api.get<ApiLogEntry[]>(`/nutrition/diary/entries?from=${from}&to=${to}`)).map(toLogEntry);
    setLog((prev) => [...prev.filter((e) => e.date < from || e.date > to), ...entries]);
    for (let d = fromISO(from); d <= fromISO(to); d = addDays(d, 1)) loadedDays.current.add(toISO(d));
  }, []);

  const load = useCallback(async () => {
    loadedDays.current.clear();
    const t = today();
    const [foodList, bodySummary, prof] = await Promise.all([
      api.get<ApiFood[]>('/nutrition/foods'),
      api.get<{ history: ApiBody[] }>('/nutrition/body'),
      api.get<ApiProfile>('/nutrition/profile'),
      fetchLog(toISO(addDays(t, -INITIAL_DAYS)), toISO(t)),
    ]);
    setFoods(foodList.map(toFood));
    setBody(bodySummary.history.map(toBody));
    setProfile(toProfile(prof));
    setTargets(toTargets(prof.targets));
  }, [fetchLog]);

  const ensureRange = useCallback(
    (from: string, to: string) => {
      for (let d = fromISO(from); d <= fromISO(to); d = addDays(d, 1)) {
        if (!loadedDays.current.has(toISO(d))) {
          fetchLog(from, to).catch((e: Error) => notify(e.message));
          return;
        }
      }
    },
    [fetchLog, notify],
  );

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  // ---- Diario ----
  const addEntries = useCallback(
    (items: LogEntry[]) =>
      run(async () => {
        const created = await Promise.all(items.map((e) => api.post<ApiLogEntry>('/nutrition/diary/entries', fromLogEntry(e))));
        setLog((prev) => [...prev, ...created.map(toLogEntry)]);
      }),
    [run],
  );

  const removeEntry = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/nutrition/diary/entries/${id}`);
        setLog((prev) => prev.filter((e) => e.id !== id));
      }),
    [run],
  );

  const copyDay = useCallback(
    (from: string, to: string) =>
      run(async () => {
        const created = await api.post<ApiLogEntry[]>('/nutrition/diary/copy', { from, to });
        setLog((prev) => [...prev, ...created.map(toLogEntry)]);
      }),
    [run],
  );

  // ---- Alimentos ----
  const saveFood = useCallback(
    (food: Food, isNew: boolean) =>
      run(async () => {
        const saved = toFood(
          isNew
            ? await api.post<ApiFood>('/nutrition/foods', fromFood(food))
            : await api.put<ApiFood>(`/nutrition/foods/${food.id}`, fromFood(food)),
        );
        setFoods((prev) => (isNew ? [...prev, saved] : prev.map((f) => (f.id === saved.id ? saved : f))));
      }),
    [run],
  );

  const deleteFood = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/nutrition/foods/${id}`);
        setFoods((prev) => prev.filter((f) => f.id !== id));
      }),
    [run],
  );

  // ---- Cuerpo ----
  const upsertBody = useCallback(
    (entry: BodyEntry) =>
      run(async () => {
        const saved = toBody(await api.put<ApiBody>('/nutrition/body', fromBody(entry)));
        setBody((prev) => [...prev.filter((b) => b.date !== saved.date), saved]);
      }),
    [run],
  );

  const deleteBody = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/nutrition/body/${id}`);
        setBody((prev) => prev.filter((b) => b.id !== id));
      }),
    [run],
  );

  // ---- Perfil y objetivos ----
  const saveProfile = useCallback(
    (p: Profile) =>
      run(async () => {
        setProfile(toProfile(await api.put<ApiProfile>('/nutrition/profile', fromProfile(p))));
      }),
    [run],
  );

  const saveTargets = useCallback(
    (t: Targets) =>
      run(async () => {
        setTargets(toTargets((await api.put<ApiProfile>('/nutrition/profile/targets', fromTargets(t))).targets));
      }),
    [run],
  );

  const data: NutritionData = useMemo(() => ({ foods, log, body, profile, targets }), [foods, log, body, profile, targets]);

  return {
    data, load, ensureRange, addEntries, removeEntry, copyDay, saveFood, deleteFood, upsertBody, deleteBody,
    saveProfile, saveTargets,
  };
}
