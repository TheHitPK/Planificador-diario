import type { Activity, Checks, Task } from './types';
import { newId, useLocalStorage } from './lib/storage';
import { toISO, today } from './lib/dates';
import WeekTable from './components/WeekTable';
import StatsPanel from './components/StatsPanel';
import ActivitiesManager from './components/ActivitiesManager';
import TasksModule from './components/TasksModule';
import BackupMenu from './components/BackupMenu';
import type { BackupData } from './lib/backup';
import FinanceModule from './finance/FinanceModule';
import type { FinanceData, Movement, Rates } from './finance/types';

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: newId(), icon: '📚', name: 'Leer 30 min', description: 'Leer al menos 30 minutos de un libro.' },
  { id: newId(), icon: '💧', name: 'Beber 2 L de agua', description: 'Tomar 2 litros de agua durante el día.' },
  { id: newId(), icon: '🏋️', name: 'Ejercicio / Gym', description: 'Entrenar en el gym o hacer ejercicio.' },
  { id: newId(), icon: '🛡️', name: 'No ver porno', description: 'Mantenerme el día completo sin ver porno.' },
  { id: newId(), icon: '⏰', name: 'Levantarme a las 7:00', description: 'Levantarme a las 7:00 a. m.' },
];

type Tab = 'plan' | 'actividades' | 'pendientes' | 'finanzas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Planificación diaria' },
  { id: 'actividades', label: 'Mis disciplinas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'finanzas', label: 'Finanzas' },
];

export default function App() {
  const [tab, setTab] = useLocalStorage<Tab>('pd.tab', 'plan');
  const [activities, setActivities] = useLocalStorage<Activity[]>('pd.activities', DEFAULT_ACTIVITIES);
  const [checks, setChecks] = useLocalStorage<Checks>('pd.checks', {});
  const [tasks, setTasks] = useLocalStorage<Task[]>('pd.tasks', []);
  const [startISO, setStartISO] = useLocalStorage<string>('pd.start', () => toISO(today()));
  const [movements, setMovements] = useLocalStorage<Movement[]>('pd.fin.movements', []);
  const [rates, setRates] = useLocalStorage<Rates | null>('pd.fin.rates', null);
  const [rateHistory, setRateHistory] = useLocalStorage<FinanceData['rateHistory']>('pd.fin.rateHistory', {});
  const finance: FinanceData = { movements, rates, rateHistory };

  const toggleCheck = (iso: string, activityId: string) => {
    setChecks((prev) => {
      const current = prev[iso] ?? [];
      const next = current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId];
      return { ...prev, [iso]: next };
    });
    // Si marcas un día anterior a tu inicio, ese día pasa a ser el nuevo inicio.
    if (iso < startISO) setStartISO(iso);
  };

  const importBackup = (data: BackupData) => {
    setActivities(data.activities);
    setChecks(data.checks);
    setTasks(data.tasks);
    setStartISO(data.startISO);
    // Respaldos anteriores a Finanzas no traen estos datos: se dejan los actuales.
    if (data.finance) {
      setMovements(data.finance.movements);
      setRates(data.finance.rates);
      setRateHistory(data.finance.rateHistory);
    }
  };

  const pendingCount = tasks.filter((t) => t.status !== 'completada').length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✅</span>
          <span>Planificación diaria</span>
        </div>
        <nav className="tabs" aria-label="Módulos">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'pendientes' && pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <BackupMenu data={{ activities, checks, tasks, startISO, finance }} onImport={importBackup} />
      </header>

      <main className="content">
        {tab === 'plan' && (
          <>
            <WeekTable activities={activities} checks={checks} onToggle={toggleCheck} />
            <StatsPanel activities={activities} checks={checks} startISO={startISO} />
          </>
        )}
        {tab === 'actividades' && <ActivitiesManager activities={activities} onChange={setActivities} />}
        {tab === 'pendientes' && <TasksModule tasks={tasks} onChange={setTasks} />}
        {tab === 'finanzas' && (
          <FinanceModule
            data={finance}
            setMovements={setMovements}
            setRates={setRates}
            setRateHistory={setRateHistory}
          />
        )}
      </main>
    </div>
  );
}
