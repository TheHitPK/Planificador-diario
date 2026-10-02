import { useRef } from 'react';
import { useParallaxVars } from '../lib/motion';

/** Fondo fijo decorativo: halos de color que se desplazan a distinta velocidad que el contenido. */
export default function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useParallaxVars(ref);
  return (
    <div ref={ref} className="backdrop" aria-hidden="true">
      <div className="backdrop-grid" />
      <div className="orb-wrap orb-a">
        <div className="orb" />
      </div>
      <div className="orb-wrap orb-b">
        <div className="orb" />
      </div>
      <div className="orb-wrap orb-c">
        <div className="orb" />
      </div>
    </div>
  );
}
