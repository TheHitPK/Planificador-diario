import type { BodyEntry, Food, LogEntry, NutritionData, Profile, Targets } from './types';
import { useLocalStorage } from '../lib/storage';
import DiaryPage from './DiaryPage';
import FoodsPage from './FoodsPage';
import BodyPage from './BodyPage';
import GoalsPage from './GoalsPage';

/** Operaciones sobre los datos de nutrición (las implementa el store que habla con la API). */
export interface NutritionOps {
  ensureRange: (from: string, to: string) => void;
  addEntries: (items: LogEntry[]) => void;
  removeEntry: (id: string) => void;
  copyDay: (from: string, to: string) => void;
  saveFood: (food: Food, isNew: boolean) => void;
  deleteFood: (id: string) => void;
  upsertBody: (entry: BodyEntry) => void;
  deleteBody: (id: string) => void;
  saveProfile: (p: Profile) => void;
  saveTargets: (t: Targets) => void;
}

type SubTab = 'hoy' | 'alimentos' | 'cuerpo' | 'objetivos';

const SUBTABS: [SubTab, string][] = [
  ['hoy', '🍽️ Diario'],
  ['alimentos', '🥑 Alimentos'],
  ['cuerpo', '⚖️ Cuerpo'],
  ['objetivos', '🎯 Objetivos'],
];

interface Props {
  data: NutritionData;
  ops: NutritionOps;
}

export default function NutritionModule({ data, ops }: Props) {
  const [tab, setTab] = useLocalStorage<SubTab>('pd.nut.tab', 'hoy');

  return (
    <div className="finance">
      <div className="subtabs" role="tablist">
        {SUBTABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`chip big ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'hoy' && <DiaryPage data={data} ops={ops} />}
      {tab === 'alimentos' && <FoodsPage foods={data.foods} onSave={ops.saveFood} onDelete={ops.deleteFood} />}
      {tab === 'cuerpo' && <BodyPage body={data.body} profile={data.profile} onSave={ops.upsertBody} onDelete={ops.deleteBody} />}
      {tab === 'objetivos' && (
        <GoalsPage profile={data.profile} targets={data.targets} body={data.body} onProfile={ops.saveProfile} onTargets={ops.saveTargets} />
      )}
    </div>
  );
}
