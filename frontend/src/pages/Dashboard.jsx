import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, Truck, Footprints, Boxes, AlertTriangle, FileText,
  Factory, ShoppingCart, Users, BookOpenText, Receipt, BarChart3, Settings2, Trash2, Layers,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, fmtRs } from '../lib/api';
import { Card, PageHeader, Badge } from '../components/ui';

const MODULES = [
  { to: '/articles', label: 'Articles', icon: Layers },
  { to: '/raw-stock', label: 'Raw Stock', icon: Boxes },
  { to: '/ready-shoes', label: 'Ready Shoes', icon: Footprints },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/purchase', label: 'Purchase', icon: ShoppingCart },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/roznamcha', label: 'Roznamcha', icon: BookOpenText },
  { to: '/kharcha', label: 'Kharcha', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
];

function Kpi({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-xl border border-borderc bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="microlabel">{label}</span>
        <Icon size={15} className="text-copper" />
      </div>
      <div className="num mt-1.5 text-xl font-extrabold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-mutedfg">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>;
  if (!d) return <div className="text-sm text-mutedfg">Loading…</div>;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cash in hand" value={fmtRs(d.cash)} icon={Wallet} />
        <Kpi label="Receivables" value={fmtRs(d.receivables)} sub="customer kata" icon={TrendingUp} />
        <Kpi label="Payables" value={fmtRs(d.payables)} sub="supplier kata" icon={Truck} />
        <Kpi label="Ready pairs" value={Number(d.ready_pairs).toLocaleString()} sub={`${fmtRs(d.uppers_pairs)} uppers in stock`} icon={Footprints} />
      </div>

      {d.low_stock && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle size={16} /> Uppers stock is below the low-stock threshold — top up soon.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Sales — last 14 days" className="xl:col-span-2">
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.sales_chart.map((r) => ({ ...r, label: r.date.slice(5) }))}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => (v >= 1000 ? (v / 1000) + 'k' : v)} />
                <Tooltip formatter={(v) => fmtRs(v)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                <Area type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} fill="url(#sales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Stock alerts">
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
        </Card>
      </div>

      <Card title="Modules" className="mt-4">
        <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-7">
          {MODULES.map((m) => (
            <Link key={m.to} to={m.to}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-borderc bg-bg px-2 py-3 text-center transition-colors hover:border-copper hover:bg-copperlight">
              <m.icon size={18} className="text-copper" />
              <span className="text-[11px] font-semibold">{m.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
