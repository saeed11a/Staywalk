import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtRs, fmtNum } from '../lib/api';
import { Button, Card, Dialog, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Plus, Trash2, Printer } from 'lucide-react';

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => api.get('/invoices').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const view = async (row) => {
    setViewing(await api.get('/invoices/' + row.id));
  };

  const remove = async (row) => {
    if (!confirm(`Move invoice ${row.invoice_no} to the recycle bin?`)) return;
    await api.del('/invoices/' + row.id);
    load();
  };

  return (
    <div>
      <PageHeader title="Invoices" actions={
        <Button onClick={() => navigate('/invoices/new')}><Plus size={15} /> New invoice</Button>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card>
        {rows.length === 0 ? <Empty>No invoices yet — create your first sale.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th className="text-right">Cartons</th><th className="text-right">Pairs</th><th className="text-right">Total</th><th className="text-right">Received</th><th className="text-right">Balance</th><th>Method</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num font-semibold">
                      <a href="#" onClick={(e) => { e.preventDefault(); view(r); }} className="text-copper hover:underline">{r.invoice_no}</a>
                    </td>
                    <td>{r.customer_name}</td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="num text-right">{fmtNum(r.total_cartons)}</td>
                    <td className="num text-right">{fmtNum(r.total_pairs)}</td>
                    <td className="num text-right font-bold">{fmtRs(r.total)}</td>
                    <td className="num text-right">{fmtRs(r.received)}</td>
                    <td className="num text-right">{fmtRs(r.balance)}</td>
                    <td className="text-mutedfg">{r.payment_method}</td>
                    <td><Badge tone={r.status}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      <Link to={`/invoices/${r.id}/print`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg" title="Print"><Printer size={14} /></Link>
                      <IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewing && (
        <Dialog title={`Invoice ${viewing.invoice_no}`} onClose={() => setViewing(null)} wide>
          <div className="p-5">
            <table className="tbl">
              <thead><tr><th>Article</th><th>Carton type</th><th className="text-right">Cartons</th><th className="text-right">Pairs</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {viewing.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.article_code} {l.article_name}</td>
                    <td className="text-mutedfg">{l.carton_type || '—'}</td>
                    <td className="num text-right">{l.cartons}</td>
                    <td className="num text-right">{l.pairs}</td>
                    <td className="num text-right">{fmtRs(l.rate)}</td>
                    <td className="num text-right font-bold">{fmtRs(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-2">
              <Link to={`/invoices/${viewing.id}/print`}><Button variant="secondary"><Printer size={14} /> Print</Button></Link>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
