import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtRs, fmtNum, daysAgo, today } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton, StatCard, DateRange } from '../components/ui';
import { Plus, Trash2, Download, Printer, Wallet } from 'lucide-react';

export default function Roznamcha() {
  const [rows, setRows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    api.get(`/roznamcha?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
    api.get('/dashboard').then(setDashboard).catch(() => {});
  };
  useEffect(() => { load(); }, [from, to]);

  const create = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.amount = Number(body.amount) || 0;
    try {
      await api.post('/roznamcha', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this entry to the recycle bin?')) return;
    await api.del('/roznamcha/' + row.id);
    load();
  };

  const totalIn = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalOut = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const kharcha = rows.filter((r) => r.source === 'kharcha').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Cash book"
        title="Roznamcha"
        description="Cash in hand, amounts received from customers, other income, supplier payments and daily expenses — with the remaining balance."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('roznamcha.csv',
              ['Date', 'Direction', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
              rows.map((r) => [r.date, r.direction, r.source, r.party, r.description, r.category, r.amount, r.method]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button variant="secondary" onClick={() => navigate('/payments')}><Wallet size={15} /> Record payment</Button>
            <Button onClick={() => setCreating(true)}><Plus size={15} /> New entry</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total in" value={fmtRs(totalIn)} accent="teal" />
        <StatCard label="Total out" value={fmtRs(totalOut)} accent="copper" />
        <StatCard label="Kharcha included" value={fmtRs(kharcha)} sub="Daily expenses paid" accent="ink" />
        <StatCard
          label="Remaining balance"
          value={fmtRs(dashboard?.cash ?? totalIn - totalOut)}
          sub={`Opening ${fmtRs(dashboard?.opening_cash ?? 0)}`}
          accent="copper"
        />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title={`Cash book — ${fmtNum(rows.length)} entries`}>
        {rows.length === 0 ? <Empty>No entries in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Particulars</th><th>Party</th><th>Method</th><th>Category</th><th className="text-right">Amount</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td>
                      <div className="font-semibold">{r.description || r.source}</div>
                      <div className="text-[11px] text-mutedfg">
                        {r.source}
                        {r.reference ? ` · ${r.reference}` : ''}
                      </div>
                    </td>
                    <td>{r.party || '—'}</td>
                    <td className="text-mutedfg">{r.method || '—'}</td>
                    <td className="text-mutedfg">{r.category || '—'}</td>
                    <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {r.direction === 'in' ? '' : '−'}{fmtRs(r.amount)}
                    </td>
                    <td><IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <Dialog title="Add roznamcha entry" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Direction">
                <Select name="direction" defaultValue="in"><option value="in">in</option><option value="out">out</option></Select>
              </Field>
              <Field label="Source">
                <Select name="source" defaultValue="other_income">
                  <option value="other_income">other income</option>
                  <option value="opening">opening</option>
                </Select>
              </Field>
              <Field label="Amount (Rs) *"><Input name="amount" type="number" min="0" step="any" required /></Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={today()} /></Field>
              <Field label="Party"><Input name="party" /></Field>
              <Field label="Category"><Input name="category" /></Field>
              <Field label="Description" className="col-span-2"><Input name="description" /></Field>
              <Field label="Method"><Select name="method" defaultValue="Cash">{['Cash', 'Bank', 'Cheque', 'Online'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Reference"><Input name="reference" /></Field>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
