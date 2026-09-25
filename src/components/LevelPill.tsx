import { LEVEL_ICON, LEVEL_LABEL, type Level } from '../lib/stats';

interface Props {
  level: Level;
  text: string;
  showLabel?: boolean;
}

/** Píldora de semáforo: color + icono + texto, nunca solo color. */
export default function LevelPill({ level, text, showLabel = true }: Props) {
  return (
    <span className={`pill pill-${level}`} title={LEVEL_LABEL[level]}>
      <span className="pill-icon" aria-hidden>
        {LEVEL_ICON[level]}
      </span>
      <span className="pill-text">{text}</span>
      {showLabel && <span className="pill-label">{LEVEL_LABEL[level]}</span>}
    </span>
  );
}
