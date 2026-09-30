import { useState } from 'react';
import { describeImport, importToServer, markLegacyMigrated, readLegacyData } from '../api/migration';
import { useToast } from './Toaster';

/**
 * Aparece si este navegador tiene datos de la versión anterior (sin servidor) y la cuenta está vacía.
 * Los datos locales no se borran: solo se deja de mostrar el aviso.
 */
export default function MigrationBanner({ onDone }: { onDone: () => Promise<void> }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const data = readLegacyData();
  const summary = [
    `${data.activities.length} disciplinas`,
    `${Object.keys(data.checks).length} días`,
    `${data.tasks.length} pendientes`,
    `${data.finance?.movements.length ?? 0} movimientos`,
    `${data.nutrition?.log.length ?? 0} comidas`,
  ].join(', ');

  const migrate = async () => {
    setBusy(true);
    try {
      const result = await importToServer(data);
      markLegacyMigrated();
      await onDone();
      notify(describeImport(result), 'ok');
      setHidden(true);
    } catch (e) {
      notify((e as Error).message);
      setBusy(false);
    }
  };

  const dismiss = () => {
    markLegacyMigrated();
    setHidden(true);
  };

  return (
    <section className="card migration" role="region" aria-label="Migrar datos">
      <div>
        <h2>Tienes datos guardados en este navegador</h2>
        <p className="muted">
          De la versión anterior: {summary}. Súbelos a tu cuenta para verlos desde cualquier dispositivo.
        </p>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={migrate} disabled={busy}>
          {busy ? 'Subiendo…' : 'Subir a mi cuenta'}
        </button>
        <button className="btn ghost" onClick={dismiss} disabled={busy}>
          Ahora no
        </button>
      </div>
    </section>
  );
}
