import { useRef, useState, type ChangeEvent } from 'react';
import { exportBackup, parseBackup, type BackupData } from '../lib/backup';

interface Props {
  data: BackupData;
  onImport: (data: BackupData) => void;
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
      if (!confirm(`Se reemplazarán TODOS tus datos actuales por los del respaldo (${summary}). ¿Continuar?`)) return;
      onImport(backup);
      flash({ tone: 'ok', text: 'Datos importados.' });
    } catch (err) {
      flash({ tone: 'error', text: err instanceof Error ? err.message : 'No se pudo importar.' });
    }
  };

  return (
    <div className="backup">
      <button className="btn ghost small" onClick={handleExport} title="Descargar todos tus datos en un archivo .json">
        ⬇ Exportar
      </button>
      <button
        className="btn ghost small"
        onClick={() => fileRef.current?.click()}
        title="Cargar un respaldo .json (reemplaza los datos actuales)"
      >
        ⬆ Importar
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
