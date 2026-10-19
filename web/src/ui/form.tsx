import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

/** Columna de campos de un formulario. */
export const formClass = 'flex flex-col gap-3.5';

const LABEL = 'text-[13px] font-semibold text-ink-2';

interface FieldProps {
  label: ReactNode;
  /** 'div' cuando el control no es un único input (p. ej. un grupo de botones). */
  as?: 'label' | 'div';
  /** Etiqueta y control en la misma línea. */
  inline?: boolean;
  /** id del control, si la etiqueta debe enlazarse con htmlFor. */
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, as = 'label', inline = false, htmlFor, className, children }: FieldProps) {
  const cls = cn('flex flex-1 gap-1.5', inline ? 'flex-row items-center justify-between' : 'flex-col', className);
  if (as === 'label') {
    return (
      <label className={cls}>
        <span className={LABEL}>{label}</span>
        {children}
      </label>
    );
  }
  return (
    <div className={cls}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={LABEL}>
          {label}
        </label>
      ) : (
        <span className={LABEL}>{label}</span>
      )}
      {children}
    </div>
  );
}

export function FieldRow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-3 sm:flex-row', className)} {...rest} />;
}

export function FormActions({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap gap-2', className)} {...rest} />;
}

/* text-base (16px) en móvil evita el zoom automático de iOS al enfocar. */
const CONTROL =
  'w-full min-h-11 rounded-ctl border border-line bg-field px-3 py-2 text-base text-ink transition duration-150 md:min-h-10 md:text-[15px] ' +
  'placeholder:text-muted hover:border-accent/35 focus:border-accent focus:bg-surface focus:shadow-ring focus:outline-2 focus:outline-transparent ' +
  'disabled:opacity-60';

const AMOUNT = 'font-display text-xl font-bold tabular-nums md:text-xl';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Cifra destacada (montos, peso). */
  amount?: boolean;
}

export function Input({ amount = false, className, ...rest }: InputProps) {
  return <input className={cn(CONTROL, amount && AMOUNT, className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, 'resize-y', className)} {...rest} />;
}

type HintTone = 'plain' | 'warn' | 'ok';
const HINT_TONE: Record<HintTone, string> = { plain: 'text-ink-2', warn: 'text-warn-ink', ok: 'text-good-ink' };

export function Hint({ tone = 'plain', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: HintTone }) {
  return <span className={cn('text-[12.5px]', HINT_TONE[tone], className)} {...rest} />;
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[13px] font-semibold text-bad-ink">
      {children}
    </p>
  );
}
