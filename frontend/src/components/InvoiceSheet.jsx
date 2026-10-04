import { fmtRs } from '../lib/api';

const TEAL = '#0f766e';
const TEAL_LIGHT = '#14b8a6';

function Wave({ flip }) {
  return (
    <svg viewBox="0 0 794 90" className="block w-full" style={{ height: 64 }} preserveAspectRatio="none">
      <path
        d={flip
          ? 'M794 90 L794 34 C 650 90, 560 8, 397 30 C 240 52, 130 96, 0 56 L0 90 Z'
          : 'M0 0 L794 0 L794 52 C 640 96, 540 26, 397 44 C 250 62, 140 4, 0 46 Z'}
        fill={TEAL}
      />
      <path
        d={flip
          ? 'M794 90 L794 52 C 640 96, 550 26, 397 42 C 245 58, 135 88, 0 62 L0 90 Z'
          : 'M0 0 L794 0 L794 74 C 645 40, 545 60, 397 66 C 250 72, 130 44, 0 78 Z'}
        fill={TEAL_LIGHT}
        opacity="0.35"
      />
    </svg>
  );
}

export default function InvoiceSheet({ settings, invoice, compact }) {
  const cur = settings.currency || 'Rs';
  const money = (n) => `${cur} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const lines = invoice.lines || [];
  const showBank = invoice.payment_method === 'account';

  return (
    <div
      className={`print-sheet mx-auto bg-white text-[#0f172a] ${compact ? 'w-full rounded-lg' : 'max-w-[794px] rounded-xl'} shadow-xl`}
      style={{ colorScheme: 'light' }}
    >
      <Wave />
      <div className="px-8 pb-2 pt-1 md:px-10">
        {/* Company + invoice no */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-heading text-xl font-extrabold" style={{ color: TEAL }}>{settings.company_name}</div>
            {settings.tagline && <div className="text-[11px] text-slate-500">{settings.tagline}</div>}
            <div className="mt-1 text-[11px] leading-4 text-slate-600">
              {settings.address}{settings.address && <br />}
              {settings.phone}{settings.phone && settings.email ? ' · ' : ''}{settings.email}
            </div>
          </div>
          <div className="text-right">
            <div className="microlabel" style={{ color: TEAL }}>Invoice</div>
            <div className="font-heading text-lg font-extrabold">{invoice.invoice_no || '—'}</div>
            <div className="num text-[11px] text-slate-500">{invoice.date}</div>
          </div>
        </div>

        {/* Bill to / ship to */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="microlabel" style={{ color: TEAL }}>Bill To</div>
            <div className="font-heading text-[13px] font-bold">{invoice.customer_name}</div>
            <div className="text-[11px] text-slate-600">{invoice.customer_address}{invoice.customer_city ? ', ' + invoice.customer_city : ''}</div>
            <div className="text-[11px] text-slate-600">{invoice.customer_phone}</div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="microlabel" style={{ color: TEAL }}>Ship To</div>
            <div className="text-[11px] text-slate-600">Same as billing, unless stated below.</div>
            <div className="text-[11px] font-semibold text-slate-700">{invoice.notes || ''}</div>
          </div>
        </div>

        {/* Items — fixed widths, never clipped */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr style={{ background: TEAL }} className="text-white">
                <th className="w-8 px-2 py-2 text-left font-heading text-[10px] font-bold uppercase tracking-wide">#</th>
                <th className="w-40 px-2 py-2 text-left font-heading text-[10px] font-bold uppercase tracking-wide">Article</th>
                <th className="w-28 px-2 py-2 text-left font-heading text-[10px] font-bold uppercase tracking-wide">Carton type</th>
                <th className="w-16 px-2 py-2 text-right font-heading text-[10px] font-bold uppercase tracking-wide">Cartons</th>
                <th className="w-16 px-2 py-2 text-right font-heading text-[10px] font-bold uppercase tracking-wide">Pairs</th>
                <th className="w-24 px-2 py-2 text-right font-heading text-[10px] font-bold uppercase tracking-wide">Rate</th>
                <th className="w-28 px-2 py-2 text-right font-heading text-[10px] font-bold uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id || i} className={i % 2 ? 'bg-slate-50' : ''}>
                  <td className="num px-2 py-1.5">{i + 1}</td>
                  <td className="px-2 py-1.5">{l.article_code} {l.article_name}</td>
                  <td className="px-2 py-1.5 text-slate-600">{l.carton_type || '—'}</td>
                  <td className="num px-2 py-1.5 text-right">{l.cartons}</td>
                  <td className="num px-2 py-1.5 text-right">{l.pairs}</td>
                  <td className="num px-2 py-1.5 text-right">{money(l.rate)}</td>
                  <td className="num px-2 py-1.5 text-right font-semibold">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment info + summary */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {showBank ? (
            <div className="rounded-lg p-3" style={{ background: '#f0fdfa', border: `1px solid ${TEAL_LIGHT}55` }}>
              <div className="microlabel" style={{ color: TEAL }}>Payment Info</div>
              <div className="text-[11px] leading-4.5 text-slate-700">
                <strong>{settings.bank_name}</strong><br />
                Account title: {settings.account_title}<br />
                Account no: {settings.account_no}<br />
                IBAN: {settings.iban}
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="microlabel" style={{ color: TEAL }}>Payment</div>
              <div className="text-[11px] font-semibold text-slate-700">Cash — payable on delivery.</div>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 p-3 text-[12px]">
            <div className="flex justify-between py-0.5"><span className="text-slate-500">Subtotal</span><span className="num">{money(invoice.subtotal)}</span></div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between py-0.5"><span className="text-slate-500">Discount</span><span className="num">− {money(invoice.discount)}</span></div>
            )}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5">
              <span className="font-heading font-bold" style={{ color: TEAL }}>Grand Total</span>
              <span className="num font-heading text-[14px] font-extrabold">{money(invoice.total)}</span>
            </div>
            <div className="flex justify-between py-0.5"><span className="text-slate-500">Received</span><span className="num">{money(invoice.received)}</span></div>
            <div className="flex justify-between py-0.5"><span className="font-heading font-bold">Balance</span><span className="num font-bold">{money(invoice.balance)}</span></div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-[11px] text-slate-500">
              <span>{invoice.total_cartons} cartons</span><span>{invoice.total_pairs} pairs</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-500">{settings.footer_note}</div>
      </div>
      <Wave flip />
    </div>
  );
}
