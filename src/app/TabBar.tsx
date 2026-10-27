import { Link, useLocation } from 'wouter';
import { IconDumbbell, IconPlus, IconProgress, IconToday, IconUser } from '@/ui/icons';
import { useUI } from './store';

const TABS = [
  { href: '/', label: 'Today', Icon: IconToday },
  { href: '/progress', label: 'Progress', Icon: IconProgress },
  null,
  { href: '/workouts', label: 'Workouts', Icon: IconDumbbell },
  { href: '/me', label: 'Me', Icon: IconUser },
] as const;

export function TabBar() {
  const [loc] = useLocation();
  const open = useUI((s) => s.open);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-black/80 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      <div className="mx-auto grid h-[62px] max-w-[560px] grid-cols-5 items-center">
        {TABS.map((t) =>
          t === null ? (
            <div key="plus" className="flex justify-center">
              <button
                aria-label="Log food, exercise or weight"
                onClick={() => open({ type: 'addMenu' })}
                className="press grid size-[52px] -translate-y-3 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,var(--color-gold-bright),var(--color-gold)_55%,var(--color-gold-deep))] text-[#1a1305] shadow-[0_8px_24px_-6px_rgba(242,193,78,0.55)]"
              >
                <IconPlus size={28} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              className={`flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ${
                loc === t.href ? 'text-gold' : 'text-muted'
              }`}
              aria-current={loc === t.href ? 'page' : undefined}
            >
              <t.Icon size={23} />
              {t.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
