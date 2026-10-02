import { useEffect, useState, type RefObject } from 'react';

type ElRef = RefObject<HTMLElement | null>;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Publica el scroll y la posición del ratón como variables CSS en el elemento
 * (--sy en px, --px y --py entre -1 y 1). Las capas parallax las leen desde el CSS.
 * Se escriben en el propio elemento y no en :root para no recalcular toda la página.
 */
export function useParallaxVars(ref: ElRef) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      // El puntero se suaviza para que las capas no salten con cada movimiento.
      x += (targetX - x) * 0.1;
      y += (targetY - y) * 0.1;
      el.style.setProperty('--sy', String(Math.round(window.scrollY)));
      el.style.setProperty('--px', x.toFixed(3));
      el.style.setProperty('--py', y.toFixed(3));
      if (Math.abs(targetX - x) > 0.002 || Math.abs(targetY - y) > 0.002) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [ref]);
}

/** Barra de progreso de lectura (--progress, 0 a 1) y marca data-scrolled al dejar el tope de la página. */
export function useScrollChrome(ref: ElRef) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty('--progress', max > 0 ? Math.min(window.scrollY / max, 1).toFixed(4) : '0');
      el.toggleAttribute('data-scrolled', window.scrollY > 8);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
}

/**
 * Las tarjetas aparecen al entrar en pantalla, escalonadas. Usa atributos data-*
 * (y no clases) porque React reescribe className al re-renderizar.
 * Sin JS o con "reducir movimiento" no se activa y todo queda visible.
 */
export function useScrollReveal(ref: ElRef, selector = '.card, .banner') {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    root.dataset.reveal = 'on';
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 70}ms`);
            el.dataset.in = '';
            io.unobserve(el);
          });
      },
      { rootMargin: '0px 0px -6% 0px' },
    );

    const scan = () => {
      root.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      delete root.dataset.reveal;
    };
  }, [ref, selector]);
}

/** Brillo que sigue al cursor dentro de cada tarjeta (--mx, --my en px). */
export function useSpotlight(ref: ElRef, selector = '.card') {
  useEffect(() => {
    const root = ref.current;
    if (!root || !window.matchMedia('(hover: hover)').matches) return;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>(selector);
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
      card.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
    };
    root.addEventListener('pointermove', onMove, { passive: true });
    return () => root.removeEventListener('pointermove', onMove);
  }, [ref, selector]);
}

/** Número que sube hasta su valor (para las cifras del encabezado). */
export function useCountUp(value: number, duration = 700) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (prefersReducedMotion() || value === 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}
