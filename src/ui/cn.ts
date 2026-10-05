import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une clases de Tailwind; si dos chocan (p. ej. dos paddings), gana la última. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
