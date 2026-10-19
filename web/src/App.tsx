import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
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
import { doneOn } from './lib/stats';
import { today } from './lib/dates';
import { Button, Card, cn } from './ui';

type Tab = 'plan' | 'actividades' | 'pendientes' | 'finanzas' | 'nutricion';

interface TabDef {
  id: Tab;
  /** Texto corto de la navegación. */
  label: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Módulo que las cuentas de empresa no tienen. */
  personalOnly?: boolean;
}

const TABS: TabDef[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarCheckIcon />, title: 'Planificación diaria', subtitle: 'Marca tus disciplinas y mira cómo va tu semana.' },
  { id: 'actividades', label: 'Disciplinas', icon: <TargetIcon />, title: 'Mis disciplinas', subtitle: 'Los hábitos que quieres sostener cada día.' },
  { id: 'pendientes', label: 'Pendientes', icon: <ListChecksIcon />, title: 'Pendientes', subtitle: 'Tus tareas, con prioridad y fecha límite.' },
  { id: 'finanzas', label: 'Finanzas', icon: <WalletIcon />, title: 'Finanzas', subtitle: 'Tus cuentas y movimientos, de un vistazo.', personalOnly: true },
  { id: 'nutricion', label: 'Nutrición', icon: <AppleIcon />, title: 'Nutrición', subtitle: 'Diario de comidas, macros y progreso corporal.', personalOnly: true },
];

export default function App() {
  const { state } = useAuth();
  if (state.status === 'loading')
    return (
      <div className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-3.5 font-medium text-ink-2">
        <Backdrop />
        <Logo size={56} className="animate-pulse-soft" />
        <span>Cargando…</span>
      </div>
    );
  if (state.status === 'anon') return <AuthScreen notice={state.reason} />;
  // key: al cambiar de usuario se descarta todo el estado del anterior
  return <Dashboard key={state.user.id} user={state.user} />;
}

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

const SKELETON =
  'animate-shimmer rounded-card border border-line bg-[linear-gradient(100deg,var(--surface)_30%,var(--surface-2)_50%,var(--surface)_70%)] [background-size:200%_100%]';

function Dashboard({ user }: { user: ApiUser }) {
  const { logout } = useAuth();
  const isBusiness = user.accountType === 'BUSINESS';
  const tabs = useMemo(() => TABS.filter((t) => !(isBusiness && t.personalOnly)), [isBusiness]);
  const [storedTab, setTab] = useLocalStorage<Tab>('pd.tab', 'plan');
  // La pestaña guardada puede ser de un módulo que esta cuenta no tiene.
  const current = tabs.find((t) => t.id === storedTab) ?? tabs[0];
  const tab = current.id;
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
    // La API rechaza finanzas y nutrición a las cuentas de empresa: no se piden.
    await Promise.all([loadPlanning(), loadTasks(), ...(isBusiness ? [] : [loadFinance(), loadNutrition()])]);
  }, [loadPlanning, loadTasks, loadFinance, loadNutrition, isBusiness]);

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
      ...(isBusiness ? {} : { finance: finance.data, nutrition: nutrition.data }),
    }),
    [planning.activities, planning.checks, planning.startISO, tasks.tasks, finance.data, nutrition.data, isBusiness],
  );

  const pendingCount = tasks.tasks.filter((t) => t.status !== 'completada').length;

  // La barra superior gana fondo al dejar el tope y muestra el avance del scroll.
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8));

  const doneToday = doneOn(planning.checks, today(), planning.activities);
  const heroStats: HeroStat[] = [
    { label: 'Hechas hoy', value: doneToday, suffix: `/${planning.activities.length}` },
    { label: 'Pendientes', value: pendingCount },
    { label: 'Disciplinas', value: planning.activities.length },
  ];
  // A una persona se la saluda por su primer nombre; a una empresa, por el nombre completo.
  const greetName = isBusiness ? user.fullName.trim() : user.fullName.trim().split(/\s+/)[0];

  return (
    <div className="relative isolate min-h-dvh">
      <Backdrop />
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        {/* El desenfoque va en una capa aparte: en la propia barra atraparía a la navegación fija del móvil. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 -z-10 border-b backdrop-blur-lg backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300',
            scrolled ? 'border-line bg-surface/85 shadow-[0_12px_30px_-22px_rgba(11,27,28,0.5)]' : 'border-transparent bg-page/70',
          )}
        />
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-linear-to-r from-brand-to via-dawn-400 via-60% to-coral-500"
          style={{ scaleX: scrollYProgress }}
        />

        <div className="flex items-center gap-2.5 font-display text-[17px] font-extrabold tracking-[-0.02em]">
          <Logo />
          <span>Planificación diaria</span>
        </div>

        {/* En móvil es una barra fija inferior; desde md vuelve a la cabecera. */}
        <nav
          aria-label="Módulos"
          className={cn(
            'fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 flex gap-0.5 rounded-[22px] border border-line bg-surface/92 p-1.5 shadow-lift backdrop-blur-lg',
            'md:static md:rounded-[14px] md:bg-surface-2/80 md:p-1 md:shadow-none md:backdrop-blur-none',
          )}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative isolate flex min-h-[54px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-[3px] rounded-2xl px-0.5 py-2',
                  'text-[11px] font-semibold whitespace-nowrap transition-colors duration-150',
                  'md:min-h-[38px] md:flex-none md:flex-row md:gap-[7px] md:rounded-ctl md:px-3.5 md:text-[15px]',
                  active ? 'text-accent-text md:text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-[inherit] bg-accent/10 md:bg-surface md:shadow-[0_1px_2px_rgba(11,27,28,0.1),0_6px_14px_-8px_rgba(11,27,28,0.3)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={cn('flex transition-colors duration-150', active && 'text-accent')}>{t.icon}</span>
                <span>{t.label}</span>
                {t.id === 'pendientes' && pendingCount > 0 && (
                  <span className="absolute top-[3px] left-[calc(50%+6px)] rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink tabular-nums md:static md:px-[7px] md:py-px">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <BackupMenu data={backupData} onImport={importBackup} />
          <div className="flex items-center gap-2 md:border-l md:border-line md:pl-3">
            <span className="hidden max-w-40 truncate text-[13px] font-semibold md:inline" title={user.email}>
              {user.fullName}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOutIcon size={15} />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pt-6 pb-[calc(104px+env(safe-area-inset-bottom))] *:min-w-0 sm:px-6 md:pb-6">
        <PageHero
          id={tab}
          title={tab === 'plan' && greetName ? `${greetingFor()}, ${greetName}` : current.title}
          subtitle={current.subtitle}
          stats={heroStats}
        />
        {load.status === 'loading' && (
          <div className="flex flex-col gap-6" role="status" aria-label="Cargando tus datos">
            <div className={cn(SKELETON, 'h-[340px]')} />
            <div className={cn(SKELETON, 'h-[150px]')} />
            <div className={cn(SKELETON, 'h-[150px]')} />
          </div>
        )}
        {load.status === 'error' && (
          <Card className="flex flex-col items-start gap-3">
            <p role="alert" className="text-[13px] font-semibold text-bad-ink">
              No se pudieron cargar tus datos: {load.message}
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </Card>
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
