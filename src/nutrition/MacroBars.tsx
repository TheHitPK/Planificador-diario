import { motion } from 'motion/react';
import type { Macros, Targets } from './types';
import { MACRO_KEYS, MACRO_LABEL, MACRO_UNIT, fmt1, type MacroKey } from './calc';
import { EASE_OUT } from '../lib/motion';
import { AlertIcon, CheckCircleIcon } from '../components/Icons';
import { cn } from '../ui';

/** Macros que conviene no pasar (límite) vs. los que conviene alcanzar (mínimo). */
const IS_MINIMUM: Record<MacroKey, boolean> = { kcal: false, protein: true, carbs: false, fat: false, fiber: true };

const FILL: Record<MacroKey, string> = {
  kcal: 'bg-macro-kcal',
  protein: 'bg-macro-protein',
  carbs: 'bg-macro-carbs',
  fat: 'bg-macro-fat',
  fiber: 'bg-macro-fiber',
};

const STATUS_TONE = { ok: 'text-good-ink', over: 'text-bad-ink', none: 'text-ink' } as const;

interface Props {
  consumed: Macros;
  targets: Targets;
}

export default function MacroBars({ consumed, targets }: Props) {
  return (
    <div className="flex flex-col gap-3.5">
      {MACRO_KEYS.map((k, i) => {
        const target = targets[k];
        const value = consumed[k];
        const pct = target > 0 ? Math.round((value / target) * 100) : 0;
        const status = IS_MINIMUM[k] ? (pct >= 100 ? 'ok' : 'none') : pct > 105 ? 'over' : pct >= 90 ? 'ok' : 'none';
        return (
          <div key={k}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 tabular-nums">
              <span>
                <strong className="text-base">{MACRO_LABEL[k]}</strong>
                <span className="text-ink-2">
                  {' '}— {fmt1(value)} / {fmt1(target)} {MACRO_UNIT[k]}
                </span>
              </span>
              <span className={cn('inline-flex items-center gap-1 font-display text-base font-extrabold whitespace-nowrap', STATUS_TONE[status])}>
                {status === 'over' && <AlertIcon size={15} aria-label="Te pasaste" aria-hidden={false} />}
                {status === 'ok' && <CheckCircleIcon size={15} aria-label="Objetivo cumplido" aria-hidden={false} />}
                {pct}%
              </span>
            </div>
            <div
              className="h-3.5 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={MACRO_LABEL[k]}
            >
              {/* El reflejo (::after) da volumen sin cambiar el color del dato. */}
              <motion.span
                className={cn(
                  'relative block h-full overflow-hidden rounded-full after:absolute after:inset-0 after:bg-linear-to-b after:from-white/30 after:to-transparent after:to-60%',
                  FILL[k],
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay: i * 0.06 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
