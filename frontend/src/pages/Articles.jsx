import { useEffect, useState } from 'react';
import { api, fmtRs } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Pencil, Trash2, Plus } from 'lucide-react';

const BLANK = { name: '', category: '', sizes: '', colors: '', upper_type: '', sole_type: '', cost_price: '', selling_price: '', status: 'active' };

export default function Articles() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/articles').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.cost_price = Number(body.cost_price) || 0;
    body.selling_price = Number(body.selling_price) || 0;
    try {
      if (editing.id) await api.put('/articles/' + editing.id, body);
      else await api.post('/articles', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm(`Move "${row.name}" to the recycle bin?`)) return;
    await api.del('/articles/' + row.id);
    load();
  };

  const filtered = rows.filter((r) =>
    [r.code, r.name, r.category].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Articles" actions={
        <>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-48" />
          <Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} /> Add article</Button>
        </>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card>
        {filtered.length === 0 ? <Empty>No articles yet — create your first shoe model.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Sizes</th><th>Colors</th><th>Upper</th><th>Sole</th><th className="text-right">Cost</th><th className="text-right">Price</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="num font-semibold">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="text-mutedfg">{r.category || '—'}</td>
                    <td className="num">{r.sizes || '—'}</td>
                    <td className="text-mutedfg">{r.colors || '—'}</td>
                    <td className="text-mutedfg">{r.upper_type || '—'}</td>
                    <td className="text-mutedfg">{r.sole_type || '—'}</td>
                    <td className="num text-right">{fmtRs(r.cost_price)}</td>
                    <td className="num text-right font-semibold">{fmtRs(r.selling_price)}</td>
                    <td><Badge tone={r.status === 'active' ? 'active' : 'inactive'}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      <IconButton onClick={() => setEditing(r)}><Pencil size={14} /></IconButton>
                      <IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Dialog title={editing.id ? `Edit ${editing.code}` : 'New article'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" className="col-span-2">
                <Input name="name" defaultValue={editing.name} required autoFocus />
              </Field>
              <Field label="Category"><Select name="category" defaultValue={editing.category}>
                <option value="">—</option>
                {['hiking', 'sports', 'formal', 'casual', 'kids', 'safety'].map((c) => <option key={c}>{c}</option>)}
              </Select></Field>
              <Field label="Status"><Select name="status" defaultValue={editing.status}>
                <option value="active">active</option>
                <option value="discontinued">discontinued</option>
              </Select></Field>
              <Field label="Sizes"><Input name="sizes" defaultValue={editing.sizes} placeholder="40-45" /></Field>
              <Field label="Colors"><Input name="colors" defaultValue={editing.colors} placeholder="Brown / Black" /></Field>
              <Field label="Upper type"><Input name="upper_type" defaultValue={editing.upper_type} placeholder="full-grain" /></Field>
              <Field label="Sole type"><Input name="sole_type" defaultValue={editing.sole_type} placeholder="rubber" /></Field>
              <Field label="Cost price (Rs)"><Input name="cost_price" type="number" step="any" min="0" defaultValue={editing.cost_price} /></Field>
              <Field label="Selling price (Rs)"><Input name="selling_price" type="number" step="any" min="0" defaultValue={editing.selling_price} /></Field>
            </div>
            {!editing.id && <p className="-mt-1 mb-2 text-[11px] text-mutedfg">Article code is generated automatically.</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
