import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import Backdrop from './components/Backdrop';
import PageHero, { greetingFor, type HeroStat } from './components/PageHero';
import { AppleIcon, CalendarCheckIcon, ListChecksIcon, LogOutIcon, Logo, TargetIcon, WalletIcon } from './components/Icons';
import { useScrollChrome, useScrollReveal, useSpotlight } from './lib/motion';
import { doneOn } from './lib/stats';
import { today } from './lib/dates';

type Tab = 'plan' | 'actividades' | 'pendientes' | 'finanzas' | 'nutricion';

interface TabDef {
  id: Tab;
  /** Texto corto de la navegación. */
  label: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}

const TABS: TabDef[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarCheckIcon />, title: 'Planificación diaria', subtitle: 'Marca tus disciplinas y mira cómo va tu semana.' },
  { id: 'actividades', label: 'Disciplinas', icon: <TargetIcon />, title: 'Mis disciplinas', subtitle: 'Los hábitos que quieres sostener cada día.' },
  { id: 'pendientes', label: 'Pendientes', icon: <ListChecksIcon />, title: 'Pendientes', subtitle: 'Tus tareas, con prioridad y fecha límite.' },
  { id: 'finanzas', label: 'Finanzas', icon: <WalletIcon />, title: 'Finanzas', subtitle: 'Tus cuentas y movimientos, de un vistazo.' },
  { id: 'nutricion', label: 'Nutrición', icon: <AppleIcon />, title: 'Nutrición', subtitle: 'Diario de comidas, macros y progreso corporal.' },
];

export default function App() {
  const { state } = useAuth();
  if (state.status === 'loading')
    return (
      <div className="splash">
        <Backdrop />
        <Logo size={56} />
        <span>Cargando…</span>
      </div>
    );
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

  const appRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useScrollReveal(appRef);
  useSpotlight(appRef);
  useScrollChrome(topbarRef);

  // El indicador de la pestaña activa se desliza hasta su posición.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const active = nav.querySelector<HTMLElement>('.tab.active');
      if (!active) return;
      nav.style.setProperty('--ind-x', `${active.offsetLeft}px`);
      nav.style.setProperty('--ind-w', `${active.offsetWidth}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    nav.querySelectorAll('.tab').forEach((t) => ro.observe(t));
    return () => ro.disconnect();
  }, [tab]);

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const doneToday = doneOn(planning.checks, today(), planning.activities);
  const heroStats: HeroStat[] = [
    { label: 'Hechas hoy', value: doneToday, suffix: `/${planning.activities.length}` },
    { label: 'Pendientes', value: pendingCount },
    { label: 'Disciplinas', value: planning.activities.length },
  ];
  const firstName = user.fullName.trim().split(/\s+/)[0];

  return (
    <div className="app" ref={appRef}>
      <Backdrop />
      <header className="topbar" ref={topbarRef}>
        <div className="brand">
          <Logo />
          <span>Planificación diaria</span>
        </div>
        <nav className="tabs" aria-label="Módulos" ref={navRef}>
          <span className="tab-indicator" aria-hidden="true" />
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.icon}
              <span>{t.label}</span>
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
              <LogOutIcon size={15} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        <PageHero
          id={tab}
          title={tab === 'plan' && firstName ? `${greetingFor()}, ${firstName}` : current.title}
          subtitle={current.subtitle}
          stats={heroStats}
        />
        {load.status === 'loading' && (
          <div className="skeletons" role="status" aria-label="Cargando tus datos">
            <div className="skeleton tall" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
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
