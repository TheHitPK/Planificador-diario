import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocalStorage } from '../lib/storage';
import type { FinanceData, Movement, Rates } from './types';
import { toISO, today } from '../lib/dates';
import FinanceSummary from './FinanceSummary';
import MovementsPage from './MovementsPage';
import { ArrowDownIcon, ArrowUpIcon, BarChartIcon } from '../components/Icons';
import { Chip, Stack } from '../ui';

const SUBTABS: [SubTab, string, ReactNode][] = [
  ['resumen', 'Resumen', <BarChartIcon size={16} />],
  ['entrada', 'Entradas', <ArrowDownIcon size={16} />],
  ['salida', 'Salidas', <ArrowUpIcon size={16} />],
];

type SubTab = 'resumen' | 'entrada' | 'salida';

interface Props {
  data: FinanceData;
  onAdd: (items: Movement[]) => void;
  onUpdate: (m: Movement) => void;
  onDelete: (m: Movement) => void;
  /** Pide al servidor la tasa BCV del día. Lanza si falla. */
  onRefreshRates: () => Promise<void>;
  onSaveRates: (r: Rates) => void;
}

export type RateStatus = { state: 'idle' | 'loading' } | { state: 'error'; message: string };

export default function FinanceModule({ data, onAdd, onUpdate, onDelete, onRefreshRates, onSaveRates }: Props) {
  const [tab, setTab] = useLocalStorage<SubTab>('pd.fin.tab', 'resumen');
  const [rateStatus, setRateStatus] = useState<RateStatus>({ state: 'idle' });

  const refreshRates = useCallback(async () => {
    setRateStatus({ state: 'loading' });
    try {
      await onRefreshRates();
      setRateStatus({ state: 'idle' });
    } catch {
      setRateStatus({ state: 'error', message: 'No se pudo obtener la tasa BCV. Revisa tu conexión o escríbela a mano.' });
    }
  }, [onRefreshRates]);

  // Al abrir el módulo, actualiza la tasa si no hay o si es de un día anterior.
  useEffect(() => {
    const r = data.rates;
    if (!r || r.date < toISO(today())) void refreshRates();
    // Solo al montar el módulo
  }, []);

  const pageProps = { data, onAdd, onUpdate, onDelete };

  return (
    <Stack>
      <div className="flex flex-wrap gap-2" role="tablist">
        {SUBTABS.map(([id, label, icon]) => (
          <Chip key={id} big role="tab" aria-selected={tab === id} active={tab === id} onClick={() => setTab(id)}>
            {icon}
            {label}
          </Chip>
        ))}
      </div>

      {tab === 'resumen' && (
        <FinanceSummary data={data} rateStatus={rateStatus} onRefreshRates={refreshRates} onSaveRates={onSaveRates} />
      )}
      {tab === 'entrada' && <MovementsPage kind="entrada" {...pageProps} />}
      {tab === 'salida' && <MovementsPage kind="salida" {...pageProps} />}
    </Stack>
  );
}
