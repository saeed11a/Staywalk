import { Pencil, Trash2, Phone } from 'lucide-react';
import { fmtRs, fmtNum } from '../lib/api';
import { IconButton } from './ui';

/** Credit-card styled kata card — every card occupies the same space via a fixed height. */
export default function PartyCard({ party: r, isCustomer, onOpen, onEdit, onDelete }) {
  const bal = Number(r.balance) || 0;
  const initial = (r.name?.[0] || '?').toUpperCase();
  const lt = r.last_transaction;
  const positive = bal <= 0;

  return (
    <div className="relative flex h-full min-h-[215px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-ink p-4 text-white shadow-card">
      {/* decorative credit-card flourishes */}
      <span className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/5" />
      <span className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-copper/10" />

      <div className="relative flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex min-w-0 items-center gap-2.5 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[14px] font-bold text-navy">{initial}</span>
          <span className="min-w-0">
            <span className="block break-words font-heading text-[14px] font-bold leading-tight hover:underline">{r.name}</span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isCustomer ? 'Customer' : 'Supplier'} · {fmtNum(r.doc_count)} {isCustomer ? 'inv.' : 'pur.'}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          <IconButton className="bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={onEdit} title="Edit"><Pencil size={13} /></IconButton>
          <IconButton className="text-red-400 hover:bg-red-500/15 hover:text-red-400" onClick={onDelete} title="Delete"><Trash2 size={13} /></IconButton>
        </div>
      </div>

      {/* chip + brand mark, the classic card band */}
      <div className="relative mt-3 flex items-center justify-between">
        <span className="h-6 w-8 rounded-[5px] bg-gradient-to-br from-copper/80 to-copper/40 ring-1 ring-white/20" />
        <span className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-white/50">HIKER</span>
      </div>

      <button onClick={onOpen} className="relative mt-3 block w-full text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Remaining</div>
        <div className={`num text-[22px] font-extrabold leading-tight ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {positive ? '+' : '−'}{fmtRs(Math.abs(bal))}
        </div>
      </button>

      <div className="relative mt-auto space-y-1 border-t border-white/10 pt-2 text-[11px] font-semibold">
        <div className="flex items-center justify-between text-emerald-400">
          <span>Jamma (Credit)</span><span className="num">{fmtRs(r.credit_total)}</span>
        </div>
        <div className="flex items-center justify-between text-red-400">
          <span>Banam (Debit)</span><span className="num">{fmtRs(r.debit_total)}</span>
        </div>
      </div>

      <div className="relative mt-2 flex items-center justify-between gap-2 text-[10px] text-white/45">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {r.phone ? (<><Phone size={10} /> {r.phone}</>) : (lt ? lt.label : '—')}
        </span>
        {lt && <span className="shrink-0">{lt.date}</span>}
      </div>
    </div>
  );
}
