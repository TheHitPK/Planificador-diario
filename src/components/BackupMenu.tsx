import { useRef, useState, type ChangeEvent } from 'react';
import { exportBackup, parseBackup, type BackupData } from '../lib/backup';
import { DownloadIcon, UploadIcon } from './Icons';

interface Props {
  data: BackupData;
  /** Sube el respaldo al servidor. Lanza si falla (ej. la cuenta ya tiene datos). */
  onImport: (data: BackupData) => Promise<string>;
}

type Notice = { tone: 'ok' | 'error'; text: string } | null;

export default function BackupMenu({ data, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const flash = (n: Notice) => {
    setNotice(n);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const handleExport = () => {
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
    <div className="backup">
      <button className="btn ghost small" onClick={handleExport} title="Descargar todos tus datos en un archivo .json">
        <DownloadIcon size={15} />
        Exportar
      </button>
      <button
        className="btn ghost small"
        onClick={() => fileRef.current?.click()}
        title="Subir un respaldo .json a tu cuenta (solo si está vacía)"
      >
        <UploadIcon size={15} />
        Importar
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
      {notice && (
        <span className={`notice notice-${notice.tone}`} role="status">
          {notice.text}
        </span>
      )}
    </div>
  );
}
