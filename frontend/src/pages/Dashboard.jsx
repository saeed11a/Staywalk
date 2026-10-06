import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import { api, fmtRs, fmtNum } from '../lib/api';
import { Button, Card, PageHeader, StatCard, Badge } from '../components/ui';

const TEAL = '#0d6e63';
const COPPER = '#b17f45';
const INK = '#1b1b1b';
const CAT_COLORS = ['#0d6e63', '#b17f45', '#16212b', '#4f7d8c', '#8a6d3b', '#5b6b73', '#7a4b3a'];
const axisTick = { fontSize: 11 };
const tooltipStyle = { fontSize: 12, borderRadius: 10, border: '1px solid #e6e2dc' };
const kfmt = (v) => (v >= 1000 ? v / 1000 + 'k' : v);

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setD(await api.get('/dashboard'));
      
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live: re-pull every 30s so production and stock levels stay current.
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>;
  if (!d) return <div className="text-sm text-mutedfg">Loading…</div>;

  const trend = d.trend || [];
  const stock = d.stock_by_category || [];
  const byArticle = d.sales_by_article || [];

  return (
    <div>
  <PageHeader
    label="Hiker Shoes Factory"
    title="Factory dashboard"
    description="Live stock, production and sales across every category — refreshed automatically."
    actions={
      <div className="flex items-center gap-3">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
          title="Live"
        />

        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            load();
          }}
        >
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
    }
  />

  {d.low_stock && (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
      Uppers stock is below the low-stock alert level — top up soon.
    </div>
  )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sales invoiced" value={fmtRs(d.sales_invoiced)} sub={`${fmtNum(d.invoice_count)} invoice(s)`} accent="copper" />
        <StatCard label="Pairs sold" value={`${fmtNum(d.pairs_sold)} prs`} sub="Through invoices" accent="teal" />
        <StatCard label={`Pairs produced · ${d.trend_days}d`} value={`${fmtNum(d.production_recent)} prs`} sub={`${fmtNum(d.production_pairs)} prs all-time`} accent="ink" />
        <StatCard label="Ready shoes" value={`${fmtNum(d.ready_pairs)} prs`} sub="Available to invoice" accent="copper" />
        <StatCard label="Uppers in factory" value={`${fmtNum(d.uppers_pairs)} prs`} sub={`Raw stock value ${fmtRs(d.stock_value)}`} accent="teal" />
        <StatCard label="Receivable" value={fmtRs(d.receivables)} sub="Outstanding from customers" accent="ink" />
        <StatCard label="Cash in hand" value={fmtRs(d.cash)} sub={`In ${fmtRs(d.cash_in)} · Out ${fmtRs(d.cash_out)}`} accent="copper" />
        <StatCard label="Kharcha (daily expenses)" value={fmtRs(d.kharcha_total)} sub={`${fmtNum(d.roznamcha_entries)} roznamcha entries`} accent="teal" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sales trend" actions={<span className="text-[11px] text-mutedfg">Invoice value · last {d.trend_days} days</span>}>
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} stroke="#9ca3af" />
                <YAxis tick={axisTick} stroke="#9ca3af" width={46} tickFormatter={kfmt} />
                <Tooltip formatter={(v) => [fmtRs(v), 'Invoiced']} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="sales" stroke={TEAL} strokeWidth={2} fill="url(#sales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Production volume" actions={<span className="text-[11px] text-mutedfg">Pairs made · last {d.trend_days} days</span>}>
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} stroke="#9ca3af" />
                <YAxis tick={axisTick} stroke="#9ca3af" width={46} tickFormatter={kfmt} />
                <Tooltip formatter={(v) => [`${fmtNum(v)} pairs`, 'Produced']} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(177,127,69,0.08)' }} />
                <Bar dataKey="produced" fill={COPPER} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Remaining stock by category" actions={<span className="text-[11px] text-mutedfg">Raw + finished · own units</span>}>
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stock} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                <XAxis dataKey="name" tick={axisTick} stroke="#9ca3af" interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={axisTick} stroke="#9ca3af" width={46} tickFormatter={kfmt} />
                <Tooltip formatter={(v, n, p) => [`${fmtNum(v)} ${p.payload.unit}`, `${p.payload.name} on hand`]} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="level" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {stock.map((s, i) => <Cell key={s.slug} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Sales by article" actions={<span className="text-[11px] text-mutedfg">Pairs sold · all invoices</span>}>
          {byArticle.length === 0 ? (
            <div className="px-4 py-16 text-center text-[12px] text-mutedfg">No sales recorded yet.</div>
          ) : (
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byArticle} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececec" horizontal={false} />
                  <XAxis type="number" tick={axisTick} stroke="#9ca3af" tickFormatter={kfmt} />
                  <YAxis type="category" dataKey="code" tick={axisTick} stroke="#9ca3af" width={70} />
                  <Tooltip
                    formatter={(v, n, p) => [`${fmtNum(v)} pairs · ${fmtRs(p.payload.value)}`, p.payload.name]}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(27,27,27,0.06)' }}
                  />
                  <Bar dataKey="pairs" fill={INK} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

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
