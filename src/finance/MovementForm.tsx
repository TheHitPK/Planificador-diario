import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Account, Currency, ExpenseClass, ExpenseReason, FinanceData, IncomeType, Movement, MovementKind } from './types';
import {
  ACCOUNTS, ACCOUNT_CURRENCY, ACCOUNT_ICON, ACCOUNT_LABEL, CLASS_HINT, CLASS_LABEL, EXPENSE_CATEGORIES,
  INCOME_LABEL, REASON_LABEL, TRANSFER_REASONS, accountsOf,
} from './constants';
import { balances, fmtAccount, fmtBs, fmtEur, fmtNum, fmtUsd, parseAmount, toBs, toUsd, usdtAverageRate } from './calc';
import { newId } from '../lib/storage';
import { toISO, today } from '../lib/dates';

interface Props {
  kind: MovementKind;
  data: FinanceData;
  editing: Movement | null;
  onSubmit: (items: Movement[], isEdit: boolean) => void;
  onCancel: () => void;
}

const str = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? '' : String(n));

export default function MovementForm({ kind, data, editing, onSubmit, onCancel }: Props) {
  const isSalida = kind === 'salida';
  const bal = useMemo(() => balances(data.movements), [data.movements]);
  const avgUsdt = useMemo(() => usdtAverageRate(data.movements), [data.movements]);

  const [date, setDate] = useState(toISO(today()));
  const [currency, setCurrency] = useState<Currency>('USD');
  const [account, setAccount] = useState<Account>('zelle');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('sueldo');
  const [reason, setReason] = useState<ExpenseReason>('compra');
  const [expenseClass, setExpenseClass] = useState<ExpenseClass>('gasto');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [rateUsd, setRateUsd] = useState('');
  const [rateEur, setRateEur] = useState('');
  const [usdtRate, setUsdtRate] = useState('');
  const [toAccount, setToAccount] = useState<Account>('pagomovil');
  const [toAmount, setToAmount] = useState('');
  const [editRates, setEditRates] = useState(false);
  const [error, setError] = useState('');

  const isTransferReason = isSalida && TRANSFER_REASONS.includes(reason);

  // Carga el movimiento a editar
  useEffect(() => {
    if (!editing) return;
    setDate(editing.date);
    setCurrency(ACCOUNT_CURRENCY[editing.account]);
    setAccount(editing.account);
    setAmount(str(editing.amount));
    setDescription(editing.description);
    if (editing.incomeType) setIncomeType(editing.incomeType);
    if (editing.reason) setReason(editing.reason);
    if (editing.expenseClass) setExpenseClass(editing.expenseClass);
    if (editing.category) setCategory(editing.category);
    setRateUsd(str(editing.rateUsd));
    setRateEur(str(editing.rateEur));
    setUsdtRate(str(editing.usdtRate));
    setError('');
  }, [editing]);

  // Prellena las tasas BCV según la fecha (historial) o la tasa actual
  useEffect(() => {
    if (editing) return;
    const r = data.rateHistory[date] ?? data.rates;
    setRateUsd(r ? str(r.usd) : '');
    setRateEur(r ? str(r.eur) : '');
  }, [date, data.rates, data.rateHistory, editing]);

  // Al gastar USDT, propone tu tasa promedio de compra
  useEffect(() => {
    if (editing) return;
    if (isSalida && account === 'usdt') setUsdtRate(avgUsdt ? avgUsdt.toFixed(2) : '');
    else if (!isSalida) setUsdtRate('');
  }, [account, isSalida, avgUsdt, editing]);

  const changeCurrency = (c: Currency) => {
    setCurrency(c);
    setAccount(accountsOf(c)[0]);
  };

  // Cuenta destino por defecto para cambios: la otra moneda
  useEffect(() => {
    if (!isTransferReason) return;
    setToAccount(reason === 'venta_divisas' ? (currency === 'USD' ? 'pagomovil' : 'zelle') : account === 'usdt' ? 'zelle' : currency === 'USD' ? 'usdt' : 'pagomovil');
  }, [reason, currency, account, isTransferReason]);

  const nAmount = parseAmount(amount);
  const nRateUsd = parseAmount(rateUsd);
  const nRateEur = parseAmount(rateEur);
  const nUsdtRate = parseAmount(usdtRate);
  const nToAmount = parseAmount(toAmount);
  const ratesOk = nRateUsd > 0 && nRateEur > 0;

  // Tasa implícita del cambio (Bs por $), si una cuenta es en $ y la otra en Bs
  const impliedRate = useMemo(() => {
    if (!isTransferReason || !(nAmount > 0) || !(nToAmount > 0)) return null;
    const fromC = ACCOUNT_CURRENCY[account];
    const toC = ACCOUNT_CURRENCY[toAccount];
    if (fromC === toC) return null;
    return fromC === 'USD' ? nToAmount / nAmount : nAmount / nToAmount;
  }, [isTransferReason, nAmount, nToAmount, account, toAccount]);

  const available = bal[account] + (editing && editing.account === account ? (editing.kind === 'salida' ? editing.amount : -editing.amount) : 0);
  const overdraft = isSalida && nAmount > 0 && nAmount > available + 1e-9;

  const reset = () => {
    setAmount('');
    setDescription('');
    setToAmount('');
    setError('');
    setEditRates(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(nAmount > 0)) return setError('Escribe un monto mayor que 0.');
    if (!ratesOk) return setError('Falta la tasa BCV del dólar y del euro para ese día.');
    if (account === 'usdt' && usdtRate.trim() && !(nUsdtRate > 0)) return setError('La tasa USDT no es válida.');
    if (isTransferReason) {
      if (toAccount === account) return setError('La cuenta que recibe debe ser distinta.');
      if (!(nToAmount > 0)) return setError('Escribe cuánto recibiste.');
    }

    const base = {
      date,
      rateUsd: nRateUsd,
      rateEur: nRateEur,
    };

    if (editing) {
      const updated: Movement = {
        ...editing,
        ...base,
        account,
        amount: nAmount,
        description: description.trim(),
        incomeType: kind === 'entrada' ? incomeType : undefined,
        reason: isSalida ? reason : undefined,
        expenseClass: isSalida && !isTransferReason ? expenseClass : undefined,
        category: isSalida && !isTransferReason ? category : undefined,
        usdtRate: account === 'usdt' && nUsdtRate > 0 ? nUsdtRate : undefined,
      };
      onSubmit([updated], true);
      reset();
      return;
    }

    if (!isSalida) {
      onSubmit(
        [
          {
            id: newId(),
            kind: 'entrada',
            ...base,
            account,
            amount: nAmount,
            description: description.trim(),
            incomeType,
            usdtRate: account === 'usdt' && nUsdtRate > 0 ? nUsdtRate : undefined,
          },
        ],
        false,
      );
      reset();
      return;
    }

    if (!isTransferReason) {
      onSubmit(
        [
          {
            id: newId(),
            kind: 'salida',
            ...base,
            account,
            amount: nAmount,
            description: description.trim(),
            reason,
            expenseClass,
            category,
            usdtRate: account === 'usdt' && nUsdtRate > 0 ? nUsdtRate : undefined,
          },
        ],
        false,
      );
      reset();
      return;
    }

    // Cambio / venta de divisas: una salida y una entrada enlazadas
    const linkId = newId();
    const desc =
      description.trim() ||
      `${REASON_LABEL[reason]}: ${ACCOUNT_LABEL[account]} → ${ACCOUNT_LABEL[toAccount]}`;
    // Si compras USDT con Bs, la tasa de compra sale sola: Bs pagados / USDT recibidos
    const receivedUsdtRate =
      toAccount === 'usdt'
        ? ACCOUNT_CURRENCY[account] === 'VES'
          ? nAmount / nToAmount
          : account === 'usdt'
            ? undefined
            : nRateUsd * (nAmount / nToAmount)
        : undefined;

    onSubmit(
      [
        {
          id: newId(),
          kind: 'salida',
          ...base,
          account,
          amount: nAmount,
          description: desc,
          reason,
          usdtRate: account === 'usdt' && nUsdtRate > 0 ? nUsdtRate : undefined,
          linkId,
        },
        {
          id: newId(),
          kind: 'entrada',
          ...base,
          account: toAccount,
          amount: nToAmount,
          description: desc,
          incomeType: 'cambio',
          usdtRate: receivedUsdtRate,
          linkId,
        },
      ],
      false,
    );
    reset();
  };

  const preview =
    nAmount > 0 && ratesOk
      ? (() => {
          const usd = toUsd(account, nAmount, nRateUsd);
          const bsBcv = toBs(account, nAmount, nRateUsd);
          return { usd, bsBcv, eur: bsBcv / nRateEur };
        })()
      : null;

  const isLinkedEdit = !!editing?.linkId;

  return (
    <section className="card">
      <h2>
        {editing ? 'Editar' : 'Nueva'} {isSalida ? 'salida' : 'entrada'}
      </h2>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Fecha</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <div className="field">
          <span>Moneda</span>
          <div className="segmented">
            {(['USD', 'VES'] as Currency[]).map((c) => (
              <button
                type="button"
                key={c}
                className={currency === c ? 'active' : ''}
                onClick={() => changeCurrency(c)}
                disabled={isLinkedEdit}
              >
                {c === 'USD' ? '$ Dólares' : 'Bs Bolívares'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>{isSalida ? 'Sale de' : 'Entra a'}</span>
          <div className="segmented">
            {accountsOf(currency).map((a) => (
              <button
                type="button"
                key={a}
                className={account === a ? 'active' : ''}
                onClick={() => setAccount(a)}
                disabled={isLinkedEdit}
              >
                {ACCOUNT_ICON[a]} {ACCOUNT_LABEL[a]}
              </button>
            ))}
          </div>
          <span className="hint">Saldo actual: {fmtAccount(account, bal[account])}</span>
        </div>

        <label className="field">
          <span>Monto {account === 'usdt' ? '(USDT)' : currency === 'USD' ? '($)' : '(Bs)'}</span>
          <input
            className="input amount-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
          />
          {preview && (
            <span className="hint">
              ≈ {fmtUsd(preview.usd)} · {fmtBs(preview.bsBcv)} · {fmtEur(preview.eur)} <em>(tasa BCV)</em>
            </span>
          )}
          {overdraft && (
            <span className="hint warn">⚠ Es más de lo que tienes en {ACCOUNT_LABEL[account]} ({fmtAccount(account, available)}).</span>
          )}
        </label>

        {/* Entrada: tipo */}
        {!isSalida && (
          <label className="field">
            <span>Tipo de entrada</span>
            <select className="input" value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)} disabled={isLinkedEdit}>
              {Object.entries(INCOME_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Salida: motivo, clase y categoría */}
        {isSalida && (
          <label className="field">
            <span>Motivo</span>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ExpenseReason)} disabled={!!editing}>
              {Object.entries(REASON_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}

        {isSalida && !isTransferReason && (
          <>
            <div className="field">
              <span>Clasificación</span>
              <div className="segmented">
                {(['gasto', 'costo'] as ExpenseClass[]).map((c) => (
                  <button type="button" key={c} className={expenseClass === c ? 'active' : ''} onClick={() => setExpenseClass(c)}>
                    {CLASS_LABEL[c]}
                  </button>
                ))}
              </div>
              <span className="hint">{CLASS_HINT[expenseClass]}</span>
            </div>
            <label className="field">
              <span>Categoría</span>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {isTransferReason && !editing && (
          <fieldset className="subform">
            <legend>¿Qué recibiste?</legend>
            <div className="field">
              <span>Entra a</span>
              <select className="input" value={toAccount} onChange={(e) => setToAccount(e.target.value as Account)}>
                {ACCOUNTS.filter((a) => a !== account).map((a) => (
                  <option key={a} value={a}>
                    {ACCOUNT_ICON[a]} {ACCOUNT_LABEL[a]} ({ACCOUNT_CURRENCY[a] === 'USD' ? '$' : 'Bs'})
                  </option>
                ))}
              </select>
            </div>
            <label className="field">
              <span>Monto recibido {toAccount === 'usdt' ? '(USDT)' : ACCOUNT_CURRENCY[toAccount] === 'USD' ? '($)' : '(Bs)'}</span>
              <input className="input" inputMode="decimal" value={toAmount} onChange={(e) => setToAmount(e.target.value)} placeholder="0,00" />
            </label>
            {impliedRate !== null && (
              <span className="hint">
                Tasa del cambio: <strong>{fmtNum(impliedRate)} Bs por {account === 'usdt' || toAccount === 'usdt' ? 'USDT' : '$'}</strong>
                {ratesOk && ` · BCV: ${fmtNum(nRateUsd)}`}
              </span>
            )}
            {toAccount === 'usdt' && ACCOUNT_CURRENCY[account] === 'VES' && (
              <span className="hint">Se guardará como tu tasa de compra de USDT.</span>
            )}
          </fieldset>
        )}

        {/* USDT: tasa de compra */}
        {account === 'usdt' && (!isTransferReason || isSalida) && (
          <label className="field">
            <span>{isSalida ? 'Tasa a la que compraste esos USDT (Bs por USDT)' : 'Tasa a la que compraste (Bs por USDT)'}</span>
            <input className="input" inputMode="decimal" value={usdtRate} onChange={(e) => setUsdtRate(e.target.value)} placeholder="Opcional" />
            {isSalida && avgUsdt && <span className="hint">Tu tasa promedio de compra es {fmtNum(avgUsdt)} Bs.</span>}
            {nAmount > 0 && nUsdtRate > 0 && (
              <span className="hint">
                {fmtNum(nAmount)} USDT a tu tasa = <strong>{fmtBs(nAmount * nUsdtRate)}</strong>
                {ratesOk && ` · a tasa BCV = ${fmtBs(nAmount * nRateUsd)}`}
              </span>
            )}
          </label>
        )}

        <label className="field">
          <span>Descripción</span>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isSalida ? 'Ej. Mercado de la semana' : 'Ej. Pago quincena'}
          />
        </label>

        <div className="rates-line">
          {!editRates ? (
            <>
              <span className="muted small">
                Tasa BCV del día: {ratesOk ? `$ ${fmtNum(nRateUsd)} · € ${fmtNum(nRateEur)}` : 'sin tasa'}
              </span>
              <button type="button" className="btn ghost small" onClick={() => setEditRates(true)}>
                Cambiar
              </button>
            </>
          ) : (
            <div className="field-row">
              <label className="field">
                <span>BCV $ (Bs)</span>
                <input className="input" inputMode="decimal" value={rateUsd} onChange={(e) => setRateUsd(e.target.value)} />
              </label>
              <label className="field">
                <span>BCV € (Bs)</span>
                <input className="input" inputMode="decimal" value={rateEur} onChange={(e) => setRateEur(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn primary">
            {editing ? 'Guardar cambios' : isSalida ? 'Registrar salida' : 'Registrar entrada'}
          </button>
          {editing && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                reset();
                onCancel();
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
