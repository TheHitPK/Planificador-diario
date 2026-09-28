import type { BodyEntry, Food, LogEntry, NutritionData, Profile, Targets } from './types';
import { useLocalStorage } from '../lib/storage';
import DiaryPage from './DiaryPage';
import FoodsPage from './FoodsPage';
import BodyPage from './BodyPage';
import GoalsPage from './GoalsPage';

type SubTab = 'hoy' | 'alimentos' | 'cuerpo' | 'objetivos';

const SUBTABS: [SubTab, string][] = [
  ['hoy', '🍽️ Diario'],
  ['alimentos', '🥑 Alimentos'],
  ['cuerpo', '⚖️ Cuerpo'],
  ['objetivos', '🎯 Objetivos'],
];

interface Props {
  data: NutritionData;
  setFoods: (fn: (prev: Food[]) => Food[]) => void;
  setLog: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  setBody: (fn: (prev: BodyEntry[]) => BodyEntry[]) => void;
  setProfile: (p: Profile) => void;
  setTargets: (t: Targets) => void;
}

export default function NutritionModule({ data, setFoods, setLog, setBody, setProfile, setTargets }: Props) {
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

      {tab === 'hoy' && <DiaryPage data={data} setLog={setLog} />}
      {tab === 'alimentos' && <FoodsPage foods={data.foods} onChange={setFoods} />}
      {tab === 'cuerpo' && <BodyPage body={data.body} profile={data.profile} onChange={setBody} />}
      {tab === 'objetivos' && (
        <GoalsPage profile={data.profile} targets={data.targets} body={data.body} onProfile={setProfile} onTargets={setTargets} />
      )}
    </div>
  );
}
