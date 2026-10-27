import { useRef, useState, type ReactNode } from 'react';
import { IconTrash } from './icons';

/** Row that reveals a Delete action on a left swipe (and still taps through normally). */
export function SwipeRow({ children, onTap, onDelete, label }: { children: ReactNode; onTap: () => void; onDelete: () => void; label: string }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; base: number; locked?: 'h' | 'v' } | null>(null);
  const moved = useRef(false);
  const REVEAL = 84;

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, base: dx };
    moved.current = false;
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.locked && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
    if (s.locked !== 'h') return;
    moved.current = true;
    setDx(Math.min(0, Math.max(-REVEAL - 40, s.base + mx)));
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || s.locked !== 'h') return;
    setDx((d) => (d < -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <div className="relative overflow-hidden">
      <button
        aria-label={`Delete ${label}`}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[84px] items-center justify-center gap-1 bg-over text-sm font-semibold text-black"
        tabIndex={dx < 0 ? 0 : -1}
      >
        <IconTrash size={18} />
      </button>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={() => {
          if (moved.current) return;
          if (dx < 0) setDx(0);
          else onTap();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onTap();
          if (e.key === 'Delete' || e.key === 'Backspace') onDelete();
        }}
        className="relative touch-pan-y bg-surface active:bg-surface-2"
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform 220ms var(--ease-out-soft)' }}
      >
        {children}
      </div>
    </div>
  );
}
