import type { Macros, Targets } from './types';
import { MACRO_KEYS, MACRO_LABEL, MACRO_UNIT, fmt1, type MacroKey } from './calc';

/** Macros que conviene no pasar (límite) vs. los que conviene alcanzar (mínimo). */
const IS_MINIMUM: Record<MacroKey, boolean> = { kcal: false, protein: true, carbs: false, fat: false, fiber: true };

interface Props {
  consumed: Macros;
  targets: Targets;
}

export default function MacroBars({ consumed, targets }: Props) {
  return (
    <div className="macro-bars">
      {MACRO_KEYS.map((k) => {
        const target = targets[k];
        const value = consumed[k];
        const pct = target > 0 ? Math.round((value / target) * 100) : 0;
        const status = IS_MINIMUM[k] ? (pct >= 100 ? 'ok' : 'none') : pct > 105 ? 'over' : pct >= 90 ? 'ok' : 'none';
        return (
          <div key={k} className="macro-row">
            <div className="macro-head">
              <span>
                <strong>{MACRO_LABEL[k]}</strong>
                <span className="muted">
                  {' '}— {fmt1(value)} / {fmt1(target)} {MACRO_UNIT[k]}
                </span>
              </span>
              <span className={`macro-pct pct-${status}`}>
                {status === 'over' && '⚠ '}
                {status === 'ok' && '✓ '}
                {pct}%
              </span>
            </div>
            <div className="macro-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={MACRO_LABEL[k]}>
              <span className={`macro-fill m-${k}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
