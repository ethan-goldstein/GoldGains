import { useEffect } from 'react';
import { create } from 'zustand';

interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  tone?: 'default' | 'error';
}

interface ToastStore {
  current: ToastMsg | null;
  show: (text: string, opts?: { action?: ToastMsg['action']; tone?: ToastMsg['tone'] }) => void;
  dismiss: () => void;
}

let seq = 0;

export const useToast = create<ToastStore>((set) => ({
  current: null,
  show: (text, opts) => set({ current: { id: ++seq, text, ...opts } }),
  dismiss: () => set({ current: null }),
}));

export const toast = (text: string, opts?: { action?: ToastMsg['action']; tone?: ToastMsg['tone'] }) => useToast.getState().show(text, opts);

export function ToastHost() {
  const { current, dismiss } = useToast();
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, current.action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [current, dismiss]);
  if (!current) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}>
      <div
        key={current.id}
        role="status"
        className={`animate-pop-in pointer-events-auto flex max-w-[520px] items-center gap-4 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/60 ${
          current.tone === 'error' ? 'border-over/40 bg-[#2a1610]' : 'border-line-strong bg-surface-3'
        }`}
      >
        <span className="text-[15px]">{current.text}</span>
        {current.action ? (
          <button
            className="font-semibold text-gold"
            onClick={() => {
              current.action?.run();
              dismiss();
            }}
          >
            {current.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
