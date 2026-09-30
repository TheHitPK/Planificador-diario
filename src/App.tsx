import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from './lib/storage';
import { useAuth } from './api/AuthContext';
import type { ApiUser } from './api/client';
import { describeImport, hasLegacyData, importToServer } from './api/migration';
import { usePlanningStore } from './api/stores/usePlanningStore';
import { useTasksStore } from './api/stores/useTasksStore';
import { useFinanceStore } from './api/stores/useFinanceStore';
import { useNutritionStore } from './api/stores/useNutritionStore';
import type { BackupData } from './lib/backup';
import WeekTable from './components/WeekTable';
import StatsPanel from './components/StatsPanel';
import ActivitiesManager from './components/ActivitiesManager';
import TasksModule from './components/TasksModule';
import BackupMenu from './components/BackupMenu';
import AuthScreen from './components/AuthScreen';
import MigrationBanner from './components/MigrationBanner';
import FinanceModule from './finance/FinanceModule';
import NutritionModule from './nutrition/NutritionModule';

type Tab = 'plan' | 'actividades' | 'pendientes' | 'finanzas' | 'nutricion';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Planificación diaria' },
  { id: 'actividades', label: 'Mis disciplinas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'nutricion', label: 'Nutrición' },
];

export default function App() {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="splash">Cargando…</div>;
  if (state.status === 'anon') return <AuthScreen notice={state.reason} />;
  // key: al cambiar de usuario se descarta todo el estado del anterior
  return <Dashboard key={state.user.id} user={state.user} />;
}

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

function Dashboard({ user }: { user: ApiUser }) {
  const { logout } = useAuth();
  const [tab, setTab] = useLocalStorage<Tab>('pd.tab', 'plan');
  const planning = usePlanningStore();
  const tasks = useTasksStore();
  const finance = useFinanceStore();
  const nutrition = useNutritionStore();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  const { load: loadPlanning } = planning;
  const { load: loadTasks } = tasks;
  const { load: loadFinance } = finance;
  const { load: loadNutrition } = nutrition;
  const loadAll = useCallback(async () => {
    await Promise.all([loadPlanning(), loadTasks(), loadFinance(), loadNutrition()]);
  }, [loadPlanning, loadTasks, loadFinance, loadNutrition]);

  useEffect(() => {
    loadAll()
      .then(() => setLoad({ status: 'ready' }))
      .catch((e: Error) => setLoad({ status: 'error', message: e.message }));
  }, [loadAll]);

  const importBackup = async (data: BackupData) => {
    const result = await importToServer(data);
    await loadAll();
    return describeImport(result);
  };

  const accountEmpty =
    planning.activities.length === 0 && tasks.tasks.length === 0 && finance.data.movements.length === 0;
  const showMigration = load.status === 'ready' && accountEmpty && hasLegacyData();

  const backupData: BackupData = useMemo(
    () => ({
      activities: planning.activities,
      checks: planning.checks,
      tasks: tasks.tasks,
      startISO: planning.startISO,
      finance: finance.data,
      nutrition: nutrition.data,
    }),
    [planning.activities, planning.checks, planning.startISO, tasks.tasks, finance.data, nutrition.data],
  );

  const pendingCount = tasks.tasks.filter((t) => t.status !== 'completada').length;

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
        <div className="topbar-right">
          <BackupMenu data={backupData} onImport={importBackup} />
          <div className="user-menu">
            <span className="user-name" title={user.email}>
              {user.fullName}
            </span>
            <button className="btn ghost small" onClick={() => void logout()}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {load.status === 'loading' && <p className="empty">Cargando tus datos…</p>}
        {load.status === 'error' && (
          <section className="card">
            <p className="form-error">No se pudieron cargar tus datos: {load.message}</p>
            <button className="btn primary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </section>
        )}
        {load.status === 'ready' && (
          <>
            {showMigration && <MigrationBanner onDone={loadAll} />}
            {tab === 'plan' && (
              <>
                <WeekTable
                  activities={planning.activities}
                  checks={planning.checks}
                  onToggle={planning.toggle}
                  onRangeNeeded={planning.ensureRange}
                />
                <StatsPanel activities={planning.activities} checks={planning.checks} startISO={planning.startISO} />
              </>
            )}
            {tab === 'actividades' && (
              <ActivitiesManager
                activities={planning.activities}
                onCreate={planning.createActivity}
                onUpdate={planning.updateActivity}
                onDelete={planning.deleteActivity}
                onReorder={planning.reorder}
              />
            )}
            {tab === 'pendientes' && (
              <TasksModule
                tasks={tasks.tasks}
                onCreate={tasks.create}
                onUpdate={tasks.update}
                onStatus={tasks.setStatus}
                onDelete={tasks.remove}
              />
            )}
            {tab === 'finanzas' && (
              <FinanceModule
                data={finance.data}
                onAdd={finance.add}
                onUpdate={finance.update}
                onDelete={finance.remove}
                onRefreshRates={finance.refreshRates}
                onSaveRates={finance.saveManualRates}
              />
            )}
            {tab === 'nutricion' && <NutritionModule data={nutrition.data} ops={nutrition} />}
          </>
        )}
      </main>
    </div>
  );
}
