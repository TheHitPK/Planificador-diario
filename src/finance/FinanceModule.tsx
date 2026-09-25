import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from '../lib/storage';
import type { FinanceData, Movement, Rates } from './types';
import { fetchBcvRates } from './rates';
import { toISO, today } from '../lib/dates';
import FinanceSummary from './FinanceSummary';
import MovementsPage from './MovementsPage';

type SubTab = 'resumen' | 'entrada' | 'salida';

interface Props {
  data: FinanceData;
  setMovements: (fn: (prev: Movement[]) => Movement[]) => void;
  setRates: (r: Rates) => void;
  setRateHistory: (fn: (prev: FinanceData['rateHistory']) => FinanceData['rateHistory']) => void;
}

export type RateStatus = { state: 'idle' | 'loading' } | { state: 'error'; message: string };

export default function FinanceModule({ data, setMovements, setRates, setRateHistory }: Props) {
  const [tab, setTab] = useLocalStorage<SubTab>('pd.fin.tab', 'resumen');
  const [rateStatus, setRateStatus] = useState<RateStatus>({ state: 'idle' });

  const saveRates = useCallback(
    (r: Rates) => {
      setRates(r);
      setRateHistory((prev) => ({ ...prev, [r.date]: { usd: r.usd, eur: r.eur } }));
    },
    [setRates, setRateHistory],
  );

  const refreshRates = useCallback(async () => {
    setRateStatus({ state: 'loading' });
    try {
      saveRates(await fetchBcvRates());
      setRateStatus({ state: 'idle' });
    } catch {
      setRateStatus({ state: 'error', message: 'No se pudo obtener la tasa BCV. Revisa tu conexión o escríbela a mano.' });
    }
  }, [saveRates]);

  // Al abrir el módulo, actualiza la tasa si no hay o si es de un día anterior.
  useEffect(() => {
    const r = data.rates;
    if (!r || r.date < toISO(today())) void refreshRates();
    // Solo al montar el módulo
  }, []);

  const addMovements = (items: Movement[]) => setMovements((prev) => [...prev, ...items]);
  const updateMovement = (m: Movement) => setMovements((prev) => prev.map((x) => (x.id === m.id ? m : x)));
  const deleteMovement = (m: Movement) =>
    setMovements((prev) => prev.filter((x) => x.id !== m.id && !(m.linkId && x.linkId === m.linkId)));

  const pageProps = {
    data,
    onAdd: addMovements,
    onUpdate: updateMovement,
    onDelete: deleteMovement,
  };

  return (
    <div className="finance">
      <div className="subtabs" role="tablist">
        {(
          [
            ['resumen', '📊 Resumen'],
            ['entrada', '⬇ Entradas'],
            ['salida', '⬆ Salidas'],
          ] as [SubTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`chip big ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <FinanceSummary data={data} rateStatus={rateStatus} onRefreshRates={refreshRates} onSaveRates={saveRates} />
      )}
      {tab === 'entrada' && <MovementsPage kind="entrada" {...pageProps} />}
      {tab === 'salida' && <MovementsPage kind="salida" {...pageProps} />}
    </div>
  );
}
