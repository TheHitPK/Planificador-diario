import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Activity, Checks } from '../types';
import {
  DAY_SHORT, MONTH_NAMES, MONTH_SHORT, daysInMonth, formatDM, range, startOfWeek, today,
} from '../lib/dates';
import { LEVEL_LABEL, levelFor, pct, periodStats, type Level, type PeriodStats } from '../lib/stats';
import LevelPill from './LevelPill';

/** Colores de estado (iguales en claro y oscuro). */
const LEVEL_COLOR: Record<Level, string> = {
  green: '#17a34a',
  yellow: '#f5a524',
  red: '#e5484d',
  none: '#8a9a97',
};

interface Props {
  activities: Activity[];
  checks: Checks;
  startISO: string;
}

interface Point {
  label: string;
  detail: string;
  value: number | null;
  /** Altura dibujada: un día al 0 % se ve como una barra mínima roja. */
  bar: number | null;
  stats: PeriodStats;
}

export default function StatsPanel({ activities, checks, startISO }: Props) {
  const t = today();
  const y = t.getFullYear();
  const m = t.getMonth();
  const stats = (days: Date[]) => periodStats(days, checks, activities, t, startISO);

  const toPoint = (label: string, detail: string, days: Date[]): Point => {
    const s = stats(days);
    const value = s.ratio === null ? null : Math.round(s.ratio * 100);
    return { label, detail, value, bar: value === null ? null : Math.max(value, 3), stats: s };
  };

  // Hoy
  const dayStats = stats([t]);

  // Semana (lunes a domingo)
  const weekDays = range(startOfWeek(t), 7);
  const weekStats = stats(weekDays);
  const weekData = weekDays.map((d, i) => toPoint(DAY_SHORT[i], `${DAY_SHORT[i]} ${formatDM(d)}`, [d]));

  // Mes
  const monthDays = range(new Date(y, m, 1), daysInMonth(y, m));
  const monthStats = stats(monthDays);
  const monthData = monthDays.map((d) => toPoint(String(d.getDate()), formatDM(d), [d]));

  // Año
  const yearDays = range(new Date(y, 0, 1), (new Date(y + 1, 0, 1).getTime() - new Date(y, 0, 1).getTime()) / 86_400_000);
  const yearStats = stats(yearDays);
  const yearData = MONTH_SHORT.map((label, i) =>
    toPoint(label, `${MONTH_NAMES[i]} ${y}`, range(new Date(y, i, 1), daysInMonth(y, i))),
  );

  return (
    <section className="stats">
      <h2 className="section-title">¿Cómo voy?</h2>
      <div className="stats-grid">
        <StatCard title="Hoy" subtitle={`${DAY_SHORT[(t.getDay() + 6) % 7]} ${formatDM(t)}`} s={dayStats} unit="actividades">
          <Ring ratio={dayStats.ratio} />
        </StatCard>
        <StatCard title="Esta semana" subtitle="Lunes a domingo" s={weekStats}>
          <Bars data={weekData} />
        </StatCard>
        <StatCard title="Este mes" subtitle={`${MONTH_NAMES[m]} ${y}`} s={monthStats}>
          <Bars data={monthData} tickInterval={4} />
        </StatCard>
        <StatCard title="Este año" subtitle={String(y)} s={yearStats}>
          <Bars data={yearData} />
        </StatCard>
      </div>
    </section>
  );
}

function StatCard({
  title, subtitle, s, unit = 'marcadas', children,
}: { title: string; subtitle: string; s: PeriodStats; unit?: string; children: ReactNode }) {
  const level = levelFor(s.ratio);
  return (
    <article className="card stat-card">
      <div className="stat-info">
        <h3>{title}</h3>
        <p className="muted small">{subtitle}</p>
        <p className="hero">{pct(s.ratio)}</p>
        <p className="muted small">
          {s.done} de {s.total} {unit}
        </p>
        <LevelPill level={level} text={LEVEL_LABEL[level]} showLabel={false} />
      </div>
      <div className="stat-chart">{children}</div>
    </article>
  );
}

function Ring({ ratio }: { ratio: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const value = ratio ?? 0;
  return (
    <svg viewBox="0 0 140 140" className="ring" role="img" aria-label={`Progreso de hoy ${pct(ratio)}`}>
      <circle cx="70" cy="70" r={r} className="ring-track" />
      <circle
        cx="70"
        cy="70"
        r={r}
        className="ring-value"
        stroke={LEVEL_COLOR[levelFor(ratio)]}
        strokeDasharray={`${c * value} ${c}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="76" textAnchor="middle" className="ring-text">
        {pct(ratio)}
      </text>
    </svg>
  );
}

function Bars({ data, tickInterval = 0 }: { data: Point[]; tickInterval?: number }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} className="chart-grid" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ className: 'chart-axis' }}
          interval={tickInterval}
          tick={{ fontSize: 11, fill: '#898781' }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#898781' }}
        />
        <Tooltip cursor={{ className: 'chart-cursor' }} content={<ChartTooltip />} isAnimationActive={false} />
        <Bar dataKey="bar" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
          {data.map((p, i) => (
            <Cell key={i} fill={LEVEL_COLOR[levelFor(p.value === null ? null : p.value / 100)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const level = levelFor(p.stats.ratio);
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{p.detail}</div>
      {p.stats.ratio === null ? (
        <div className="muted">Sin datos</div>
      ) : (
        <>
          <div>
            <strong>{pct(p.stats.ratio)}</strong> · {p.stats.done}/{p.stats.total}
          </div>
          <LevelPill level={level} text={LEVEL_LABEL[level]} showLabel={false} />
        </>
      )}
    </div>
  );
}
