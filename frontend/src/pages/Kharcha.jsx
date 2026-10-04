import { useEffect, useState } from 'react';
import { api, fmtRs, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Empty, IconButton } from '../components/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function Kharcha() {
  const [rows, setRows] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/kharcha').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.amount = Number(body.amount) || 0;
    try {
      await api.post('/kharcha', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this expense to the recycle bin?')) return;
    await api.del('/kharcha/' + row.id);
    load();
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="Kharcha" actions={<Button onClick={() => setCreating(true)}><Plus size={15} /> New expense</Button>} />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      {rows.length > 0 && (
        <div className="mb-3 rounded-xl border border-borderc bg-card p-3">
          <div className="microlabel">Total expenses</div>
          <div className="num font-bold text-red-600">{fmtRs(total)}</div>
        </div>
      )}
      <Card>
        {rows.length === 0 ? <Empty>No expenses recorded yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="text-right">Amount</th><th>Method</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="font-semibold">{r.category || '—'}</td>
                    <td>{r.description || '—'}</td>
                    <td className="num text-right font-bold text-red-600">{fmtRs(r.amount)}</td>
                    <td className="text-mutedfg">{r.method}</td>
                    <td><IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <Dialog title="New kharcha" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Input name="category" placeholder="Electricity, Wages, Rent…" autoFocus /></Field>
              <Field label="Amount (Rs) *"><Input name="amount" type="number" min="0" step="any" required /></Field>
              <Field label="Description" className="col-span-2"><Input name="description" /></Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={today()} /></Field>
              <Field label="Method"><Select name="method" defaultValue="Cash">{['Cash', 'Bank', 'Cheque', 'Online'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
            </div>
            <p className="mb-1 text-[11px] text-mutedfg">Saving posts this to Roznamcha automatically (source: kharcha).</p>
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
