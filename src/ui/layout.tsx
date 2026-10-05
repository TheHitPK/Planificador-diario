import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/* min-w-0 en los hijos evita que una tabla ancha estire la página en pantallas pequeñas. */

/** Bloques apilados con la separación estándar entre tarjetas. */
export function Stack({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-6 *:min-w-0', className)} {...rest} />;
}

/** Formulario estrecho a la izquierda y contenido a la derecha; una sola columna en pantallas pequeñas. */
export function TwoCol({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid items-start gap-6 *:min-w-0 lg:grid-cols-[minmax(280px,380px)_1fr]', className)} {...rest} />;
}

/** Dos tarjetas por fila. */
export function Grid2({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4 *:min-w-0 lg:grid-cols-2', className)} {...rest} />;
}
