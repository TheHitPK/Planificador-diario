import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn } from './cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Tamaño de subpestaña. */
  big?: boolean;
}

/** Filtro o subpestaña en forma de píldora. */
export function Chip({ active = false, big = false, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink-2 touch-manipulation',
        'transition duration-150 ease-out hover:border-accent/40 hover:text-ink active:scale-[0.96]',
        big && 'min-h-[38px] px-4 py-1.5 text-sm font-semibold',
        active &&
          'border-transparent bg-linear-135 from-brand-from to-brand-to text-accent-ink shadow-[0_6px_14px_-8px_var(--accent)] hover:border-transparent hover:text-accent-ink',
        className,
      )}
      {...rest}
    />
  );
}

/** Grupo de opciones excluyentes. */
export function Segmented({ cols2 = false, className, ...rest }: HTMLAttributes<HTMLDivElement> & { cols2?: boolean }) {
  return (
    <div className={cn('gap-1 rounded-xl bg-surface-2 p-1', cols2 ? 'grid grid-cols-2' : 'flex flex-wrap', className)} {...rest} />
  );
}

export function SegmentedOption({ active = false, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'min-h-[34px] flex-1 rounded-[9px] px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-ink-2 transition duration-150',
        'hover:enabled:text-ink disabled:opacity-60',
        active && 'bg-surface text-accent-text shadow-[0_1px_2px_rgba(11,27,28,0.1),0_6px_14px_-8px_rgba(11,27,28,0.3)] hover:enabled:text-accent-text',
        className,
      )}
      {...rest}
    />
  );
}

export type TagTone = 'neutral' | 'bad' | 'warn' | 'good' | 'accent' | 'out';

const TAG_TONE: Record<TagTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  bad: 'bg-bad-soft text-bad-ink',
  warn: 'bg-warn-soft text-warn-ink',
  good: 'bg-good-soft text-good-ink',
  accent: 'bg-accent/18 text-ink',
  out: 'bg-flow-out/18 text-ink',
};

export function Tag({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: TagTone }) {
  return <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', TAG_TONE[tone], className)} {...rest} />;
}
