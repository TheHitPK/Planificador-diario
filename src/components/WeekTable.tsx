import { useEffect, useState } from 'react';
import type { Activity, Checks } from '../types';
import { DAY_NAMES, MONTH_NAMES, addDays, formatDM, range, startOfWeek, toISO, today } from '../lib/dates';
import { doneOn, levelFor } from '../lib/stats';
import LevelPill from './LevelPill';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface Props {
  activities: Activity[];
  checks: Checks;
  onToggle: (iso: string, activityId: string) => void;
  /** Pide cargar los días de la semana visible si aún no están. */
  onRangeNeeded?: (from: string, to: string) => void;
}

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
    <section className="card week">
      <div className="card-head">
        <div>
          <h2>{isCurrentWeek ? 'Semana actual' : 'Semana'}</h2>
          <p className="muted">
            {formatDM(weekStart)} al {formatDM(weekEnd)} · {monthLabel}
          </p>
        </div>
        <div className="week-nav">
          <button className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeftIcon />
          </button>
          <button className="btn ghost" onClick={() => setWeekStart(startOfWeek(todayDate))} disabled={isCurrentWeek}>
            Hoy
          </button>
          <button className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="empty">No tienes disciplinas. Agrégalas en “Mis disciplinas”.</p>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="col-day">Día</th>
                {activities.map((a) => (
                  <th key={a.id} className="col-act">
                    <span className="act-icon" data-tip={a.name} aria-label={a.name}>
                      {a.icon}
                    </span>
                  </th>
                ))}
                <th className="col-total">Total</th>
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
                  <tr key={iso} className={`${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}>
                    <th scope="row" className="col-day">
                      <span className="day-name">{DAY_NAMES[i]}</span>
                      <span className="day-date">{formatDM(d)}</span>
                      {isToday && <span className="today-tag">Hoy</span>}
                    </th>
                    {activities.map((a) => {
                      const checked = (checks[iso] ?? []).includes(a.id);
                      return (
                        <td key={a.id} className="col-act">
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isFuture}
                              onChange={() => onToggle(iso, a.id)}
                              aria-label={`${a.name} – ${DAY_NAMES[i]} ${formatDM(d)}`}
                            />
                            <span className="check-box" aria-hidden />
                          </label>
                        </td>
                      );
                    })}
                    <td className="col-total">
                      {isFuture ? (
                        <span className="muted">—</span>
                      ) : (
                        <LevelPill level={level} text={`${done}/${activities.length}`} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="col-day">
                  <span className="day-name">Semana</span>
                </th>
                {activities.map((a) => {
                  const n = pastDays.filter((d) => (checks[toISO(d)] ?? []).includes(a.id)).length;
                  return (
                    <td key={a.id} className="col-act foot-count">
                      {pastDays.length ? `${n}/${pastDays.length}` : '—'}
                    </td>
                  );
                })}
                <td className="col-total">
                  {pastDays.length ? (
                    (() => {
                      const done = pastDays.reduce((s, d) => s + doneOn(checks, d, activities), 0);
                      const total = pastDays.length * activities.length;
                      return <LevelPill level={levelFor(done / total)} text={`${done}/${total}`} />;
                    })()
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <ul className="legend-acts">
        {activities.map((a) => (
          <li key={a.id}>
            <span aria-hidden>{a.icon}</span> {a.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
