import { useEffect, useState } from 'react';
import type { Activity, Checks } from '../types';
import { DAY_NAMES, MONTH_NAMES, addDays, formatDM, range, startOfWeek, toISO, today } from '../lib/dates';
import { doneOn, levelFor } from '../lib/stats';
import LevelPill from './LevelPill';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { Button, Card, CardHead, ColHead, Empty, Table, Td, Th, Tr, cn } from '../ui';

interface Props {
  activities: Activity[];
  checks: Checks;
  onToggle: (iso: string, activityId: string) => void;
  /** Pide cargar los días de la semana visible si aún no están. */
  onRangeNeeded?: (from: string, to: string) => void;
}

/* La casilla se dibuja con un <span> hermano del input (peer): al marcarse se rellena y la palomita entra con rebote. */
const CHECK_BOX = cn(
  'grid size-[26px] place-items-center rounded-lg border-2 border-axis bg-surface transition duration-200 ease-spring',
  'group-hover/check:peer-enabled:scale-108 group-hover/check:peer-enabled:border-accent group-active/check:peer-enabled:scale-90',
  'peer-checked:border-accent peer-checked:bg-linear-135 peer-checked:from-brand-from peer-checked:to-brand-to',
  'peer-checked:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_12%,transparent)]',
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
  'peer-disabled:opacity-35',
  'after:h-[11px] after:w-1.5 after:-translate-y-px after:scale-0 after:rotate-45 after:border-r-[2.5px] after:border-b-[2.5px] after:border-accent-ink',
  'after:transition-transform after:duration-300 after:ease-spring peer-checked:after:scale-100',
);

/* El nombre de la disciplina aparece como etiqueta flotante bajo el icono. */
const ACT_ICON = cn(
  'relative inline-block cursor-default text-[22px] transition-transform duration-300 ease-spring hover:scale-118',
  'after:pointer-events-none after:absolute after:top-[calc(100%+6px)] after:left-1/2 after:z-5 after:-translate-x-1/2 after:rounded-md',
  'after:bg-ink after:px-2 after:py-1 after:text-xs after:font-medium after:whitespace-nowrap after:text-surface after:opacity-0',
  'after:transition-opacity after:content-[attr(data-tip)] hover:after:opacity-100',
);

const DAY_COL = 'whitespace-nowrap sm:w-[170px]';
const TOTAL_COL = 'sm:w-[170px]';

export default function WeekTable({ activities, checks, onToggle, onRangeNeeded }: Props) {
  const todayDate = today();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayDate));
  const days = range(weekStart, 7);
  const weekEnd = days[6];
  const isCurrentWeek = toISO(weekStart) === toISO(startOfWeek(todayDate));

  useEffect(() => {
    onRangeNeeded?.(toISO(weekStart), toISO(addDays(weekStart, 6)));
  }, [weekStart, onRangeNeeded]);

  const monthLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${MONTH_NAMES[weekStart.getMonth()]} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  const pastDays = days.filter((d) => d <= todayDate);

  return (
    <Card>
      <CardHead>
        <div>
          <h2>{isCurrentWeek ? 'Semana actual' : 'Semana'}</h2>
          <p className="text-ink-2">
            {formatDM(weekStart)} al {formatDM(weekEnd)} · {monthLabel}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" className="px-2.5" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" onClick={() => setWeekStart(startOfWeek(todayDate))} disabled={isCurrentWeek}>
            Hoy
          </Button>
          <Button variant="ghost" className="px-2.5" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRightIcon />
          </Button>
        </div>
      </CardHead>

      {activities.length === 0 ? (
        <Empty>No tienes disciplinas. Agrégalas en “Disciplinas”.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <ColHead align="left" className={DAY_COL}>
                Día
              </ColHead>
              {activities.map((a) => (
                <ColHead key={a.id}>
                  <span className={ACT_ICON} data-tip={a.name} aria-label={a.name}>
                    {a.icon}
                  </span>
                </ColHead>
              ))}
              <ColHead align="right" className={TOTAL_COL}>
                Total
              </ColHead>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => {
              const iso = toISO(d);
              const isFuture = d > todayDate;
              const isToday = iso === toISO(todayDate);
              const done = doneOn(checks, d, activities);
              const level = isFuture ? 'none' : levelFor(done / activities.length);
              return (
                <Tr key={iso} highlight={isToday}>
                  <Th scope="row" align="left" className={cn(DAY_COL, isToday && 'shadow-[inset_3px_0_0_var(--accent)]')}>
                    <span className={cn('mr-2 font-semibold', isFuture && 'text-muted')}>{DAY_NAMES[i]}</span>
                    <span className={cn('font-normal tabular-nums', isFuture ? 'text-muted' : 'text-ink-2')}>{formatDM(d)}</span>
                    {isToday && (
                      <span className="ml-2 rounded-full bg-linear-135 from-brand-from to-brand-to px-2 py-0.5 text-[11px] font-bold text-accent-ink">
                        Hoy
                      </span>
                    )}
                  </Th>
                  {activities.map((a) => {
                    const checked = (checks[iso] ?? []).includes(a.id);
                    return (
                      <Td key={a.id}>
                        <label className="group/check relative inline-flex cursor-pointer touch-manipulation p-1.5 has-disabled:cursor-not-allowed">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={checked}
                            disabled={isFuture}
                            onChange={() => onToggle(iso, a.id)}
                            aria-label={`${a.name} – ${DAY_NAMES[i]} ${formatDM(d)}`}
                          />
                          <span className={CHECK_BOX} aria-hidden />
                        </label>
                      </Td>
                    );
                  })}
                  <Td align="right" className={TOTAL_COL}>
                    {isFuture ? <span className="text-ink-2">—</span> : <LevelPill level={level} text={`${done}/${activities.length}`} />}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <Th scope="row" align="left" foot className={DAY_COL}>
                <span className="font-semibold">Semana</span>
              </Th>
              {activities.map((a) => {
                const n = pastDays.filter((d) => (checks[toISO(d)] ?? []).includes(a.id)).length;
                return (
                  <Td key={a.id} foot className="text-[13px] text-ink-2 tabular-nums">
                    {pastDays.length ? `${n}/${pastDays.length}` : '—'}
                  </Td>
                );
              })}
              <Td align="right" foot className={TOTAL_COL}>
                {pastDays.length ? (
                  (() => {
                    const done = pastDays.reduce((s, d) => s + doneOn(checks, d, activities), 0);
                    const total = pastDays.length * activities.length;
                    return <LevelPill level={levelFor(done / total)} text={`${done}/${total}`} />;
                  })()
                ) : (
                  <span className="text-ink-2">—</span>
                )}
              </Td>
            </tr>
          </tfoot>
        </Table>
      )}

      <ul className="m-0 mt-4 flex list-none flex-wrap gap-1.5 p-0 text-[13px] text-ink-2">
        {activities.map((a) => (
          <li key={a.id} className="rounded-full bg-surface-2 px-2.5 py-[3px]">
            <span aria-hidden>{a.icon}</span> {a.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}
