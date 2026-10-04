import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, fmtRs, fmtNum } from '../lib/api';
import { Card, PageHeader, StatCard, Stats, Badge } from '../components/ui';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>;
  if (!d) return <div className="text-sm text-mutedfg">Loading…</div>;

  const chart = (d.sales_chart || []).map((r) => ({ ...r, label: r.date.slice(5) }));

  return (
    <div>
      <PageHeader
        label="Hiker Shoes Factory"
        title="Factory dashboard"
        description="Live position of stock, production, sales and cash across every module."
      />

      {d.low_stock && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
          Uppers stock is below the low-stock alert level — top up soon.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales invoiced" value={fmtRs(d.sales_invoiced)} sub={`${d.invoice_count} invoice(s)`} accent="copper" />
        <StatCard label="Receivable" value={fmtRs(d.receivables)} sub="Outstanding from customers" accent="teal" />
        <StatCard label="Cash in hand" value={fmtRs(d.cash)} sub={`In ${fmtRs(d.cash_in)} · Out ${fmtRs(d.cash_out)}`} accent="ink" />
        <StatCard label="Kharcha (daily expenses)" value={fmtRs(d.kharcha_total)} sub="Daily expenses paid" accent="copper" />
        <StatCard label="Uppers in factory" value={`${fmtNum(d.uppers_pairs)} prs`} sub="Available for production" accent="teal" />
        <StatCard label="Ready shoes" value={`${fmtNum(d.ready_pairs)} prs`} sub="Available to invoice" accent="ink" />
        <StatCard label="Pairs sold" value={`${fmtNum(d.pairs_sold)} prs`} sub="Through invoices" accent="copper" />
        <StatCard label="Cash book entries" value={fmtNum(d.roznamcha_entries)} sub="Roznamcha entries recorded" accent="teal" />
      </div>

      <Card title="Sales by date" actions={<span className="text-[11px] text-mutedfg">Invoice value booked on each day</span>}>
        {chart.length === 0 ? (
          <div className="px-4 py-14 text-center text-[12px] text-mutedfg">No sales recorded yet.</div>
        ) : (
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d6e63" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0d6e63" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => (v >= 1000 ? v / 1000 + 'k' : v)} />
                <Tooltip formatter={(v) => fmtRs(v)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                <Area type="monotone" dataKey="total" stroke="#0d6e63" strokeWidth={2} fill="url(#sales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Stock alerts" className="mt-4">
        {(!d.stock_alerts || d.stock_alerts.length === 0) ? (
          <div className="px-4 py-8 text-center text-[12px] text-mutedfg">Every article is above the alert level.</div>
        ) : (
          <div className="divide-y divide-borderc/70">
            {d.stock_alerts.map((a) => (
              <div key={a.code} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="text-[13px] font-semibold">{a.code}</div>
                  <div className="text-[11px] text-mutedfg">{a.name}</div>
                </div>
                <Badge tone={a.pairs <= 30 ? 'unpaid' : 'partial'}>{a.pairs} pairs</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
