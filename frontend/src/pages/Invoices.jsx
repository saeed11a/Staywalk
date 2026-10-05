import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtRs, fmtNum, today, daysAgo } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, PageHeader, Badge, Empty, IconButton, StatCard, DateRange } from '../components/ui';
import { Plus, Trash2, Printer, Download } from 'lucide-react';
import { ClickableRow, rowAction } from '../components/RecordDialog';

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => api.get(`/invoices?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [from, to]);

  const view = async (row) => {
    setViewing(await api.get('/invoices/' + row.id));
  };

  const remove = async (row) => {
    if (!confirm(`Move invoice ${row.invoice_no} to the recycle bin?`)) return;
    await api.del('/invoices/' + row.id);
    load();
  };

  const value = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const received = rows.reduce((s, r) => s + (Number(r.received) || 0), 0);
  const outstanding = rows.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const pairs = rows.reduce((s, r) => s + (Number(r.total_pairs) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Sales desk"
        title="Invoices"
        description="Create an invoice, deduct pairs from Ready Shoes and post the balance to the customer's kata."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('invoices.csv',
              ['Invoice', 'Date', 'Customer', 'Cartons', 'Pairs', 'Total', 'Received', 'Balance', 'Status'],
              rows.map((r) => [r.invoice_no, r.date, r.customer_name, r.total_cartons, r.total_pairs, r.total, r.received, r.balance, r.status]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={() => navigate('/invoices/new')}><Plus size={15} /> New invoice</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Invoices" value={fmtNum(rows.length)} accent="copper" />
        <StatCard label="Value" value={fmtRs(value)} accent="teal" />
        <StatCard label="Received" value={fmtRs(received)} accent="ink" />
        <StatCard label="Outstanding" value={fmtRs(outstanding)} sub={`${fmtNum(pairs)} prs`} accent="copper" />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title="Invoice register">
        {rows.length === 0 ? <Empty title="No invoices yet">Create your first sale from the New invoice button.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="text-right">Cartons × pairs</th><th className="text-right">Total</th><th className="text-right">Received</th><th className="text-right">Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <ClickableRow key={r.id} onOpen={() => view(r)}>
                    <td className="num font-semibold text-copper">{r.invoice_no}</td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td>{r.customer_name}</td>
                    <td className="num text-right">{fmtNum(r.total_cartons)} × {fmtNum(r.total_pairs)}</td>
                    <td className="num text-right font-bold">{fmtRs(r.total)}</td>
                    <td className="num text-right">{fmtRs(r.received)}</td>
                    <td className="num text-right">{fmtRs(r.balance)}</td>
                    <td><Badge tone={r.status}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      <Link to={`/invoices/${r.id}/print`} onClick={rowAction(() => {})} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mutedfg hover:bg-muted hover:text-fg" title="Print"><Printer size={14} /></Link>
                      <IconButton onClick={rowAction(() => remove(r))}><Trash2 size={14} /></IconButton>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewing && (
        <Dialog title={`Invoice ${viewing.invoice_no}`} onClose={() => setViewing(null)} wide>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {[
                ['Customer', viewing.customer_name], ['Date', viewing.date],
                ['Status', viewing.status], ['Payment', viewing.payment_method],
                ['Cartons', fmtNum(viewing.total_cartons)], ['Pairs', fmtNum(viewing.total_pairs)],
                ['Subtotal', fmtRs(viewing.subtotal)], ['Discount', fmtRs(viewing.discount)],
                ['Total', fmtRs(viewing.total)], ['Received', fmtRs(viewing.received)],
                ['Balance', fmtRs(viewing.balance)], ['Phone', viewing.customer_phone],
                ['City', viewing.customer_city], ['Notes', viewing.notes],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-borderc py-2">
                  <span className="microlabel">{label}</span>
                  <span className="num text-right text-[13px] font-semibold">{value === '' || value == null ? '—' : value}</span>
                </div>
              ))}
            </div>
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
