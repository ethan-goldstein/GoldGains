import { useState } from 'react';
import { today } from '@/domain/day';
import { budgetFor, DEFAULT_PROFILE, type Profile } from '@/domain/profile';
import { logWeight, saveProfile, updateSettings } from '@/db/repo';
import { db } from '@/db/schema';
import { ProfileForm } from '@/features/me/ProfileForm';
import { Logo } from '@/features/today/DayHeader';
import { IconShare } from '@/ui/icons';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** First run: install hint (iPhone Safari), then personal info → calorie budget. */
export function Onboarding() {
  const needsInstall = isIOS() && !isStandalone();
  const [step, setStep] = useState<'welcome' | 'install' | 'profile' | 'done'>('welcome');
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const b = budgetFor(p);

  const finish = async () => {
    // replace the placeholder goals so every day uses the budget set here
    await db.goals.clear();
    await saveProfile(p);
    await logWeight(today(), p.weightKg);
    await updateSettings({ onboarded: true });
  };

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-[560px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
      {step === 'welcome' ? (
        <div className="animate-pop-in flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-gold/25 blur-3xl" />
              <Logo size={88} />
            </div>
            <h1 className="mt-8 text-[38px] leading-tight font-black tracking-tight">
              Gold<span className="gold-text">Gains</span>
            </h1>
            <p className="mt-3 max-w-[300px] text-[16px] text-muted">Calories, macros and workouts — scanned, tracked and graded. All on your phone.</p>
            <div className="mt-8 flex gap-2">
              {[
                ['var(--color-protein)', 'Protein'],
                ['var(--color-carbs)', 'Carbs'],
                ['var(--color-fat)', 'Fat'],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px]">
                  <span className="size-2 rounded-full" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-gold w-full text-[17px]" onClick={() => setStep(needsInstall ? 'install' : 'profile')}>
            Let’s go
          </button>
        </div>
      ) : step === 'install' ? (
        <div className="animate-pop-in flex flex-1 flex-col">
          <div className="flex-1 pt-10">
            <h2 className="text-[28px] font-bold tracking-tight">Put it on your home screen</h2>
            <p className="mt-2 text-muted">GoldGains runs full-screen and offline like a real app. Install it first — Safari and the home-screen app keep separate data.</p>
            <ol className="mt-8 space-y-4">
              {[
                <>
                  Tap <IconShare size={18} className="inline -translate-y-0.5 text-[#3aa0ff]" /> <b>Share</b> in Safari’s toolbar
                </>,
                <>
                  Scroll and tap <b>Add to Home Screen</b>
                </>,
                <>
                  Open <b>GoldGains</b> from your home screen
                </>,
              ].map((t, i) => (
                <li key={i} className="flex items-center gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 font-bold text-gold">{i + 1}</span>
                  <span className="text-[16px]">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <button className="btn btn-ghost w-full" onClick={() => setStep('profile')}>
            Continue in Safari anyway
          </button>
        </div>
      ) : (
        <div className="animate-pop-in flex flex-1 flex-col">
          <div className="pt-6 pb-4">
            <h2 className="text-[28px] font-bold tracking-tight">About you</h2>
            <p className="mt-1 text-muted">This sets your daily calorie budget. You can change it any time in Me.</p>
          </div>
          <div className="flex-1">
            <ProfileForm p={p} onChange={setP} />
          </div>
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-black/90 px-5 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <div className="mb-3 flex items-end justify-between">
              <span className="text-[13px] text-muted">Your daily budget</span>
              <span className="num gold-text text-[30px] leading-none font-bold">{b.budget.toLocaleString()} cal</span>
            </div>
            <button className="btn btn-gold w-full text-[17px]" onClick={() => void finish()}>
              Start tracking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
