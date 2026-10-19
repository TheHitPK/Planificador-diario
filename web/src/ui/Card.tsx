import type { HTMLAttributes, ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, type HTMLMotionProps } from 'motion/react';
import { EASE_OUT } from '../lib/motion';
import { cn } from './cn';

interface CardProps extends Omit<HTMLMotionProps<'section'>, 'children'> {
  as?: 'section' | 'article';
  /** Segundos de espera antes de aparecer, para escalonar tarjetas vecinas. */
  delay?: number;
  /** Se eleva al pasar el cursor (para tarjetas pequeñas, no formularios). */
  lift?: boolean;
  children?: ReactNode;
}

/** Tarjeta: aparece al entrar en pantalla y muestra un brillo que sigue al cursor. */
export function Card({ as = 'section', delay = 0, lift = false, className, children, ...rest }: CardProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, color-mix(in srgb, var(--accent) 11%, transparent), transparent 62%)`;
  const Tag = as === 'article' ? motion.article : motion.section;

  return (
    <Tag
      className={cn(
        'group/card relative isolate rounded-card border border-line bg-surface p-[18px] shadow-card md:p-[22px]',
        'transition-[box-shadow,border-color] duration-300 hover:border-accent/25 hover:shadow-lift',
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={lift ? { y: -3 } : undefined}
      viewport={{ once: true, margin: '0px 0px -6% 0px' }}
      transition={{ duration: 0.65, ease: EASE_OUT, delay }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      {...rest}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{ background: glow }}
      />
      {children}
    </Tag>
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('mb-4', className)} {...rest} />;
}

/** Cabecera con el título a la izquierda y controles a la derecha. */
export function CardHead({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3 [&_p]:mt-1', className)} {...rest} />;
}
