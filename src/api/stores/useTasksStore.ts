import { useCallback, useState } from 'react';
import type { Task, TaskStatus } from '../../types';
import { api } from '../client';
import { fromTask, taskStatusToApi, toTask, type ApiTask } from '../mappers';
import { useToast } from '../../components/Toaster';

type Draft = Omit<Task, 'id'>;

export function useTasksStore() {
  const notify = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    const list = await api.get<ApiTask[]>('/tasks?status=PENDING&status=IN_PROGRESS&status=COMPLETED');
    setTasks(list.map(toTask));
  }, []);

  const replace = (t: ApiTask) => setTasks((prev) => prev.map((x) => (x.id === t.id ? toTask(t) : x)));

  const create = useCallback(
    async (draft: Draft) => {
      try {
        const t = await api.post<ApiTask>('/tasks', fromTask(draft));
        setTasks((prev) => [...prev, toTask(t)]);
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const update = useCallback(
    async (id: string, draft: Draft) => {
      try {
        replace(await api.put<ApiTask>(`/tasks/${id}`, fromTask(draft)));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const setStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        replace(await api.patch<ApiTask>(`/tasks/${id}/status`, { status: taskStatusToApi(status) }));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.del(`/tasks/${id}`);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  return { tasks, load, create, update, setStatus, remove };
}
