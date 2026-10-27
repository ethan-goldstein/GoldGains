import { useRef, type ReactNode } from 'react';
import { IconChevronLeft, IconClose } from './icons';

interface Props {
  title?: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** grow to near full height (search lists); otherwise fit content */
  tall?: boolean;
  right?: ReactNode;
}

/** iOS-style bottom sheet: backdrop tap or a downward drag on the handle closes it (Escape is handled by SheetHost). */
export function Sheet({ title, onClose, onBack, children, footer, tall, right }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
    panel.current.style.transition = 'none';
  };
  const onPointerUp = () => {
    if (!drag.current || !panel.current) return;
    const { dy } = drag.current;
    drag.current = null;
    panel.current.style.transition = 'transform 260ms var(--ease-out-soft)';
    if (dy > 110) onClose();
    else panel.current.style.transform = '';
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Close" className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        className={`animate-sheet-in relative mx-auto flex w-full max-w-[560px] flex-col rounded-t-[28px] border-t border-line bg-surface ${
          tall ? 'h-[92dvh]' : 'max-h-[92dvh]'
        }`}
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center pt-2.5 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
        {(title || onBack) && (
          <div className="flex shrink-0 items-center gap-2 px-4 pt-1 pb-3">
            {onBack ? (
              <button aria-label="Back" onClick={onBack} className="-ml-1 grid size-10 place-items-center rounded-full text-muted active:bg-surface-2">
                <IconChevronLeft />
              </button>
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-[19px] font-semibold tracking-tight">{title}</h2>
            {right}
            <button aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted">
              <IconClose size={18} />
            </button>
          </div>
        )}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            {footer}
          </div>
        ) : (
          <div className="pb-safe" />
        )}
      </div>
    </div>
  );
}
