import { useEffect, useState } from 'react';
import { api, fmtRs, daysAgo, today } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, PageHeader, Empty, Badge, Input } from '../components/ui';
import { Download, Printer } from 'lucide-react';

const TABS = [
  { key: 'roznamcha', label: 'Roznamcha' },
  { key: 'payments', label: 'Payments' },
  { key: 'kharcha', label: 'Kharcha' },
  { key: 'sales', label: 'Sales' },
  { key: 'stock', label: 'Stock' },
  { key: 'purchase', label: 'Purchase' },
];

const CONFIG = {
  roznamcha: {
    url: (from, to) => `/roznamcha?from=${from}&to=${to}`,
    columns: ['Date', 'Direction', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
    toRow: (r) => [r.date, r.direction, r.source, r.party, r.description, r.category, r.amount, r.method],
    head: ['Date', 'Dir', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
    render: (rows) => rows.map((r) => (
      <tr key={r.id}>
        <td className="num text-mutedfg">{r.date}</td>
        <td><Badge tone={r.direction}>{r.direction}</Badge></td>
        <td>{r.source}</td>
        <td>{r.party || '—'}</td>
        <td>{r.description || '—'}</td>
        <td className="text-mutedfg">{r.category || '—'}</td>
        <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
      </tr>
    )),
  },
  payments: {
    url: (from, to) => `/payments?from=${from}&to=${to}`,
    columns: ['Date', 'Party', 'Type', 'Direction', 'Amount', 'Method', 'Reference'],
    toRow: (r) => [r.date, r.party_name, r.party_type, r.direction, r.amount, r.method, r.reference],
    head: ['Date', 'Party', 'Type', 'Dir', 'Amount', 'Method', 'Reference'],
    render: (rows) => rows.map((r) => (
      <tr key={r.id}>
        <td className="num text-mutedfg">{r.date}</td>
        <td className="font-semibold">{r.party_name}</td>
        <td className="text-mutedfg">{r.party_type}</td>
        <td><Badge tone={r.direction}>{r.direction}</Badge></td>
        <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
        <td className="text-mutedfg">{r.reference || '—'}</td>
      </tr>
    )),
  },
  kharcha: {
    url: (from, to) => `/kharcha?from=${from}&to=${to}`,
    columns: ['Date', 'Category', 'Description', 'Amount', 'Method'],
    toRow: (r) => [r.date, r.category, r.description, r.amount, r.method],
    head: ['Date', 'Category', 'Description', 'Amount', 'Method'],
    render: (rows) => rows.map((r) => (
      <tr key={r.id}>
        <td className="num text-mutedfg">{r.date}</td>
        <td>{r.category || '—'}</td>
        <td>{r.description || '—'}</td>
        <td className="num text-right font-bold text-red-600">{fmtRs(r.amount)}</td>
        <td className="text-mutedfg">{r.method}</td>
      </tr>
    )),
  },
  sales: {
    url: (from, to) => `/invoices?from=${from}&to=${to}`,
    columns: ['Invoice', 'Date', 'Customer', 'Cartons', 'Pairs', 'Total', 'Received', 'Balance', 'Status'],
    toRow: (r) => [r.invoice_no, r.date, r.customer_name, r.total_cartons, r.total_pairs, r.total, r.received, r.balance, r.status],
    head: ['Invoice', 'Date', 'Customer', 'Cartons', 'Pairs', 'Total', 'Received', 'Balance', 'Status'],
    render: (rows) => rows.map((r) => (
      <tr key={r.id}>
        <td className="num font-semibold">{r.invoice_no}</td>
        <td className="num text-mutedfg">{r.date}</td>
        <td>{r.customer_name}</td>
        <td className="num text-right">{r.total_cartons}</td>
        <td className="num text-right">{r.total_pairs}</td>
        <td className="num text-right font-bold">{fmtRs(r.total)}</td>
        <td className="num text-right">{fmtRs(r.received)}</td>
        <td className="num text-right">{fmtRs(r.balance)}</td>
        <td><Badge tone={r.status}>{r.status}</Badge></td>
      </tr>
    )),
  },
  stock: {
    url: () => `/ready-shoes`,
    columns: ['Code', 'Article', 'Cartons', 'Pairs'],
    toRow: (r) => [r.code, r.name, r.cartons, r.pairs],
    head: ['Code', 'Article', 'Cartons', 'Pairs ready'],
    render: (rows) => rows.map((r) => (
      <tr key={r.article_id}>
        <td className="num font-semibold">{r.code}</td>
        <td>{r.name}</td>
        <td className="num text-right">{r.cartons}</td>
        <td className="num text-right font-bold">{r.pairs}</td>
      </tr>
    )),
    dataKey: 'stock',
  },
  purchase: {
    url: () => `/purchases`,
    columns: ['Date', 'Supplier', 'Item', 'Category', 'Quantity', 'Total pairs', 'Amount'],
    toRow: (r) => [r.date, r.supplier_name, r.item, r.category_slug, r.quantity, r.total_pairs, r.amount],
    head: ['Date', 'Supplier', 'Item', 'Category', 'Qty', 'Total pairs', 'Amount'],
    render: (rows) => rows.map((r) => (
      <tr key={r.id}>
        <td className="num text-mutedfg">{r.date}</td>
        <td className="font-semibold">{r.supplier_name}</td>
        <td>{r.item}</td>
        <td>{r.category_slug}</td>
        <td className="num text-right">{r.quantity}</td>
        <td className="num text-right">{r.total_pairs}</td>
        <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
      </tr>
    )),
  },
};

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const cfg = CONFIG[tab];
  useEffect(() => {
    api.get(cfg.url(from, to))
      .then((d) => setRows(Array.isArray(d) ? d : d[cfg.dataKey || 'stock']))
      .catch((e) => setError(e.message));
  }, [tab, from, to]);

  return (
    <div>
      <PageHeader title="Reports" actions={
        <>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-36" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-36" />
          <Button variant="secondary" onClick={() => downloadCSV(`${tab}-report.csv`, cfg.columns, rows.map(cfg.toRow))}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}><Printer size={14} /> Print</Button>
        </>
      } />

      <div className="no-print mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${tab === t.key ? 'bg-copper text-white' : 'bg-card text-mutedfg border border-borderc hover:bg-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card title={TABS.find((t) => t.key === tab).label}>
        {rows.length === 0 ? <Empty>No data in this range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>{cfg.head.map((h, i) => <th key={h} className={i > 0 && ['Amount', 'Total', 'Received', 'Balance', 'Pairs', 'Qty', 'Total pairs', 'Cartons'].includes(h) ? 'text-right' : ''}>{h}</th>)}</tr></thead>
              <tbody>{cfg.render(rows)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
