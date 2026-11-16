import { Layer, ParallaxScene } from '../ui';

const ORB = 'size-full animate-drift rounded-full blur-[72px]';

/** Fondo fijo decorativo: halos de color que se desplazan a distinta velocidad que el contenido. */
export default function Backdrop() {
  return (
    <ParallaxScene>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Layer
          scroll={-0.05}
          minY={-180}
          className="absolute inset-x-0 -inset-y-[200px] bg-[radial-gradient(var(--dot)_1px,transparent_1.4px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_55%_at_50%_12%,#000_15%,transparent_75%)]"
        />
        <Layer scroll={-0.12} shiftX={-26} shiftY={-18} className="absolute -top-[200px] -left-[140px] size-[560px]">
          <div className={`${ORB} bg-orb-a`} />
        </Layer>
        <Layer scroll={-0.06} shiftX={34} shiftY={22} className="absolute -top-[120px] -right-[120px] size-[480px]">
          <div className={`${ORB} bg-orb-b [animation-direction:alternate-reverse] [animation-duration:23s]`} />
        </Layer>
        <Layer scroll={-0.2} shiftX={-16} shiftY={12} minY={-520} className="absolute -bottom-[420px] left-[30%] size-[620px]">
          <div className={`${ORB} bg-orb-c [animation-duration:27s]`} />
        </Layer>
      </div>
    </ParallaxScene>
  );
}
