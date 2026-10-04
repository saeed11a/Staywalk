import { useEffect, useState } from 'react';
import { api, fmtRs } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, PageHeader, Empty, Badge } from '../components/ui';
import { Download } from 'lucide-react';

export default function Sales() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invoices?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
  }, [from, to]);

  const total = rows.reduce((s, r) => s + r.total, 0);
  const received = rows.reduce((s, r) => s + r.received, 0);

  return (
    <div>
      <PageHeader title="Sales" actions={
        <>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-borderc bg-card px-3 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-borderc bg-card px-3 text-sm" />
          <Button variant="secondary" onClick={() => downloadCSV('sales.csv',
            ['Invoice', 'Date', 'Customer', 'Cartons', 'Pairs', 'Total', 'Received', 'Balance', 'Status'],
            rows.map((r) => [r.invoice_no, r.date, r.customer_name, r.total_cartons, r.total_pairs, r.total, r.received, r.balance, r.status]))}>
            <Download size={14} /> CSV
          </Button>
        </>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Invoices</div><div className="num font-bold">{rows.length}</div></div>
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Sales</div><div className="num font-bold">{fmtRs(total)}</div></div>
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Received</div><div className="num font-bold text-emerald-700">{fmtRs(received)}</div></div>
      </div>

      <Card>
        {rows.length === 0 ? <Empty>No sales in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="text-right">Cartons</th><th className="text-right">Pairs</th><th className="text-right">Total</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num font-semibold">{r.invoice_no}</td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td>{r.customer_name}</td>
                    <td className="num text-right">{r.total_cartons}</td>
                    <td className="num text-right">{r.total_pairs}</td>
                    <td className="num text-right font-bold">{fmtRs(r.total)}</td>
                    <td className="num text-right">{fmtRs(r.balance)}</td>
                    <td><Badge tone={r.status}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
