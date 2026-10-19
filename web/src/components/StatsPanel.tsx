import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Activity, Checks } from '../types';
import {
  DAY_SHORT, MONTH_NAMES, MONTH_SHORT, daysInMonth, formatDM, range, startOfWeek, today,
} from '../lib/dates';
import { LEVEL_LABEL, levelFor, pct, periodStats, type Level, type PeriodStats } from '../lib/stats';
import LevelPill from './LevelPill';
import { EASE_OUT } from '../lib/motion';
import { BigNumber, Card, ChartFrame, ChartTip, Grid2, chart } from '../ui';

/** Colores de estado, tomados de los tokens. */
const LEVEL_COLOR: Record<Level, string> = {
  green: 'var(--good)',
  yellow: 'var(--warn)',
  red: 'var(--bad)',
  none: 'var(--muted)',
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
    <section>
      <h2 className="mb-3.5 flex items-center gap-2.5 text-xl before:h-5 before:w-1 before:rounded before:bg-linear-to-b before:from-brand-to before:via-dawn-400 before:to-coral-500">
        ¿Cómo voy?
      </h2>
      <Grid2>
        <StatCard order={0} title="Hoy" subtitle={`${DAY_SHORT[(t.getDay() + 6) % 7]} ${formatDM(t)}`} s={dayStats} unit="actividades">
          <Ring ratio={dayStats.ratio} />
        </StatCard>
        <StatCard order={1} title="Esta semana" subtitle="Lunes a domingo" s={weekStats}>
          <Bars data={weekData} />
        </StatCard>
        <StatCard order={2} title="Este mes" subtitle={`${MONTH_NAMES[m]} ${y}`} s={monthStats}>
          <Bars data={monthData} tickInterval={4} />
        </StatCard>
        <StatCard order={3} title="Este año" subtitle={String(y)} s={yearStats}>
          <Bars data={yearData} />
        </StatCard>
      </Grid2>
    </section>
  );
}

function StatCard({
  order, title, subtitle, s, unit = 'marcadas', children,
}: { order: number; title: string; subtitle: string; s: PeriodStats; unit?: string; children: ReactNode }) {
  const level = levelFor(s.ratio);
  return (
    <Card as="article" lift delay={(order % 2) * 0.08} className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
      <div className="flex flex-col items-start gap-1">
        <h3>{title}</h3>
        <p className="text-[13px] text-ink-2">{subtitle}</p>
        <BigNumber className="mt-2">{pct(s.ratio)}</BigNumber>
        <p className="text-[13px] text-ink-2">
          {s.done} de {s.total} {unit}
        </p>
        <LevelPill level={level} text={LEVEL_LABEL[level]} showLabel={false} />
      </div>
      <ChartFrame className="flex justify-center">{children}</ChartFrame>
    </Card>
  );
}

function Ring({ ratio }: { ratio: number | null }) {
  const value = ratio ?? 0;
  return (
    <svg viewBox="0 0 140 140" className="size-[150px] overflow-visible" role="img" aria-label={`Progreso de hoy ${pct(ratio)}`}>
      <circle cx="70" cy="70" r="52" fill="none" strokeWidth="14" className="stroke-surface-2" />
      {/* El arco se dibuja desde arriba y crece hasta el avance del día. */}
      <g transform="rotate(-90 70 70)">
        <motion.circle
          cx="70"
          cy="70"
          r="52"
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          stroke={LEVEL_COLOR[levelFor(ratio)]}
          className="drop-shadow-[0_4px_8px_rgba(11,27,28,0.18)]"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: value, opacity: value > 0 ? 1 : 0 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.15 }}
        />
      </g>
      <text x="70" y="76" textAnchor="middle" className="fill-ink font-display text-[22px] font-extrabold">
        {pct(ratio)}
      </text>
    </svg>
  );
}

function Bars({ data, tickInterval = 0 }: { data: Point[]; tickInterval?: number }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke={chart.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={chart.axis} interval={tickInterval} tick={chart.tick} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={chart.tick}
        />
        <Tooltip cursor={chart.barCursor} content={<ChartTooltip />} isAnimationActive={false} />
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
    <ChartTip title={p.detail}>
      {p.stats.ratio === null ? (
        <div className="text-ink-2">Sin datos</div>
      ) : (
        <>
          <div>
            <strong>{pct(p.stats.ratio)}</strong> · {p.stats.done}/{p.stats.total}
          </div>
          <LevelPill level={level} text={LEVEL_LABEL[level]} showLabel={false} />
        </>
      )}
    </ChartTip>
  );
}
