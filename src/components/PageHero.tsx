import { useRef } from 'react';
import { DAY_NAMES, MONTH_NAMES, weekdayIndex } from '../lib/dates';
import { useCountUp, useParallaxVars } from '../lib/motion';

export interface HeroStat {
  label: string;
  value: number;
  /** Texto tras la cifra, p. ej. "/5". */
  suffix?: string;
}

interface Props {
  /** Cambia al cambiar de módulo: reinicia la animación del texto. */
  id: string;
  title: string;
  subtitle: string;
  stats: HeroStat[];
}

type Phase = 'morning' | 'afternoon' | 'night';

const phaseOf = (hour: number): Phase => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 19 ? 'afternoon' : 'night');

export const greetingFor = (date = new Date()) =>
  ({ morning: 'Buenos días', afternoon: 'Buenas tardes', night: 'Buenas noches' })[phaseOf(date.getHours())];

/** Encabezado de cada módulo: un paisaje por capas que se mueven con el scroll y el ratón. */
export default function PageHero({ id, title, subtitle, stats }: Props) {
  const ref = useRef<HTMLElement>(null);
  useParallaxVars(ref);
  const now = new Date();
  const dateLabel = `${DAY_NAMES[weekdayIndex(now)]}, ${now.getDate()} de ${MONTH_NAMES[now.getMonth()].toLowerCase()}`;

  return (
    <section ref={ref} className="banner" data-phase={phaseOf(now.getHours())}>
      <div className="banner-art" aria-hidden="true">
        <div className="banner-layer banner-stars" />
        <div className="banner-layer banner-sun">
          <span className="sun-ring ring-3" />
          <span className="sun-ring ring-2" />
          <span className="sun-ring ring-1" />
          <span className="sun-disc" />
        </div>
        <svg className="banner-layer banner-hills hills-back" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path d="M0 120c120-50 240-70 380-40s220 60 380 20 260-80 440-30v130H0Z" />
        </svg>
        <svg className="banner-layer banner-hills hills-front" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path d="M0 150c160-40 300-10 460 10s300-50 460-40 190 40 280 30v50H0Z" />
        </svg>
      </div>

      <div className="banner-body">
        <div key={id} className="banner-text">
          <p className="banner-eyebrow">{dateLabel}</p>
          <h1>{title}</h1>
          <p className="banner-sub">{subtitle}</p>
        </div>
        <ul className="banner-stats">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: HeroStat) {
  const shown = useCountUp(value);
  return (
    <li>
      <strong>
        {shown}
        {suffix && <span className="banner-stat-suffix">{suffix}</span>}
      </strong>
      <span>{label}</span>
    </li>
  );
}
