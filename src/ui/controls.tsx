import { useEffect, useState, type ReactNode } from 'react';

/** Numeric input that keeps the user's text while typing (so "1." and "" are allowed) and reports numbers. */
export function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
  className = '',
  min = 0,
  max,
  ariaLabel,
  autoFocus,
  highlight,
  integer,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  suffix?: ReactNode;
  className?: string;
  min?: number;
  max?: number;
  ariaLabel?: string;
  autoFocus?: boolean;
  highlight?: boolean;
  integer?: boolean;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(round(value)));
  useEffect(() => {
    const parsed = parse(text);
    if (parsed !== value) setText(value === undefined ? '' : String(round(value)));
    // only resync when the outside value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label
      className={`field flex items-center gap-2 text-text ${highlight ? 'border-over! bg-[color-mix(in_srgb,var(--color-over)_8%,var(--color-surface-2))]' : ''} ${className}`}
    >
      <input
        aria-label={ariaLabel}
        inputMode={integer ? 'numeric' : 'decimal'}
        autoFocus={autoFocus}
        className="num w-full min-w-0 bg-transparent text-right outline-none placeholder:text-faint"
        placeholder={placeholder}
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.');
          if (!/^\d*\.?\d*$/.test(t)) return;
          setText(t);
          const n = parse(t);
          if (n === undefined) onChange(undefined);
          else onChange(Math.min(max ?? Infinity, Math.max(min, n)));
        }}
      />
      {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
    </label>
  );
}

const parse = (t: string) => (t === '' || t === '.' ? undefined : Number(t));
const round = (v: number) => Number(v.toFixed(2));

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className={`flex rounded-xl border border-line bg-surface-2 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-[9px] font-semibold transition-colors ${size === 'sm' ? 'min-h-8 text-[13px]' : 'min-h-10 text-sm'} ${
              active ? 'bg-surface-3 text-text shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-gold' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

export function Row({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const cls = `flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left ${className}`;
  return onClick ? (
    <button onClick={onClick} className={`${cls} press active:bg-surface-2`}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
