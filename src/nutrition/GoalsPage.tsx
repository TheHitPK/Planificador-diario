import { useEffect, useState } from 'react';
import type { Activity, BodyEntry, Goal, Profile, Sex, Targets } from './types';
import { ACTIVITY_LABEL, GOAL_LABEL, GOAL_PROTEIN_PER_KG } from './defaults';
import { MACRO_KEYS, MACRO_LABEL, MACRO_UNIT, computePlan, fmt1, latestBody, latestBodyFat } from './calc';
import { parseAmount } from '../finance/calc';
import { CheckCircleIcon } from '../components/Icons';
import {
  Button, Card, CardTitle, Field, FieldRow, FormActions, FormError, Hint, Input, MiniStat, MiniStats, Segmented, SegmentedOption,
  Select, TwoCol, formClass,
} from '../ui';

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
    <TwoCol>
      <Card>
        <CardTitle>Mis datos</CardTitle>
        <div className={formClass}>
          <Field label="Sexo" as="div">
            <Segmented>
              {(['hombre', 'mujer'] as Sex[]).map((s) => (
                <SegmentedOption key={s} active={p.sex === s} onClick={() => setP({ ...p, sex: s })}>
                  {s === 'hombre' ? 'Hombre' : 'Mujer'}
                </SegmentedOption>
              ))}
            </Segmented>
          </Field>
          <FieldRow>
            <Field label="Edad">
              <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Estatura (cm)">
              <Input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
            </Field>
          </FieldRow>
          <Field label="Actividad">
            <Select value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as Activity })}>
              {Object.entries(ACTIVITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Objetivo">
            <Select value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value as Goal })}>
              {Object.entries(GOAL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[13px] text-ink-2">
            Peso usado: {last ? `${fmt1(last.weight)} kg` : 'sin registro (agrégalo en “Cuerpo”)'}
            {bodyFat !== undefined && ` · Grasa: ${fmt1(bodyFat)} %`}
          </p>
          {!validProfile && <FormError>Revisa la edad (14–100) y la estatura en cm.</FormError>}
        </div>

        {plan && (
          <div className="mt-[18px] flex flex-col items-start gap-2.5 border-t border-grid pt-4">
            <h3>Cálculo recomendado</h3>
            <MiniStats className="mb-0">
              <MiniStat label="Metabolismo basal" value={`${fmt1(plan.bmr)} kcal`} />
              <MiniStat label="Gasto diario" value={`${fmt1(plan.tdee)} kcal`} />
              {plan.leanMass !== null && <MiniStat label="Masa magra" value={`${fmt1(plan.leanMass)} kg`} />}
            </MiniStats>
            <ul className="m-0 flex w-full list-none flex-col gap-1 p-0">
              {MACRO_KEYS.map((k) => (
                <li key={k} className="flex justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 tabular-nums">
                  <span>{MACRO_LABEL[k]}</span>
                  <strong>
                    {fmt1(plan.targets[k])} {MACRO_UNIT[k]}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-2">
              Fórmula {plan.method}
              {plan.method === 'Katch-McArdle' ? ' (usa tu % de grasa, más precisa)' : ' (registra tu % de grasa para mayor precisión)'}.
              Proteína {GOAL_PROTEIN_PER_KG[p.goal]} g por kg, grasa 25 % de las calorías y carbohidratos el resto.
            </p>
            <Button variant="primary" onClick={applyPlan}>
              Usar estos objetivos
            </Button>
          </div>
        )}
      </Card>

      <Card delay={0.08}>
        <CardTitle>Mis objetivos diarios</CardTitle>
        <div className={formClass}>
          {MACRO_KEYS.map((k) => (
            <Field key={k} inline label={`${MACRO_LABEL[k]} (${MACRO_UNIT[k]})`}>
              <Input
                className="w-[140px] text-right"
                inputMode="decimal"
                value={manual[k]}
                onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
              />
            </Field>
          ))}
          <Hint>
            Las calorías de tus macros suman{' '}
            {fmt1(
              (parseAmount(manual.protein) || 0) * 4 + (parseAmount(manual.carbs) || 0) * 4 + (parseAmount(manual.fat) || 0) * 9,
            )}{' '}
            kcal.
          </Hint>
          <FormActions className="items-center">
            <Button variant="primary" onClick={saveManual}>
              Guardar objetivos
            </Button>
            {saved && (
              <Hint tone="ok" className="inline-flex items-center gap-1.5" role="status">
                <CheckCircleIcon size={14} />
                {saved}
              </Hint>
            )}
          </FormActions>
        </div>
      </Card>
    </TwoCol>
  );
}
