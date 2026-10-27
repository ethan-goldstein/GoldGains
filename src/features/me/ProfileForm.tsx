import { ACTIVITY, CM_PER_IN, GAIN_PACES, kgToLb, lbToKg, LOSE_PACES, type Activity, type Plan, type Profile } from '@/domain/profile';
import { NumberField, Segmented } from '@/ui/controls';

/** Personal info fields shared by onboarding and the Me tab. */
export function ProfileForm({ p, onChange }: { p: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...p, [k]: v });
  const imperial = p.units === 'imperial';
  const totalIn = p.heightCm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  const paces = p.plan === 'gain' ? GAIN_PACES : LOSE_PACES;

  return (
    <div className="space-y-5">
      <Segmented
        value={p.units}
        onChange={(u) => set('units', u)}
        options={[
          { value: 'imperial', label: 'lb · ft' },
          { value: 'metric', label: 'kg · cm' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sex (for BMR)">
          <Segmented
            value={p.sex}
            onChange={(s) => set('sex', s)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
        </Field>
        <Field label="Age">
          <NumberField value={p.age} onChange={(v) => v && set('age', Math.round(v))} min={13} max={100} suffix="yrs" integer ariaLabel="Age" />
        </Field>
      </div>

      <Field label="Height">
        {imperial ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberField value={ft} onChange={(v) => set('heightCm', ((v ?? 0) * 12 + inch) * CM_PER_IN)} suffix="ft" integer max={8} ariaLabel="Feet" />
            <NumberField value={inch} onChange={(v) => set('heightCm', (ft * 12 + Math.min(11.99, v ?? 0)) * CM_PER_IN)} suffix="in" max={11.99} ariaLabel="Inches" />
          </div>
        ) : (
          <NumberField value={Math.round(p.heightCm)} onChange={(v) => v && set('heightCm', v)} suffix="cm" min={90} max={250} integer ariaLabel="Height in cm" />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Current weight">
          <NumberField
            value={Number((imperial ? kgToLb(p.weightKg) : p.weightKg).toFixed(1))}
            onChange={(v) => v && set('weightKg', imperial ? lbToKg(v) : v)}
            suffix={imperial ? 'lb' : 'kg'}
            ariaLabel="Current weight"
          />
        </Field>
        <Field label="Goal weight">
          <NumberField
            value={p.goalWeightKg ? Number((imperial ? kgToLb(p.goalWeightKg) : p.goalWeightKg).toFixed(1)) : undefined}
            onChange={(v) => onChange({ ...p, goalWeightKg: v ? (imperial ? lbToKg(v) : v) : undefined })}
            suffix={imperial ? 'lb' : 'kg'}
            placeholder="optional"
            ariaLabel="Goal weight"
          />
        </Field>
      </div>

      <Field label="Activity level (outside workouts you log)">
        <div className="space-y-1.5">
          {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
            <button
              key={a}
              onClick={() => set('activity', a)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${p.activity === a ? 'border-gold bg-gold/10' : 'border-line bg-surface-2'}`}
              aria-pressed={p.activity === a}
            >
              <span className={`size-4 shrink-0 rounded-full border-2 ${p.activity === a ? 'border-gold bg-gold' : 'border-line-strong'}`} />
              <span className="flex-1">
                <span className="block text-[14px] font-semibold">{ACTIVITY[a].label}</span>
                <span className="block text-[12px] text-muted">{ACTIVITY[a].detail}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Goal">
        <Segmented
          value={p.plan}
          onChange={(plan: Plan) => onChange({ ...p, plan, pace: plan === 'gain' ? 0.5 : plan === 'lose' ? 1 : p.pace })}
          options={[
            { value: 'lose', label: 'Lose' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain' },
          ]}
        />
        {p.plan !== 'maintain' ? (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {paces.map((x) => (
              <button
                key={x}
                onClick={() => set('pace', x)}
                className={`rounded-xl border py-2 text-center ${p.pace === x ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}
                aria-pressed={p.pace === x}
              >
                <div className="num text-[15px] font-semibold">{x}</div>
                <div className="text-[10.5px]">lb / week</div>
              </button>
            ))}
          </div>
        ) : null}
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      {children}
    </div>
  );
}
