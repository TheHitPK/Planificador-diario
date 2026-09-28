import { useEffect, useState } from 'react';
import type { Activity, BodyEntry, Goal, Profile, Sex, Targets } from './types';
import { ACTIVITY_LABEL, GOAL_LABEL, GOAL_PROTEIN_PER_KG } from './defaults';
import { MACRO_KEYS, MACRO_LABEL, MACRO_UNIT, computePlan, fmt1, latestBody, latestBodyFat } from './calc';
import { parseAmount } from '../finance/calc';

interface Props {
  profile: Profile | null;
  targets: Targets;
  body: BodyEntry[];
  onProfile: (p: Profile) => void;
  onTargets: (t: Targets) => void;
}

const DEFAULT_PROFILE: Profile = { sex: 'hombre', age: 25, height: 170, activity: 'moderado', goal: 'recomposicion' };

export default function GoalsPage({ profile, targets, body, onProfile, onTargets }: Props) {
  const [p, setP] = useState<Profile>(profile ?? DEFAULT_PROFILE);
  const [age, setAge] = useState(String(p.age));
  const [height, setHeight] = useState(String(p.height));
  const [manual, setManual] = useState<Record<string, string>>(() =>
    Object.fromEntries(MACRO_KEYS.map((k) => [k, String(targets[k])])),
  );
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setManual(Object.fromEntries(MACRO_KEYS.map((k) => [k, String(targets[k])])));
  }, [targets]);

  const last = latestBody(body);
  const bodyFat = latestBodyFat(body);
  const nAge = parseAmount(age);
  const nHeight = parseAmount(height);
  const validProfile = nAge >= 14 && nAge <= 100 && nHeight >= 120 && nHeight <= 230;
  const current: Profile = { ...p, age: nAge, height: nHeight };
  const plan = last && validProfile ? computePlan(current, last.weight, bodyFat) : null;

  const flash = (msg: string) => {
    setSaved(msg);
    window.setTimeout(() => setSaved(''), 3000);
  };

  const applyPlan = () => {
    if (!plan) return;
    onProfile(current);
    onTargets(plan.targets);
    flash('Objetivos actualizados con el cálculo.');
  };

  const saveManual = () => {
    const num = (k: (typeof MACRO_KEYS)[number]) => Math.max(0, parseAmount(manual[k]) || 0);
    const t: Targets = { kcal: num('kcal'), protein: num('protein'), carbs: num('carbs'), fat: num('fat'), fiber: num('fiber') };
    onTargets(t);
    if (validProfile) onProfile(current);
    flash('Objetivos guardados.');
  };

  return (
    <div className="two-col">
      <section className="card">
        <h2>Mis datos</h2>
        <div className="form">
          <div className="field">
            <span>Sexo</span>
            <div className="segmented">
              {(['hombre', 'mujer'] as Sex[]).map((s) => (
                <button type="button" key={s} className={p.sex === s ? 'active' : ''} onClick={() => setP({ ...p, sex: s })}>
                  {s === 'hombre' ? 'Hombre' : 'Mujer'}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Edad</span>
              <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label className="field">
              <span>Estatura (cm)</span>
              <input className="input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Actividad</span>
            <select className="input" value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as Activity })}>
              {Object.entries(ACTIVITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Objetivo</span>
            <select className="input" value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value as Goal })}>
              {Object.entries(GOAL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            Peso usado: {last ? `${fmt1(last.weight)} kg` : 'sin registro (agrégalo en “Cuerpo”)'}
            {bodyFat !== undefined && ` · Grasa: ${fmt1(bodyFat)} %`}
          </p>
          {!validProfile && <p className="form-error">Revisa la edad (14–100) y la estatura en cm.</p>}
        </div>

        {plan && (
          <div className="plan">
            <h3>Cálculo recomendado</h3>
            <div className="mini-stats">
              <div>
                <span className="muted small">Metabolismo basal</span>
                <strong>{fmt1(plan.bmr)} kcal</strong>
              </div>
              <div>
                <span className="muted small">Gasto diario</span>
                <strong>{fmt1(plan.tdee)} kcal</strong>
              </div>
              {plan.leanMass !== null && (
                <div>
                  <span className="muted small">Masa magra</span>
                  <strong>{fmt1(plan.leanMass)} kg</strong>
                </div>
              )}
            </div>
            <ul className="plan-list">
              {MACRO_KEYS.map((k) => (
                <li key={k}>
                  <span>{MACRO_LABEL[k]}</span>
                  <strong>
                    {fmt1(plan.targets[k])} {MACRO_UNIT[k]}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="muted small">
              Fórmula {plan.method}
              {plan.method === 'Katch-McArdle' ? ' (usa tu % de grasa, más precisa)' : ' (registra tu % de grasa para mayor precisión)'}.
              Proteína {GOAL_PROTEIN_PER_KG[p.goal]} g por kg, grasa 25 % de las calorías y carbohidratos el resto.
            </p>
            <button className="btn primary" onClick={applyPlan}>
              Usar estos objetivos
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Mis objetivos diarios</h2>
        <div className="form">
          {MACRO_KEYS.map((k) => (
            <label key={k} className="field inline-field">
              <span>
                {MACRO_LABEL[k]} ({MACRO_UNIT[k]})
              </span>
              <input
                className="input"
                inputMode="decimal"
                value={manual[k]}
                onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
              />
            </label>
          ))}
          <p className="hint">
            Las calorías de tus macros suman{' '}
            {fmt1(
              (parseAmount(manual.protein) || 0) * 4 + (parseAmount(manual.carbs) || 0) * 4 + (parseAmount(manual.fat) || 0) * 9,
            )}{' '}
            kcal.
          </p>
          <div className="form-actions">
            <button className="btn primary" onClick={saveManual}>
              Guardar objetivos
            </button>
            {saved && <span className="hint ok">✓ {saved}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
