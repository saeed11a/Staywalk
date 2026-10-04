import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today, daysAgo } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton, StatCard, DateRange } from '../components/ui';
import { Plus, Trash2, Download, Printer } from 'lucide-react';

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/payments?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/customers').then(setCustomers);
    api.get('/suppliers').then(setSuppliers);
  }, [from, to]);

  const open = () => setForm({
    party_type: 'customer', party_id: '', amount: '', date: today(), method: 'Cash', reference: '',
  });

  const create = async (e) => {
    e.preventDefault();
    const body = {
      party_type: form.party_type,
      party_id: Number(form.party_id),
      party_name: (form.party_type === 'customer' ? customers : suppliers).find((p) => p.id === Number(form.party_id))?.name || '',
      direction: form.party_type === 'customer' ? 'in' : 'out',
      amount: Number(form.amount) || 0,
      date: form.date, method: form.method, reference: form.reference,
    };
    try {
      await api.post('/payments', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this payment to the recycle bin?')) return;
    await api.del('/payments/' + row.id);
    load();
  };

  const partyList = form?.party_type === 'customer' ? customers : suppliers;
  const receipts = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const paidOut = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Kata postings"
        title="Payments"
        description="Receipts from customers credit their kata; payments to suppliers debit the supplier balance. Both post to the roznamcha."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('payments.csv',
              ['Date', 'Party', 'Type', 'Method', 'Reference', 'Amount', 'Cash'],
              rows.map((r) => [r.date, r.party_name, r.party_type, r.method, r.reference, r.amount, r.direction === 'in' ? 'IN' : 'OUT']))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={open}><Plus size={15} /> New payment</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receipts" value={fmtRs(receipts)} sub="Cash in from customers" accent="copper" />
        <StatCard label="Paid out" value={fmtRs(paidOut)} sub="Cash out to suppliers" accent="teal" />
        <StatCard label="Net movement" value={fmtRs(receipts - paidOut)} accent="ink" />
        <StatCard label="Entries" value={fmtNum(rows.length)} accent="copper" />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title="Payment postings">
        {rows.length === 0 ? <Empty>No payments recorded in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Party</th><th>Type</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th>Cash</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="font-semibold">{r.party_name}</td>
                    <td><Badge tone={r.party_type === 'customer' ? 'active' : 'partial'}>{r.party_type}</Badge></td>
                    <td className="text-mutedfg">{r.method}</td>
                    <td className="text-mutedfg">{r.reference || '—'}</td>
                    <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
                    <td>
                      <span className={`text-[11px] font-bold uppercase ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {r.direction === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td><IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && form && (
        <Dialog title="New payment" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Party type">
                <Select value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value, party_id: '' })}>
                  <option value="customer">Customer (receipt in)</option>
                  <option value="supplier">Supplier (payment out)</option>
                </Select>
              </Field>
              <Field label="Party *">
                <Select value={form.party_id} onChange={(e) => setForm({ ...form, party_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {partyList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Amount (Rs) *"><Input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
              <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Method">
                <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {['Cash', 'Bank', 'Cheque', 'Online'].map((m) => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" /></Field>
            </div>
            <p className="mb-1 text-[11px] text-mutedfg">Customer receipts post to Roznamcha as customer_receipt; supplier payments as supplier_payment — party kata updates automatically.</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit">Save payment</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
