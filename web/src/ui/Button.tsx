import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'soft' | 'primary' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'icon';

const BASE =
  'relative inline-flex items-center justify-center gap-1.5 rounded-ctl border border-transparent font-semibold touch-manipulation ' +
  'transition duration-150 ease-out active:enabled:scale-[0.97] disabled:opacity-45';

const VARIANT: Record<Variant, string> = {
  soft: 'bg-surface-2 text-ink',
  // El destello (::after) cruza el botón al pasar el cursor.
  primary:
    'overflow-hidden bg-linear-135 from-brand-from to-brand-to text-accent-ink shadow-[0_8px_18px_-8px_var(--accent)] ' +
    'hover:enabled:brightness-107 hover:enabled:shadow-[0_12px_24px_-10px_var(--accent)] ' +
    'after:pointer-events-none after:absolute after:inset-0 after:-translate-x-[110%] after:bg-linear-110 after:from-transparent after:from-30% ' +
    'after:via-white/30 after:via-50% after:to-transparent after:to-70% after:transition-transform after:duration-700 after:ease-out-expo ' +
    'hover:enabled:after:translate-x-[110%]',
  ghost: 'border-line bg-transparent hover:enabled:border-accent/30 hover:enabled:bg-surface-2',
  danger: 'border-line bg-transparent text-bad-ink hover:enabled:border-bad/40 hover:enabled:bg-bad-soft',
};

const SIZE: Record<Size, string> = {
  md: 'min-h-[42px] px-3.5 py-2 md:min-h-[38px]',
  sm: 'min-h-9 px-2.5 py-1 text-[13px] md:min-h-8',
  icon: 'min-h-[30px] min-w-[30px] px-2 py-1 text-[13px]',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'soft', size = 'md', type = 'button', className, ...rest }: Props) {
  return <button type={type} className={cn(BASE, VARIANT[variant], SIZE[size], className)} {...rest} />;
}
