import { useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/** Curva de llegada suave, compartida por todas las entradas. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Posición del ratón entre -1 y 1, suavizada con un muelle (las capas parallax la leen). */
export function usePointer() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [x, y]);
  const spring = { stiffness: 50, damping: 18, mass: 0.6 };
  return { px: useSpring(x, spring), py: useSpring(y, spring) };
}

/** Número que sube hasta su valor (para las cifras del encabezado). */
export function useCountUp(value: number, duration = 0.7) {
  const [shown, setShown] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, { duration, ease: EASE_OUT, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, duration, reduced]);
  return shown;
}
