import { motion } from 'motion/react';
import { DAY_NAMES, MONTH_NAMES, weekdayIndex } from '../lib/dates';
import { EASE_OUT, useCountUp } from '../lib/motion';
import { Layer, ParallaxScene, cn } from '../ui';
import { Stars, Sun } from './Sky';

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

const SKY: Record<Phase, string> = {
  morning: 'bg-linear-[125deg,var(--color-tide-950)_0%,var(--color-tide-900)_48%,var(--color-tide-500)_100%]',
  afternoon: 'bg-linear-[125deg,var(--color-dusk-950)_0%,var(--color-dusk-800)_52%,var(--color-dusk-400)_135%]',
  night: 'bg-linear-[125deg,var(--color-night-950)_0%,var(--color-night-900)_55%,var(--color-night-800)_100%]',
};

const rise = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } } };

/** Encabezado de cada módulo: un paisaje por capas que se mueven con el scroll y el ratón. */
export default function PageHero({ id, title, subtitle, stats }: Props) {
  const now = new Date();
  const phase = phaseOf(now.getHours());
  const night = phase === 'night';
  const dateLabel = `${DAY_NAMES[weekdayIndex(now)]}, ${now.getDate()} de ${MONTH_NAMES[now.getMonth()].toLowerCase()}`;

  return (
    <ParallaxScene>
      <motion.section
        className={cn(
          'relative isolate flex overflow-hidden rounded-[22px] p-[22px] text-mist shadow-lift md:min-h-[232px] md:rounded-hero md:p-8',
          SKY[phase],
        )}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE_OUT }}
      >
        {/* Cuanto más lejos está la capa, más acompaña al scroll (se mueve menos en pantalla). */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Layer scroll={0.42} shiftX={-6} className="absolute inset-x-0 -inset-y-[30%]">
            <Stars night={night} />
          </Layer>
          <Layer
            scroll={0.3}
            shiftX={-22}
            shiftY={-14}
            className="absolute -top-[30px] -right-[18px] size-[104px] md:-top-1 md:right-[7%] md:size-[124px]"
          >
            <Sun night={night} />
          </Layer>
          <Layer scroll={0.16} shiftX={-10} className="absolute -bottom-px -left-[4%] h-[58%] w-[108%]">
            <svg className="size-full fill-white/7" viewBox="0 0 1200 200" preserveAspectRatio="none">
              <path d="M0 120c120-50 240-70 380-40s220 60 380 20 260-80 440-30v130H0Z" />
            </svg>
          </Layer>
          <Layer scroll={0.06} shiftX={12} className="absolute -bottom-px -left-[4%] h-[58%] w-[108%]">
            <svg className="size-full fill-[rgba(2,22,24,0.42)]" viewBox="0 0 1200 200" preserveAspectRatio="none">
              <path d="M0 150c160-40 300-10 460 10s300-50 460-40 190 40 280 30v50H0Z" />
            </svg>
          </Layer>
        </div>

        <div className="flex w-full flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <motion.div
            key={id}
            className="max-w-[560px]"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >
            <motion.p variants={rise} className="inline-flex items-center gap-2 text-[13px] font-semibold text-mist/80">
              <span className="size-[7px] rounded-full bg-dawn-400 shadow-[0_0_0_4px_rgba(251,191,90,0.25)]" />
              {dateLabel}
            </motion.p>
            <motion.h1
              variants={rise}
              className="mt-2.5 text-[clamp(27px,3.6vw,40px)] font-extrabold tracking-[-0.025em] [word-spacing:0.06em]"
            >
              {title}
            </motion.h1>
            <motion.p variants={rise} className="mt-2 text-base text-mist/80">
              {subtitle}
            </motion.p>
          </motion.div>

          <motion.ul
            className="m-0 flex w-full list-none flex-wrap gap-2.5 p-0 md:w-auto"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } } }}
          >
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </motion.ul>
        </div>
      </motion.section>
    </ParallaxScene>
  );
}

function Stat({ label, value, suffix }: HeroStat) {
  const shown = useCountUp(value);
  return (
    <motion.li
      variants={rise}
      className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/16 bg-[rgba(3,26,28,0.42)] px-3 py-2 backdrop-blur-md md:min-w-[108px] md:flex-none md:px-4 md:py-2.5"
    >
      <strong className="font-display text-[22px] leading-tight font-extrabold tabular-nums md:text-[26px]">
        {shown}
        {suffix && <span className="text-[15px] font-semibold opacity-70">{suffix}</span>}
      </strong>
      <span className="text-xs text-mist/80">{label}</span>
    </motion.li>
  );
}
