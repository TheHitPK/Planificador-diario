import { LEVEL_ICON, LEVEL_LABEL, type Level } from '../lib/stats';
import { cn } from '../ui';

interface Props {
  level: Level;
  text: string;
  showLabel?: boolean;
}

const TONE: Record<Level, { pill: string; icon: string }> = {
  green: { pill: 'bg-good-soft text-good-ink', icon: 'bg-good text-white' },
  yellow: { pill: 'bg-warn-soft text-warn-ink', icon: 'bg-warn text-warn-on' },
  red: { pill: 'bg-bad-soft text-bad-ink', icon: 'bg-bad text-white' },
  none: { pill: 'bg-surface-2 text-muted', icon: 'bg-muted text-surface' },
};

/** Píldora de semáforo: color + icono + texto, nunca solo color. */
export default function LevelPill({ level, text, showLabel = true }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-1 text-[13px] font-semibold whitespace-nowrap tabular-nums',
        TONE[level].pill,
      )}
      title={LEVEL_LABEL[level]}
    >
      <span className={cn('grid size-[18px] place-items-center rounded-full text-[11px]', TONE[level].icon)} aria-hidden>
        {LEVEL_ICON[level]}
      </span>
      <span>{text}</span>
      {showLabel && <span className="hidden font-medium opacity-85 sm:inline">{LEVEL_LABEL[level]}</span>}
    </span>
  );
}
