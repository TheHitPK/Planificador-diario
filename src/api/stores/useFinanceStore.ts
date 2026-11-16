import { useCallback, useMemo, useState } from 'react';
import type { FinanceData, Movement, Rates } from '../../finance/types';
import { ApiError, api } from '../client';
import {
  fromExchange, fromMovement, toMovement, toRates, type ApiMovement, type ApiRates,
} from '../mappers';
import { useToast } from '../../components/Toaster';

/**
 * Movimientos y tasas. Se cargan todos los movimientos: los saldos por cuenta y el
 * promedio de USDT dependen del historial completo (para uso personal es poco volumen).
 */
export function useFinanceStore() {
  const notify = useToast();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);

  const load = useCallback(async () => {
    const [list, current] = await Promise.all([
      api.get<ApiMovement[]>('/finance/movements?from=2000-01-01&to=2100-12-31'),
      api.get<ApiRates>('/finance/rates').catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
    ]);
    setMovements(list.map(toMovement));
    setRates(current ? toRates(current) : null);
  }, []);

  /** Tasas por día sacadas de los propios movimientos, para prellenar fechas pasadas. */
  const rateHistory = useMemo(() => {
    const h: FinanceData['rateHistory'] = {};
    for (const m of movements) h[m.date] ??= { usd: m.rateUsd, eur: m.rateEur };
    if (rates) h[rates.date] = { usd: rates.usd, eur: rates.eur };
    return h;
  }, [movements, rates]);

  /** Un movimiento normal, o los dos lados enlazados de un cambio de divisas. */
  const add = useCallback(
    async (items: Movement[]) => {
      try {
        if (items.length === 2 && items[0].linkId) {
          const out = items.find((m) => m.kind === 'salida')!;
          const inn = items.find((m) => m.kind === 'entrada')!;
          const res = await api.post<{ out: ApiMovement; in: ApiMovement }>('/finance/exchanges', fromExchange(out, inn));
          setMovements((prev) => [...prev, toMovement(res.out), toMovement(res.in)]);
        } else {
          const created = await Promise.all(items.map((m) => api.post<ApiMovement>('/finance/movements', fromMovement(m))));
          setMovements((prev) => [...prev, ...created.map(toMovement)]);
        }
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const update = useCallback(
    async (m: Movement) => {
      try {
        const res = await api.put<ApiMovement>(`/finance/movements/${m.id}`, fromMovement(m));
        setMovements((prev) => prev.map((x) => (x.id === m.id ? toMovement(res) : x)));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  /** El servidor borra también la contraparte de un cambio. */
  const remove = useCallback(
    async (m: Movement) => {
      try {
        await api.del(`/finance/movements/${m.id}`);
        setMovements((prev) => prev.filter((x) => x.id !== m.id && !(m.linkId && x.linkId === m.linkId)));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  /** Lanza el error para que la tarjeta de tasas muestre su propio mensaje. */
  const refreshRates = useCallback(async () => {
    setRates(toRates(await api.post<ApiRates>('/finance/rates/refresh')));
  }, []);

  const saveManualRates = useCallback(
    async (r: Rates) => {
      try {
        setRates(toRates(await api.put<ApiRates>('/finance/rates/manual', { date: r.date, usd: r.usd, eur: r.eur })));
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [notify],
  );

  const data: FinanceData = useMemo(() => ({ movements, rates, rateHistory }), [movements, rates, rateHistory]);

  return { data, load, add, update, remove, refreshRates, saveManualRates };
}
