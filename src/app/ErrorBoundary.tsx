import { Component, type ReactNode } from 'react';
import { Mark } from '@/ui/Brand';

interface State {
  failed: boolean;
}

/** Shows a friendly recovery screen. Never renders the error itself (no stack traces in the UI). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
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
          <button className="btn btn-gold mt-6" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
