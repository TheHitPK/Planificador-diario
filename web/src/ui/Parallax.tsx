import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type HTMLMotionProps, type MotionValue } from 'motion/react';
import { usePointer } from '../lib/motion';

interface Scene {
  px: MotionValue<number>;
  py: MotionValue<number>;
  scrollY: MotionValue<number>;
  still: boolean;
}

const SceneContext = createContext<Scene | null>(null);

/** Publica el scroll y el puntero para las capas que contiene. Con "reducir movimiento" las capas quedan fijas. */
export function ParallaxScene({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();
  const { px, py } = usePointer();
  const still = useReducedMotion() ?? false;
  const scene = useMemo(() => ({ px, py, scrollY, still }), [px, py, scrollY, still]);
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
}

interface LayerProps extends HTMLMotionProps<'div'> {
  /** Píxeles que la capa baja por cada píxel de scroll (negativo: sube). Cuanto más lejos, más cerca de 1. */
  scroll?: number;
  /** Desplazamiento máximo en px cuando el ratón llega al borde de la ventana. */
  shiftX?: number;
  shiftY?: number;
  /** Tope del desplazamiento vertical, para capas que no deben salirse de la pantalla. */
  minY?: number;
}

export function Layer({ scroll = 0, shiftX = 0, shiftY = 0, minY, style, ...rest }: LayerProps) {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error('Layer debe ir dentro de ParallaxScene');
  const { px, py, scrollY, still } = scene;
  const x = useTransform(() => (still ? 0 : px.get() * shiftX));
  const y = useTransform(() => {
    if (still) return 0;
    const v = scrollY.get() * scroll + py.get() * shiftY;
    return minY === undefined ? v : Math.max(v, minY);
  });
  return <motion.div style={{ ...style, x, y }} {...rest} />;
}
