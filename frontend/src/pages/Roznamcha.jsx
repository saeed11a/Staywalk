import { useEffect, useState } from 'react';
import { api, fmtRs, daysAgo, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function Roznamcha() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/roznamcha?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
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

  const totalIn = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="Roznamcha" actions={
        <>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-36" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-36" />
          <Button onClick={() => setCreating(true)}><Plus size={15} /> Add entry</Button>
        </>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Cash in</div><div className="num font-bold text-emerald-700">{fmtRs(totalIn)}</div></div>
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Cash out</div><div className="num font-bold text-red-600">{fmtRs(totalOut)}</div></div>
        <div className="rounded-xl border border-borderc bg-card p-3"><div className="microlabel">Net</div><div className="num font-bold">{fmtRs(totalIn - totalOut)}</div></div>
      </div>

      <Card>
        {rows.length === 0 ? <Empty>No entries in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Direction</th><th>Source</th><th>Party</th><th>Description</th><th>Category</th><th className="text-right">Amount</th><th>Method</th><th>Reference</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td><Badge tone={r.direction}>{r.direction === 'in' ? 'in' : 'out'}</Badge></td>
                    <td><Badge tone="copper">{r.source}</Badge></td>
                    <td>{r.party || '—'}</td>
                    <td>{r.description || '—'}</td>
                    <td className="text-mutedfg">{r.category || '—'}</td>
                    <td className={`num text-right font-bold ${r.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRs(r.amount)}</td>
                    <td className="text-mutedfg">{r.method || '—'}</td>
                    <td className="text-mutedfg">{r.reference || '—'}</td>
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
