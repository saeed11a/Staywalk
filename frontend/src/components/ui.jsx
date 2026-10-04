import { X } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-copper text-white hover:bg-copper/90 shadow-sm',
    navy: 'bg-navy text-white hover:bg-navy/90',
    secondary: 'bg-card text-fg border border-borderc hover:bg-muted',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-mutedfg hover:bg-muted hover:text-fg',
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-5 text-sm' };
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl font-heading font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/50 p-4 pt-12 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-borderc bg-card shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-borderc px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
          <IconButton onClick={onClose} aria-label="Close"><X size={16} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-borderc bg-card shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderc px-4 py-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={title || actions ? '' : ''}>{children}</div>
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
    sale: 'bg-navy/10 text-navy dark:text-white',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[tone] || tones.neutral}`}>
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

const inputCls = 'h-9 w-full rounded-lg border border-borderc bg-card px-3 text-sm text-fg placeholder:text-mutedfg/60 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20';

export function Input({ className = '', ...props }) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={`${inputCls} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${inputCls} h-auto py-2 ${className}`} rows={2} {...props} />;
}

export function PageHeader({ title, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-extrabold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="px-4 py-12 text-center text-sm text-mutedfg">{children}</div>;
}
