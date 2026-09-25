import { useMemo, useState } from 'react';
import type { FinanceData, Movement, MovementKind } from './types';
import { ACCOUNT_CURRENCY, ACCOUNT_ICON, ACCOUNT_LABEL, CLASS_LABEL, INCOME_LABEL, REASON_LABEL } from './constants';
import { fmtAccount, fmtBs, fmtUsd, isTransfer, movementBs, movementUsd } from './calc';
import { MONTH_NAMES, formatDM, fromISO, today } from '../lib/dates';
import MovementForm from './MovementForm';

interface Props {
  kind: MovementKind;
  data: FinanceData;
  onAdd: (items: Movement[]) => void;
  onUpdate: (m: Movement) => void;
  onDelete: (m: Movement) => void;
}

const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

export default function MovementsPage({ kind, data, onAdd, onUpdate, onDelete }: Props) {
  const t = today();
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [editing, setEditing] = useState<Movement | null>(null);
  const [filter, setFilter] = useState<'todos' | 'gasto' | 'costo' | 'cambios'>('todos');

  const key = monthKey(ym.y, ym.m);
  const shiftMonth = (d: number) => {
    const n = new Date(ym.y, ym.m + d, 1);
    setYm({ y: n.getFullYear(), m: n.getMonth() });
  };

  const monthItems = useMemo(
    () =>
      data.movements
        .filter((x) => x.kind === kind && x.date.startsWith(key))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.movements, kind, key],
  );

  const visible = monthItems.filter((x) =>
    filter === 'todos'
      ? true
      : filter === 'cambios'
        ? isTransfer(x)
        : !isTransfer(x) && x.expenseClass === filter,
  );

  const real = monthItems.filter((x) => !isTransfer(x));
  const totalUsd = real.reduce((s, x) => s + movementUsd(x), 0);
  const totalBs = real.reduce((s, x) => s + movementBs(x), 0);
  const gastoUsd = real.filter((x) => x.expenseClass === 'gasto').reduce((s, x) => s + movementUsd(x), 0);
  const costoUsd = real.filter((x) => x.expenseClass === 'costo').reduce((s, x) => s + movementUsd(x), 0);

  const submit = (items: Movement[], isEdit: boolean) => {
    if (isEdit) onUpdate(items[0]);
    else onAdd(items);
    setEditing(null);
  };

  const remove = (m: Movement) => {
    const msg = m.linkId
      ? '¿Eliminar este cambio? Se borrarán la salida y la entrada enlazadas.'
      : '¿Eliminar este movimiento?';
    if (!confirm(msg)) return;
    onDelete(m);
    if (editing?.id === m.id) setEditing(null);
  };

  const isSalida = kind === 'salida';

  return (
    <div className="two-col">
      <MovementForm kind={kind} data={data} editing={editing} onSubmit={submit} onCancel={() => setEditing(null)} />

      <section className="card">
        <div className="card-head">
          <div>
            <h2>{isSalida ? 'Salidas' : 'Entradas'}</h2>
            <p className="muted">
              {MONTH_NAMES[ym.m]} {ym.y}
            </p>
          </div>
          <div className="week-nav">
            <button className="btn ghost" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <button
              className="btn ghost"
              onClick={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}
              disabled={ym.y === t.getFullYear() && ym.m === t.getMonth()}
            >
              Este mes
            </button>
            <button className="btn ghost" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
        </div>

        <div className="mini-stats">
          <div>
            <span className="muted small">Total {isSalida ? 'salido' : 'entrado'}</span>
            <strong>{fmtUsd(totalUsd)}</strong>
            <span className="muted small">{fmtBs(totalBs)}</span>
          </div>
          {isSalida && (
            <>
              <div>
                <span className="muted small">Gastos</span>
                <strong>{fmtUsd(gastoUsd)}</strong>
              </div>
              <div>
                <span className="muted small">Costos</span>
                <strong>{fmtUsd(costoUsd)}</strong>
              </div>
            </>
          )}
          <div>
            <span className="muted small">Movimientos</span>
            <strong>{monthItems.length}</strong>
          </div>
        </div>
        <p className="muted small note">Los totales no incluyen cambios de divisas. Montos en $ y Bs con la tasa BCV de cada día.</p>

        {isSalida && (
          <div className="filters">
            {(
              [
                ['todos', 'Todos'],
                ['gasto', 'Gastos'],
                ['costo', 'Costos'],
                ['cambios', 'Cambios / ventas'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="empty">No hay {isSalida ? 'salidas' : 'entradas'} en este mes.</p>
        ) : (
          <ul className="list">
            {visible.map((m) => (
              <li key={m.id} className={`list-item mov ${editing?.id === m.id ? 'editing' : ''}`}>
                <span className="list-icon" aria-hidden title={ACCOUNT_LABEL[m.account]}>
                  {ACCOUNT_ICON[m.account]}
                </span>
                <div className="list-body">
                  <div className="task-top">
                    <strong>{m.description || (isSalida ? m.category ?? REASON_LABEL[m.reason!] : INCOME_LABEL[m.incomeType!])}</strong>
                  </div>
                  <div className="task-meta">
                    <span className="muted small">
                      {formatDM(fromISO(m.date))} · {ACCOUNT_LABEL[m.account]}
                    </span>
                    {isTransfer(m) ? (
                      <span className="tag tag-transfer">🔄 {isSalida ? REASON_LABEL[m.reason!] : 'Cambio'}</span>
                    ) : isSalida ? (
                      <>
                        <span className={`tag tag-${m.expenseClass}`}>{CLASS_LABEL[m.expenseClass!]}</span>
                        <span className="tag prio-baja">{m.category}</span>
                        {m.reason && m.reason !== 'compra' && <span className="tag prio-baja">{REASON_LABEL[m.reason]}</span>}
                      </>
                    ) : (
                      <span className="tag tag-income">{INCOME_LABEL[m.incomeType!]}</span>
                    )}
                    {m.account === 'usdt' && m.usdtRate && (
                      <span className="muted small">Tasa USDT {m.usdtRate.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
                <div className="mov-amount">
                  <strong className={isSalida ? 'amt-out' : 'amt-in'}>
                    {isSalida ? '−' : '+'}
                    {fmtAccount(m.account, m.amount)}
                  </strong>
                  <span className="muted small">
                    ≈ {ACCOUNT_CURRENCY[m.account] === 'USD' ? fmtBs(movementBs(m)) : fmtUsd(movementUsd(m))}
                  </span>
                </div>
                <div className="list-actions">
                  <button className="btn ghost small" onClick={() => setEditing(m)}>
                    Editar
                  </button>
                  <button className="btn danger small" onClick={() => remove(m)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
