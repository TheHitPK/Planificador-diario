import type { Rates } from './types';

/**
 * Tasas oficiales BCV desde ve.dolarapi.com (API pública no oficial, permite CORS).
 * Si falla, la app permite escribir la tasa a mano.
 */
const USD_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const EUR_URL = 'https://ve.dolarapi.com/v1/euros/oficial';

interface ApiRate {
  promedio: number | null;
  fechaActualizacion: string;
}

async function getRate(url: string): Promise<ApiRate> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as ApiRate;
  if (typeof data.promedio !== 'number' || data.promedio <= 0) throw new Error('Respuesta sin tasa');
  return data;
}

export async function fetchBcvRates(): Promise<Rates> {
  const [usd, eur] = await Promise.all([getRate(USD_URL), getRate(EUR_URL)]);
  return {
    usd: usd.promedio!,
    eur: eur.promedio!,
    // "2026-09-25T00:00:00-04:00" -> "2026-09-25" (fecha de Venezuela)
    date: usd.fechaActualizacion.slice(0, 10),
    source: 'bcv',
  };
}
