import { lazy, Suspense, useEffect } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSettingsLoaded } from '@/db/hooks';
import { ensureGoals } from '@/db/repo';
import { requestPersistence } from '@/db/backup';
import { ToastHost } from '@/ui/Toast';
import { TodayScreen } from '@/features/today/TodayScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { WorkoutsScreen } from '@/features/workouts/WorkoutsScreen';
import { MeScreen } from '@/features/me/MeScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { ErrorBoundary } from './ErrorBoundary';
import { SheetHost } from './SheetHost';
import { TabBar } from './TabBar';
import { useUI } from './store';

// camera + barcode/OCR engines load only when the scanner opens
const Scanner = lazy(() => import('@/features/scan/Scanner'));

export function App() {
  const settings = useSettingsLoaded();
  const scanner = useUI((s) => s.scanner);

  useEffect(() => {
    void ensureGoals();
    void requestPersistence();
  }, []);

  if (!settings) return <div className="min-h-dvh bg-bg" />;

  return (
    <ErrorBoundary>
      {!settings.onboarded ? (
        <Onboarding />
      ) : (
        <Router hook={useHashLocation}>
          <ScrollTop />
          <main className="mx-auto max-w-[560px] pb-[calc(env(safe-area-inset-bottom)+96px)]">
            <Switch>
              <Route path="/" component={TodayScreen} />
              <Route path="/progress" component={ProgressScreen} />
              <Route path="/workouts" component={WorkoutsScreen} />
              <Route path="/me" component={MeScreen} />
              <Route component={TodayScreen} />
            </Switch>
          </main>
          <TabBar />
          <SheetHost />
          {scanner ? (
            <Suspense fallback={<div className="fixed inset-0 z-50 bg-black" />}>
              <Scanner />
            </Suspense>
          ) : null}
        </Router>
      )}
      <UpdatePrompt />
      <ToastHost />
    </ErrorBoundary>
  );
}

/** New tab (or first render after onboarding) starts at the top. */
function ScrollTop() {
  const [loc] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc]);
  return null;
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <div className="animate-pop-in flex items-center gap-3 rounded-2xl border border-gold/40 bg-surface-3 px-4 py-2.5 shadow-2xl">
        <span className="text-sm">A new version of GoldGains is ready.</span>
        <button className="text-sm font-semibold text-gold" onClick={() => void updateServiceWorker(true)}>
          Update
        </button>
        <button className="text-sm text-muted" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </div>
  );
}
