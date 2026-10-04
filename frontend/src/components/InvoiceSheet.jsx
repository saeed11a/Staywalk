const TEAL = '#0d6e63';

export default function InvoiceSheet({ settings, invoice, compact }) {
  const cur = settings.currency || 'Rs';
  const money = (n) => `${cur} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const lines = invoice.lines || [];
  const showBank = invoice.payment_method === 'account';

  return (
    <div
      className={`print-sheet mx-auto overflow-hidden bg-white text-[#111] ${compact ? 'w-full rounded-xl' : 'max-w-[794px] rounded-xl'} shadow-xl`}
      style={{ colorScheme: 'light' }}
    >
      {/* Teal header */}
      <div className="px-7 pb-5 pt-6 md:px-9" style={{ background: TEAL }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 text-white">
            <div className="font-heading text-[20px] font-extrabold leading-tight">{settings.company_name}</div>
            {settings.tagline && <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{settings.tagline}</div>}
            <div className="mt-2 text-[11px] leading-5 text-white/75">
              {settings.address && <div>{settings.address}</div>}
              <div>{[settings.phone, settings.email].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: TEAL }}>Invoice</div>
            <div className="num mt-0.5 text-[15px] font-extrabold">{invoice.invoice_no || '—'}</div>
            <div className="num text-[11px] text-slate-500">{invoice.date}</div>
          </div>
        </div>
      </div>

      <div className="px-7 pb-6 pt-5 md:px-9">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice to</div>
            <div className="font-heading text-[13px] font-bold">{invoice.customer_name}</div>
            <div className="text-[11px] text-slate-500">
              {[invoice.customer_address, invoice.customer_city].filter(Boolean).join(', ')}
              {invoice.customer_phone ? ` · ${invoice.customer_phone}` : ''}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice no.</div>
            <div className="num text-[12px] font-semibold">{invoice.invoice_no || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice date</div>
            <div className="num text-[12px] font-semibold">{invoice.date}</div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr style={{ background: TEAL }} className="text-white">
                <th className="w-44 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Description</th>
                <th className="w-28 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Carton type</th>
                <th className="w-16 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide">Cartons</th>
                <th className="w-16 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide">Pairs</th>
                <th className="w-24 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide">Rate</th>
                <th className="w-28 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-3 text-center text-[11px] text-slate-400">No items yet</td></tr>
              )}
              {lines.map((l, i) => (
                <tr key={l.id || i} className={i % 2 ? 'bg-slate-50' : ''}>
                  <td className="px-3 py-2">
                    <div className="num font-bold">{l.article_code || '—'}</div>
                    <div className="text-[10px] text-slate-500">{l.article_name}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{l.carton_type || '—'}</td>
                  <td className="num px-3 py-2 text-right">{l.cartons}</td>
                  <td className="num px-3 py-2 text-right">{l.pairs}</td>
                  <td className="num px-3 py-2 text-right">{money(l.rate)}</td>
                  <td className="num px-3 py-2 text-right font-semibold">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment info + summary */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {showBank ? (
            <div className="rounded-lg border p-3" style={{ background: '#f0faf8', borderColor: '#0d6e6355' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>Payment info</div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-700">
                <div><span className="text-slate-500">Bank:</span> <strong>{settings.bank_name}</strong></div>
                <div><span className="text-slate-500">Account title:</span> <strong>{settings.account_title}</strong></div>
                <div><span className="text-slate-500">Account no.:</span> <strong className="num">{settings.account_no}</strong></div>
                <div className="col-span-2"><span className="text-slate-500">IBAN:</span> <strong className="num">{settings.iban}</strong></div>
                <div><span className="text-slate-500">Method:</span> <strong>Account transfer</strong></div>
                <div><span className="text-slate-500">Received:</span> <strong className="num">{money(invoice.received)}</strong></div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>Payment info</div>
              <div className="mt-1 text-[11px] text-slate-700">
                <div><span className="text-slate-500">Method:</span> <strong>Cash</strong></div>
                <div><span className="text-slate-500">Received:</span> <strong className="num">{money(invoice.received)}</strong></div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 p-3 text-[12px]">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>Summary</div>
            <div className="mt-1.5 flex justify-between py-0.5"><span className="text-slate-500">Subtotal</span><span className="num">{money(invoice.subtotal)}</span></div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between py-0.5"><span className="text-slate-500">Discount</span><span className="num">− {money(invoice.discount)}</span></div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-md px-3 py-1.5 text-white" style={{ background: TEAL }}>
              <span className="text-[10px] font-bold uppercase tracking-wider">Grand total</span>
              <span className="num text-[13px] font-extrabold">{money(invoice.total)}</span>
            </div>
            <div className="mt-1.5 flex justify-between py-0.5"><span className="text-slate-500">Received</span><span className="num">{money(invoice.received)}</span></div>
            <div className="flex justify-between py-0.5"><span className="font-semibold">Balance</span><span className="num font-bold">{money(invoice.balance)}</span></div>
            <div className="num mt-1.5 border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">
              {invoice.total_cartons} carton(s) · {invoice.total_pairs} prs
            </div>
          </div>
        </div>
      </div>

      {/* Teal footer */}
      <div className="px-7 py-4 text-center text-white md:px-9" style={{ background: TEAL }}>
        <div className="font-heading text-[13px] font-bold">{settings.company_name}</div>
        <div className="mt-0.5 text-[10px] text-white/75">
          {[settings.phone, settings.email, settings.address].filter(Boolean).join(' · ')}
        </div>
        {settings.footer_note && <div className="mt-1 text-[10px] italic text-white/70">{settings.footer_note}</div>}
        <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">Page 1 of 1</div>
      </div>
    </div>
  );
}
