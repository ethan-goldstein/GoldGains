import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useUI } from '@/app/store';
import { today, shortDate } from '@/domain/day';
import { budgetFor, formatHeight, formatWeight, kgToLb, macroGrams, MACRO_PRESETS, weeksToGoal, type Profile } from '@/domain/profile';
import { MACRO_COLOR } from '@/domain/nutrients';
import { useGoalFor, useProfile, useSettings } from '@/db/hooks';
import { deriveGoals, saveGoals, saveProfile, updateSettings } from '@/db/repo';
import { db, type Goals } from '@/db/schema';
import { Lockup, ScreenHeader } from '@/ui/Brand';
import { NumberField, Toggle } from '@/ui/controls';
import { IconChevronRight, IconScale } from '@/ui/icons';
import { toast } from '@/ui/Toast';
import { DataSection } from './DataSection';
import { ProfileForm } from './ProfileForm';

export function MeScreen() {
  const profile = useProfile();
  const goal = useGoalFor(today());
  const settings = useSettings();
  const open = useUI((s) => s.open);
  const latestWeight = useLiveQuery(() => db.weights.orderBy('date').last(), []);

  return (
    <div className="pt-safe">
      <ScreenHeader title="Me">
        <button onClick={() => open({ type: 'weight' })} className="btn btn-ghost min-h-10 gap-1.5 px-3 text-[13px]">
          <IconScale size={18} /> Weigh in
        </button>
      </ScreenHeader>
      <div className="space-y-3 px-3">
        <SummaryCard profile={profile} goal={goal} lastWeighIn={latestWeight?.date} />
        <PersonalInfo profile={profile} />
        {goal ? <BudgetCard profile={profile} goal={goal} /> : null}
        {goal ? <MacroTargets goal={goal} /> : null}
        {goal ? <NutrientTargets goal={goal} /> : null}
        <section className="card divide-y divide-line/70 overflow-hidden">
          <h3 className="px-4 pt-4 pb-2 text-[17px] font-semibold tracking-tight">Preferences</h3>
          <SettingRow
            title="Add exercise to my budget"
            detail="Calories you burn give you more to eat that day"
            checked={settings.exerciseAddsToBudget}
            onChange={(v) => void updateSettings({ exerciseAddsToBudget: v })}
          />
          <SettingRow title="Track net carbs" detail="Carbs minus fiber and sugar alcohols on the macro split" checked={settings.netCarbs} onChange={(v) => void updateSettings({ netCarbs: v })} />
          <SettingRow
            title="Offline only"
            detail="Never contact Open Food Facts (turns off barcode lookups and packaged-food search)"
            checked={settings.offlineOnly}
            onChange={(v) => void updateSettings({ offlineOnly: v })}
          />
          <UnitRow
            label="Lifting weights"
            value={settings.liftUnit}
            options={['lb', 'kg']}
            onChange={(v) => void updateSettings({ liftUnit: v as 'lb' | 'kg' })}
          />
          <UnitRow label="Distance" value={settings.distanceUnit} options={['mi', 'km']} onChange={(v) => void updateSettings({ distanceUnit: v as 'mi' | 'km' })} />
          <UnitRow label="Water" value={settings.waterUnit} options={['oz', 'ml']} onChange={(v) => void updateSettings({ waterUnit: v as 'oz' | 'ml' })} />
        </section>
        <DataSection />
        <About />
      </div>
    </div>
  );
}

function SummaryCard({ profile: p, goal, lastWeighIn }: { profile: Profile; goal: Goals | undefined; lastWeighIn?: string }) {
  const weeks = weeksToGoal(p);
  const toGo = p.goalWeightKg ? kgToLb(p.weightKg - p.goalWeightKg) : undefined;
  return (
    <section className="card relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative grid grid-cols-3 gap-3 text-center">
        <Stat label="Height" value={formatHeight(p.heightCm, p.units)} />
        <Stat label="Weight" value={formatWeight(p.weightKg, p.units)} sub={lastWeighIn ? `as of ${shortDate(lastWeighIn)}` : undefined} />
        <Stat label="Goal" value={p.goalWeightKg ? formatWeight(p.goalWeightKg, p.units) : '—'} sub={toGo && Math.abs(toGo) >= 0.1 ? `${Math.abs(toGo).toFixed(1)} lb to ${toGo > 0 ? 'lose' : 'gain'}` : undefined} />
      </div>
      <div className="relative mt-4 flex items-end justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <div>
          <div className="text-[12px] text-muted">Daily calorie budget</div>
          <div className="num gold-text text-[34px] leading-tight font-bold">{goal ? goal.calories.toLocaleString() : '—'}</div>
        </div>
        {weeks !== undefined && Number.isFinite(weeks) && weeks > 0 ? (
          <div className="text-right text-[12px] text-muted">
            Goal in about
            <div className="num text-[17px] font-semibold text-text">{weeks < 1 ? '< 1' : Math.round(weeks)} wk</div>
            <div>{projected(weeks)}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function projected(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="num mt-0.5 text-[17px] font-semibold">{value}</div>
      {sub ? <div className="text-[10.5px] text-faint">{sub}</div> : null}
    </div>
  );
}

function PersonalInfo({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const p = draft ?? profile;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(profile);
  return (
    <section className="card p-4">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3 className="text-[17px] font-semibold tracking-tight">Personal info & goal</h3>
        <IconChevronRight size={18} className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open ? (
        <div className="mt-4">
          <ProfileForm p={p} onChange={setDraft} />
          <div className="mt-5 flex gap-2">
            <button className="btn btn-ghost flex-1" disabled={!dirty} onClick={() => setDraft(null)}>
              Reset
            </button>
            <button
              className="btn btn-gold flex-[2]"
              disabled={!dirty}
              onClick={async () => {
                if (!draft) return;
                await saveProfile(draft);
                setDraft(null);
                toast('Saved — your budget is updated from today on');
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BudgetCard({ profile, goal }: { profile: Profile; goal: Goals }) {
  const b = budgetFor(profile);
  const [manual, setManual] = useState(goal.caloriesOverride !== null);
  const [val, setVal] = useState<number | undefined>(goal.caloriesOverride ?? goal.calories);
  useEffect(() => {
    setManual(goal.caloriesOverride !== null);
    setVal(goal.caloriesOverride ?? goal.calories);
  }, [goal.caloriesOverride, goal.calories]);

  const apply = async (override: number | null) => {
    const base = deriveGoals(profile, { ...goal, caloriesOverride: override });
    await saveGoals(base);
  };

  const delta = profile.plan === 'maintain' ? 0 : Math.round((profile.pace * 3500) / 7) * (profile.plan === 'lose' ? -1 : 1);
  return (
    <section className="card p-4">
      <h3 className="text-[17px] font-semibold tracking-tight">Calorie budget</h3>
      <div className="mt-3 space-y-2 text-[14px]">
        <Line label="Resting burn (BMR)" value={Math.round(b.bmr)} />
        <Line label="Maintenance (with activity)" value={Math.round(b.tdee)} />
        {delta ? <Line label={profile.plan === 'lose' ? `Deficit for ${profile.pace} lb/week` : `Surplus for ${profile.pace} lb/week`} value={delta} signed /> : null}
        <div className="border-t border-line pt-2">
          <Line label="Suggested budget" value={b.budget} bold />
        </div>
        {b.clamped ? <p className="text-[12px] text-over">That pace would put you under a safe minimum, so the budget is held at {b.budget.toLocaleString()}.</p> : null}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <div className="flex-1">
          <div className="text-[14px] font-semibold">Set my own budget</div>
          <div className="text-[12px] text-muted">Override the calculation</div>
        </div>
        <Toggle
          label="Set my own budget"
          checked={manual}
          onChange={(v) => {
            setManual(v);
            if (!v) void apply(null);
          }}
        />
      </div>
      {manual ? (
        <div className="mt-2 flex gap-2">
          <NumberField value={val} onChange={setVal} suffix="cal" integer className="flex-1" ariaLabel="Daily calories" />
          <button className="btn btn-gold" disabled={!val || val < 800 || val > 10000} onClick={() => val && void apply(Math.round(val)).then(() => toast('Budget updated'))}>
            Apply
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Line({ label, value, signed, bold }: { label: string; value: number; signed?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold' : 'text-muted'}>{label}</span>
      <span className={`num ${bold ? 'font-semibold text-gold' : ''}`}>
        {signed && value > 0 ? '+' : ''}
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function MacroTargets({ goal }: { goal: Goals }) {
  const [split, setSplit] = useState<[number, number, number]>(goal.split);
  useEffect(() => setSplit(goal.split), [goal.split]);
  const sum = split[0] + split[1] + split[2];
  const grams = macroGrams(goal.calories, split);
  const dirty = split.join() !== goal.split.join();

  const save = async (s: [number, number, number], presetId: string) => {
    const g = macroGrams(goal.calories, s);
    await saveGoals({ ...strip(goal), split: s, presetId, ...g });
  };

  const labels = ['Protein', 'Carbs', 'Fat'] as const;
  const colors = [MACRO_COLOR.protein, MACRO_COLOR.carbs, MACRO_COLOR.fat];
  const gramVals = [grams.protein, grams.carbs, grams.fat];

  return (
    <section className="card p-4">
      <h3 className="text-[17px] font-semibold tracking-tight">Macro targets</h3>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {MACRO_PRESETS.map((pr) => (
          <button
            key={pr.id}
            onClick={() => {
              setSplit(pr.split);
              void save(pr.split, pr.id);
            }}
            className={`shrink-0 rounded-2xl border px-3 py-2 text-left ${goal.presetId === pr.id && !dirty ? 'border-gold bg-gold/12' : 'border-line bg-surface-2'}`}
          >
            <div className="text-[13px] font-semibold">{pr.label}</div>
            <div className="num text-[11px] text-muted">{pr.split.join(' / ')}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
        {split.map((v, i) => (v > 0 ? <div key={i} style={{ width: `${(v / Math.max(1, sum)) * 100}%`, background: colors[i] }} /> : null))}
      </div>
      <div className="mt-4 space-y-4">
        {labels.map((l, i) => (
          <div key={l}>
            <div className="mb-1.5 flex items-baseline gap-2 text-[14px]">
              <span className="size-2.5 rounded-full" style={{ background: colors[i] }} />
              <span className="font-semibold">{l}</span>
              <span className="num ml-auto">
                <span className="font-semibold">{split[i]}%</span>
                <span className="text-muted"> · {gramVals[i]} g</span>
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={split[i]}
              aria-label={`${l} percent`}
              onChange={(e) => {
                const next = [...split] as [number, number, number];
                next[i] = Number(e.target.value);
                setSplit(next);
              }}
              className="w-full"
              style={{ accentColor: colors[i] }}
            />
          </div>
        ))}
      </div>
      {dirty ? (
        <div className="mt-3 flex items-center gap-3">
          <span className={`flex-1 text-[13px] ${sum === 100 ? 'text-muted' : 'text-over'}`}>{sum === 100 ? 'Adds up to 100%' : `Adds up to ${sum}% — make it 100%`}</span>
          <button className="btn btn-gold min-h-10" disabled={sum !== 100} onClick={() => void save(split, 'custom').then(() => toast('Macro targets saved'))}>
            Save split
          </button>
        </div>
      ) : null}
    </section>
  );
}

const strip = (g: Goals) => {
  const { id: _id, effectiveFrom: _e, createdAt: _c, ...rest } = g;
  return rest;
};

function NutrientTargets({ goal }: { goal: Goals }) {
  const settings = useSettings();
  const OZ = 29.5735;
  const rows: { key: keyof Goals; label: string; unit: string; hint: string; scale?: number }[] = [
    { key: 'fiberMin', label: 'Fiber, at least', unit: 'g', hint: '14 g per 1,000 cal' },
    { key: 'addedSugarMax', label: 'Added sugar, under', unit: 'g', hint: '< 10% of calories' },
    { key: 'satFatMax', label: 'Saturated fat, under', unit: 'g', hint: '< 10% of calories' },
    { key: 'sodiumMax', label: 'Sodium, under', unit: 'mg', hint: 'FDA daily value 2,300' },
    { key: 'waterMl', label: 'Water goal', unit: settings.waterUnit, hint: 'per day', scale: settings.waterUnit === 'oz' ? 1 / OZ : 1 },
  ];
  return (
    <section className="card p-4">
      <h3 className="text-[17px] font-semibold tracking-tight">Nutrient targets</h3>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[14px]">{r.label}</div>
              <div className="text-[11px] text-faint">{r.hint}</div>
            </div>
            <NumberField
              value={Math.round((goal[r.key] as number) * (r.scale ?? 1))}
              onChange={(v) => v !== undefined && void saveGoals({ ...strip(goal), [r.key]: v / (r.scale ?? 1) })}
              suffix={r.unit}
              integer
              className="w-32"
              ariaLabel={r.label}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingRow({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1">
        <div className="text-[14.5px]">{title}</div>
        <div className="text-[12px] text-muted">{detail}</div>
      </div>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

function UnitRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 text-[14.5px]">{label}</div>
      <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`min-w-11 rounded-md px-2.5 py-1 text-[13px] font-semibold ${o === value ? 'bg-surface-3 text-text' : 'text-muted'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function About() {
  return (
    <section className="px-2 pt-2 pb-6 text-center text-[11.5px] leading-relaxed text-faint">
      <div className="flex justify-center">
        <Lockup size={22} />
      </div>
      <p className="mt-2">Your logs live only on this device. Barcode lookups and packaged-food searches are sent to Open Food Facts; nothing else leaves your phone.</p>
      <p className="mt-2">
        Packaged food data © Open Food Facts contributors, ODbL. Everyday foods: USDA FoodData Central (SR Legacy), public domain. Exercise estimates: Compendium of Physical
        Activities. Budget: Mifflin-St Jeor. Not medical advice.
      </p>
    </section>
  );
}
