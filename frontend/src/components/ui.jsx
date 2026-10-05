import { X } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-ink text-white hover:bg-ink/85 shadow-sm',
    navy: 'bg-navy text-white hover:bg-navy/90',
    secondary: 'bg-card text-fg border border-borderc hover:bg-muted',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-mutedfg hover:bg-muted hover:text-fg',
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-3.5 text-[13px]', lg: 'h-11 px-5 text-sm' };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg font-heading font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-fg ${className}`}
      {...props}
    />
  );
}

export function Dialog({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl border border-borderc bg-card shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-borderc px-5 py-3.5">
          <h3 className="font-heading text-[13px] font-bold uppercase tracking-wider">{title}</h3>
          <IconButton onClick={onClose} aria-label="Close"><X size={16} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className = '', accent = 'teal' }) {
  const accents = { teal: 'border-teal', copper: 'border-copper', none: '' };
  return (
    <div className={`rounded-xl border border-borderc bg-card shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderc px-4 py-3">
          {title && (
            <h2 className={`font-heading text-[12px] font-bold uppercase tracking-wider ${accents[accent] ? `border-l-2 pl-2 ${accents[accent]}` : ''}`}>
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-muted text-mutedfg',
    paid: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    unpaid: 'bg-red-100 text-red-700',
    in: 'bg-emerald-100 text-emerald-800',
    out: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-muted text-mutedfg',
    teal: 'bg-teal/10 text-teal',
    copper: 'bg-copperlight text-copper',
    manual: 'bg-copperlight text-copper',
    production: 'bg-teal/10 text-teal',
    sale: 'bg-ink/10 text-fg',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="microlabel mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'h-9 w-full rounded-lg border border-borderc bg-card px-3 text-sm text-fg placeholder:text-mutedfg/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/15';

export function Input({ className = '', ...props }) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={`${inputCls} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${inputCls} h-auto py-2 ${className}`} rows={2} {...props} />;
}

/** Page title block: small uppercase label, big heading, description, action buttons */
export function PageHeader({ label, title, description, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {label && <div className="microlabel">{label}</div>}
        <h1 className="mt-0.5 text-[22px] font-extrabold leading-tight md:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-mutedfg">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** One summary metric card */
export function StatCard({ label, value, sub, accent = 'copper' }) {
  const accents = { copper: 'bg-copper', teal: 'bg-teal', ink: 'bg-ink', none: '' };
  return (
    <div className="relative overflow-hidden rounded-xl border border-borderc bg-card p-3.5 shadow-card">
      {accents[accent] && <span className={`absolute inset-x-0 top-0 h-[3px] ${accents[accent]}`} />}
      <div className="microlabel">{label}</div>
      <div className="num mt-1 text-[18px] font-extrabold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-mutedfg">{sub}</div>}
    </div>
  );
}

/** Grid wrapper for StatCards — 2 up on phones, 4 up on wide screens */
export function Stats({ children, className = '', cols = 4 }) {
  return (
    <div className={`mb-4 grid grid-cols-2 gap-3 ${cols === 4 ? 'lg:grid-cols-4' : ''} ${className}`}>
      {children}
    </div>
  );
}

/** FROM / TO date filter with a Clear action */
export function DateRange({ from, setFrom, to, setTo, onClear }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <div className="microlabel mb-1">From</div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-40" />
      </div>
      <div>
        <div className="microlabel mb-1">To</div>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-40" />
      </div>
      {onClear && (
        <button type="button" onClick={onClear} className="pb-2 text-[12px] font-semibold text-mutedfg hover:text-fg">
          Clear
        </button>
      )}
    </div>
  );
}

export function Empty({ children, title }) {
  return (
    <div className="m-4 rounded-xl border border-dashed border-borderc bg-muted/40 px-4 py-10 text-center">
      {title && <div className="font-heading text-[13px] font-bold">{title}</div>}
      <div className={`text-[12px] text-mutedfg ${title ? 'mt-1' : ''}`}>{children}</div>
    </div>
  );
}
