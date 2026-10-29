import { Component, type ReactNode } from 'react';
import { Mark } from '@/ui/Brand';

interface State {
  failed: boolean;
  /** "TypeError: …", so a screenshot of this screen says what broke */
  detail: string;
  reloading: boolean;
}

/** Shows a friendly recovery screen with a one-line error summary (never a stack trace). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, detail: '', reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { failed: true, detail: detail.slice(0, 200) };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center px-8 text-center">
        <div>
          <Mark size={56} label="GoldGains" className="mx-auto block" />
          <p className="mt-4 text-lg font-semibold">Something went sideways.</p>
          <p className="mt-1 text-sm text-muted">Your data is safe on this device. Reload to keep going.</p>
          <button
            className="btn btn-gold mt-6"
            disabled={this.state.reloading}
            onClick={() => {
              this.setState({ reloading: true });
              void reloadLatest();
            }}
          >
            {this.state.reloading ? 'Reloading…' : 'Reload'}
          </button>
          <p className="mx-auto mt-6 max-w-[340px] font-mono text-[11px] break-words text-faint">{this.state.detail}</p>
        </div>
      </div>
    );
  }
}

const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);

/**
 * Reload into the newest deployed version. This screen replaces the update banner, so without
 * this a fix could never reach someone stuck here: a plain reload keeps the old service worker.
 */
async function reloadLatest() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await within(reg.update(), 5000);
      const next = reg.installing ?? reg.waiting;
      if (next) {
        await within(
          new Promise<void>((done) => {
            if (next.state === 'installed') return done();
            next.addEventListener('statechange', () => next.state !== 'installing' && done());
          }),
          15000,
        );
        if (reg.waiting) {
          const swapped = new Promise<void>((done) => navigator.serviceWorker.addEventListener('controllerchange', () => done(), { once: true }));
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await within(swapped, 3000);
        }
      }
    }
  } catch {
    /* offline or no service worker: a plain reload is still the best bet */
  }
  location.reload();
}
