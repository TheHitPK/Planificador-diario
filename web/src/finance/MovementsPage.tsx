import { useMemo, useState } from 'react';
import type { FinanceData, Movement, MovementKind } from './types';
import { ACCOUNT_CURRENCY, ACCOUNT_ICON, ACCOUNT_LABEL, CLASS_LABEL, INCOME_LABEL, REASON_LABEL } from './constants';
import { fmtAccount, fmtBs, fmtUsd, isTransfer, movementBs, movementUsd } from './calc';
import { MONTH_NAMES, formatDM, fromISO, today } from '../lib/dates';
import MovementForm from './MovementForm';
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from '../components/Icons';
import {
  Button, Card, CardHead, Chip, Empty, IconBadge, List, ListItem, MiniStat, MiniStats, Tag, TwoCol, cn, type TagTone,
} from '../ui';

const CLASS_TONE: Record<string, TagTone> = { gasto: 'out', costo: 'accent' };

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
    <TwoCol>
      <MovementForm kind={kind} data={data} editing={editing} onSubmit={submit} onCancel={() => setEditing(null)} />

      <Card delay={0.08}>
        <CardHead>
          <div>
            <h2>{isSalida ? 'Salidas' : 'Entradas'}</h2>
            <p className="text-ink-2">
              {MONTH_NAMES[ym.m]} {ym.y}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" className="px-2.5" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}
              disabled={ym.y === t.getFullYear() && ym.m === t.getMonth()}
            >
              Este mes
            </Button>
            <Button variant="ghost" className="px-2.5" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
              <ChevronRightIcon />
            </Button>
          </div>
        </CardHead>

        <MiniStats>
          <MiniStat label={`Total ${isSalida ? 'salido' : 'entrado'}`} value={fmtUsd(totalUsd)} sub={fmtBs(totalBs)} />
          {isSalida && (
            <>
              <MiniStat label="Gastos" value={fmtUsd(gastoUsd)} />
              <MiniStat label="Costos" value={fmtUsd(costoUsd)} />
            </>
          )}
          <MiniStat label="Movimientos" value={monthItems.length} />
        </MiniStats>
        <p className="mb-3.5 text-[13px] text-ink-2">
          Los totales no incluyen cambios de divisas. Montos en $ y Bs con la tasa BCV de cada día.
        </p>

        {isSalida && (
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {(
              [
                ['todos', 'Todos'],
                ['gasto', 'Gastos'],
                ['costo', 'Costos'],
                ['cambios', 'Cambios / ventas'],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} active={filter === id} onClick={() => setFilter(id)} aria-pressed={filter === id}>
                {label}
              </Chip>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <Empty>No hay {isSalida ? 'salidas' : 'entradas'} en este mes.</Empty>
        ) : (
          <List>
            {visible.map((m, i) => (
              <ListItem key={m.id} index={i} editing={editing?.id === m.id}>
                <IconBadge title={ACCOUNT_LABEL[m.account]}>{ACCOUNT_ICON[m.account]}</IconBadge>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong>{m.description || (isSalida ? m.category ?? REASON_LABEL[m.reason!] : INCOME_LABEL[m.incomeType!])}</strong>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[13px] text-ink-2">
                      {formatDM(fromISO(m.date))} · {ACCOUNT_LABEL[m.account]}
                    </span>
                    {isTransfer(m) ? (
                      <Tag className="inline-flex items-center gap-1">
                        <RefreshIcon size={12} />
                        {isSalida ? REASON_LABEL[m.reason!] : 'Cambio'}
                      </Tag>
                    ) : isSalida ? (
                      <>
                        <Tag tone={CLASS_TONE[m.expenseClass!]}>{CLASS_LABEL[m.expenseClass!]}</Tag>
                        <Tag>{m.category}</Tag>
                        {m.reason && m.reason !== 'compra' && <Tag>{REASON_LABEL[m.reason]}</Tag>}
                      </>
                    ) : (
                      <Tag tone="good">{INCOME_LABEL[m.incomeType!]}</Tag>
                    )}
                    {m.account === 'usdt' && m.usdtRate && (
                      <span className="text-[13px] text-ink-2">
                        Tasa USDT {m.usdtRate.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start tabular-nums sm:items-end sm:text-right">
                  <strong className={cn(!isSalida && 'text-good-ink')}>
                    {isSalida ? '−' : '+'}
                    {fmtAccount(m.account, m.amount)}
                  </strong>
                  <span className="text-[13px] text-ink-2">
                    ≈ {ACCOUNT_CURRENCY[m.account] === 'USD' ? fmtBs(movementBs(m)) : fmtUsd(movementUsd(m))}
                  </span>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(m)}>
                    Eliminar
                  </Button>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </TwoCol>
  );
}
