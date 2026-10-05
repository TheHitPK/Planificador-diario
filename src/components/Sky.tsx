import { cn } from '../ui';

/* Piezas del paisaje que comparten el encabezado y la pantalla de acceso. */

export function Stars({ night = false }: { night?: boolean }) {
  return (
    <div
      className={cn(
        'size-full bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1.5px),radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1.5px)]',
        '[background-position:0_0,40px_60px] [background-size:90px_90px,140px_140px] [mask-image:linear-gradient(to_bottom,#000,transparent_80%)]',
        night ? 'opacity-95' : 'opacity-35',
      )}
    />
  );
}

/** Sol con anillos; de noche pasa a luna. Ocupa todo su contenedor. */
export function Sun({ night = false }: { night?: boolean }) {
  return (
    <>
      <span className="absolute -inset-24 rounded-full border border-white/18 opacity-35" />
      <span className="absolute -inset-14 rounded-full border border-white/18 opacity-65" />
      <span className="absolute -inset-6 rounded-full border border-white/18" />
      <span
        className={cn(
          'absolute inset-0 animate-breathe rounded-full',
          night
            ? 'bg-[radial-gradient(circle_at_35%_30%,white,var(--color-moon-200)_50%,var(--color-moon-400))] shadow-[0_0_50px_8px_rgba(190,205,255,0.35),0_0_120px_30px_rgba(120,150,255,0.18)]'
            : 'bg-[radial-gradient(circle_at_35%_30%,var(--color-dawn-200),var(--color-dawn-400)_45%,var(--color-coral-500))] shadow-[0_0_60px_10px_rgba(251,191,90,0.45),0_0_140px_40px_rgba(249,115,96,0.25)]',
        )}
      />
    </>
  );
}
