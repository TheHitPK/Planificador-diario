import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';
import { EASE_OUT } from '../lib/motion';
import { cn } from './cn';

/* ---------- Cifras ---------- */

export function MiniStats({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex flex-wrap gap-6', className)} {...rest} />;
}

interface MiniStatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
}

export function MiniStat({ label, value, sub, valueClassName }: MiniStatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-ink-2">{label}</span>
      <strong className={cn('font-display text-[19px] tabular-nums', valueClassName)}>{value}</strong>
      {sub && <span className="text-[13px] text-ink-2">{sub}</span>}
    </div>
  );
}

/** La cifra principal de una tarjeta. */
export function BigNumber({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('font-display text-[42px] leading-[1.1] font-extrabold tracking-[-0.03em] tabular-nums', className)} {...rest} />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-7 text-center text-muted">{children}</p>;
}

/* ---------- Tabla ---------- */

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Filas más bajas y cifras alineadas (listados de alimentos, historial). */
  compact?: boolean;
}

export function Table({ compact = false, className, ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full border-separate border-spacing-0',
          compact ? 'text-[13.5px] tabular-nums [--cell-x:6px] [--cell-y:8px]' : '[--cell-x:8px] [--cell-y:10px]',
          className,
        )}
        {...rest}
      />
    </div>
  );
}

/** Fila del cuerpo: se resalta al pasar el cursor o si está marcada (hoy, en edición). */
export function Tr({ highlight = false, className, ...rest }: HTMLAttributes<HTMLTableRowElement> & { highlight?: boolean }) {
  return <tr data-highlight={highlight || undefined} className={cn('group/row', className)} {...rest} />;
}

type Align = 'left' | 'center' | 'right';
const ALIGN: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const CELL =
  'border-b border-grid px-(--cell-x) py-(--cell-y) transition-colors duration-150 ' +
  'group-data-[highlight]/row:bg-accent/10 group-hover/row:bg-surface-2/70';

interface CellProps {
  align?: Align;
  /** Celda de la fila de totales: sin línea inferior. */
  foot?: boolean;
}

export function Th({ align = 'center', foot = false, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & CellProps) {
  return <th className={cn(CELL, ALIGN[align], foot && 'border-b-0 pt-3.5', className)} {...rest} />;
}

/** Encabezado de columna. */
export function ColHead({ align = 'center', className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return <th className={cn(CELL, ALIGN[align], 'text-xs font-semibold text-muted', className)} {...rest} />;
}

export function Td({ align = 'center', foot = false, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & CellProps) {
  return <td className={cn(CELL, ALIGN[align], foot && 'border-b-0 pt-3.5', className)} {...rest} />;
}

/* ---------- Lista ---------- */

/** Lista cuyos elementos entran, salen y se reordenan con animación. */
export function List({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul className={cn('m-0 flex list-none flex-col gap-2 p-0', className)}>
      <AnimatePresence initial>{children}</AnimatePresence>
    </ul>
  );
}

interface ListItemProps extends Omit<HTMLMotionProps<'li'>, 'children'> {
  /** Posición en la lista, para escalonar la entrada. */
  index?: number;
  editing?: boolean;
  children?: ReactNode;
}

export function ListItem({ index = 0, editing = false, className, children, ...rest }: ListItemProps) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(index, 5) * 0.04, layout: { duration: 0.3, ease: EASE_OUT } }}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3 sm:flex-nowrap',
        'transition-[border-color,box-shadow] duration-150 hover:border-accent/35 hover:shadow-card',
        editing && 'border-accent shadow-ring hover:border-accent hover:shadow-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.li>
  );
}

/** Emoji de la disciplina o de la cuenta dentro de un recuadro. */
export function IconBadge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn('grid size-10 flex-none place-items-center rounded-xl bg-surface-2 text-2xl', className)}
      {...rest}
    />
  );
}

/* ---------- Gráficos (Recharts) ---------- */

/** Colores de los gráficos: salen de los tokens, así siguen al tema claro/oscuro. */
export const chart = {
  tick: { fontSize: 11, fill: 'var(--muted)' },
  grid: 'var(--grid)',
  axis: { stroke: 'var(--axis)' },
  barCursor: { fill: 'var(--surface-2)' },
  lineCursor: { stroke: 'var(--axis)' },
} as const;

/** Contenedor de un gráfico; las barras crecen desde la base al aparecer. */
export function ChartFrame({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 [&_.recharts-bar-rectangle]:origin-bottom [&_.recharts-bar-rectangle]:animate-grow-y [&_.recharts-bar-rectangle]:[transform-box:fill-box]',
        className,
      )}
      {...rest}
    />
  );
}

export function ChartTip({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface/90 px-3 py-2 text-[13px] shadow-lift backdrop-blur-md">
      <div className="font-bold">{title}</div>
      {children}
    </div>
  );
}

/** Cuadrito de color para leyendas. */
export function Swatch({ className }: { className: string }) {
  return <i aria-hidden className={cn('inline-block size-2.5 rounded-[3px]', className)} />;
}
