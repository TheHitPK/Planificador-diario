import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertIcon, CheckCircleIcon } from './Icons';
import { cn } from '../ui';

type Tone = 'ok' | 'error';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

/** Avisos flotantes (errores de la API, confirmaciones). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const notify = useCallback((text: string, tone: Tone = 'error') => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-100 flex flex-col items-end gap-2 md:bottom-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={cn(
                'pointer-events-auto flex max-w-[420px] items-start gap-2.5 rounded-[14px] border border-l-4 border-line bg-surface/95 px-3.5 py-2.5 text-sm shadow-lift backdrop-blur-md',
                t.tone === 'error' ? 'border-l-bad' : 'border-l-good',
              )}
            >
              <span className={cn('mt-px flex-none', t.tone === 'error' ? 'text-bad-ink' : 'text-good-ink')}>
                {t.tone === 'error' ? <AlertIcon /> : <CheckCircleIcon />}
              </span>
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
