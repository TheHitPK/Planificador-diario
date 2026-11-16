import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { exportBackup, exportExcel, parseBackup, type BackupData } from '../lib/backup';
import { DatabaseIcon, DownloadIcon, SheetIcon, UploadIcon } from './Icons';
import { Button, cn } from '../ui';

interface Props {
  data: BackupData;
  /** Sube el respaldo al servidor. Lanza si falla (ej. la cuenta ya tiene datos). */
  onImport: (data: BackupData) => Promise<string>;
}

type Notice = { tone: 'ok' | 'error'; text: string } | null;

export default function BackupMenu({ data, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [open, setOpen] = useState(false);
  const [building, setBuilding] = useState(false);

  const flash = (n: Notice) => {
    setNotice(n);
    window.setTimeout(() => setNotice(null), 4000);
  };

  // El menú se cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleExcel = async () => {
    setOpen(false);
    setBuilding(true);
    try {
      await exportExcel();
      flash({ tone: 'ok', text: 'Informe en Excel descargado.' });
    } catch (err) {
      flash({ tone: 'error', text: err instanceof Error ? err.message : 'No se pudo generar el Excel.' });
    } finally {
      setBuilding(false);
    }
  };

  const handleBackup = () => {
    setOpen(false);
    exportBackup(data);
    flash({ tone: 'ok', text: 'Respaldo descargado.' });
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      const backup = await parseBackup(file);
      const summary = `${backup.activities.length} disciplinas, ${Object.keys(backup.checks).length} días registrados y ${backup.tasks.length} pendientes${
        backup.finance ? `, ${backup.finance.movements.length} movimientos de dinero` : ''
      }${backup.nutrition ? `, ${backup.nutrition.log.length} alimentos registrados y ${backup.nutrition.body.length} registros corporales` : ''
      }`;
      if (!confirm(`Se cargará en tu cuenta: ${summary}. Solo funciona si tu cuenta está vacía. ¿Continuar?`)) return;
      flash({ tone: 'ok', text: await onImport(backup) });
    } catch (err) {
      flash({ tone: 'error', text: err instanceof Error ? err.message : 'No se pudo importar.' });
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <div ref={menuRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          disabled={building}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {building ? (
            <span className="size-[15px] animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          ) : (
            <DownloadIcon size={15} />
          )}
          {building ? 'Generando…' : 'Exportar'}
        </Button>
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              aria-label="Exportar"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute top-[calc(100%+8px)] left-0 z-50 flex w-[280px] origin-top-left flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-lift"
            >
              <MenuItem
                icon={<SheetIcon />}
                title="Informe en Excel"
                detail="Una hoja por módulo, con resumen y gráficos (.xlsx)"
                onClick={handleExcel}
              />
              <MenuItem
                icon={<DatabaseIcon />}
                title="Respaldo de datos"
                detail="Copia completa para restaurar con Importar (.json)"
                onClick={handleBackup}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        title="Subir un respaldo .json a tu cuenta (solo si está vacía)"
      >
        <UploadIcon size={15} />
        Importar
      </Button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
      <AnimatePresence>
        {notice && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute top-[calc(100%+8px)] right-0 rounded-ctl border border-line bg-surface px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap shadow-lift',
              notice.tone === 'ok' ? 'text-good-ink' : 'text-bad-ink',
            )}
          >
            {notice.text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-start gap-2.5 rounded-ctl px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
    >
      <span className="mt-0.5 flex-none text-accent">{icon}</span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[12.5px] text-ink-2">{detail}</span>
      </span>
    </button>
  );
}
