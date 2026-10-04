import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton, StatCard } from '../components/ui';
import { Pencil, Trash2, Plus, RefreshCw, Download, Printer } from 'lucide-react';
import { ClickableRow, rowAction } from '../components/RecordDialog';

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

  const uppersAvailable = rows.reduce((s, r) => s + r.uppers_pairs, 0);
  const readyPairs = rows.reduce((s, r) => s + r.ready_pairs, 0);
  const pairsSold = rows.reduce((s, r) => s + r.sold, 0);
  const salesValue = rows.reduce((s, r) => s + r.sales_value, 0);

  return (
    <div>
      <PageHeader
        label="Master data"
        title="Articles"
        description="Article numbers are created automatically, with stock, production and sales quantities kept in sync as the factory works."
        actions={
          <>
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-40" />
            <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /> Sync now</Button>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('articles.csv',
              ['Code', 'Name', 'Category', 'Uppers bags', 'Uppers pairs', 'Ready pairs', 'Sold', 'Sales value', 'Status'],
              filtered.map((r) => [r.code, r.name, r.category, r.uppers_bags, r.uppers_pairs, r.ready_pairs, r.sold, r.sales_value, r.status]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} /> New article</Button>
          </>
        }
      />

      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Articles" value={fmtNum(rows.length)} accent="copper" />
        <StatCard label="Uppers available" value={`${fmtNum(uppersAvailable)} prs`} accent="teal" />
        <StatCard label="Ready pairs" value={`${fmtNum(readyPairs)} prs`} accent="ink" />
        <StatCard label="Pairs sold" value={`${fmtNum(pairsSold)} prs`} sub={fmtRs(salesValue)} accent="copper" />
      </div>

      <Card title="All articles">
        {filtered.length === 0 ? (
          <Empty title="No articles yet">Create your first shoe model to start stock, production and sales.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Article no.</th><th>Category</th><th className="text-right">Uppers bags</th>
                  <th className="text-right">Uppers pairs</th><th className="text-right">Ready pairs</th>
                  <th className="text-right">Sold</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <ClickableRow key={r.id} onOpen={() => setEditing(r)}>
                    <td>
                      <div className="num font-semibold">{r.code}</div>
                      <div className="text-[11px] text-mutedfg">{r.name}</div>
                    </td>
                    <td className="text-mutedfg">{r.category || '—'}</td>
                    <td className="num text-right">{r.uppers_bags ? fmtNum(r.uppers_bags) : '—'}</td>
                    <td className="num text-right">{r.uppers_pairs ? fmtNum(r.uppers_pairs) : '—'}</td>
                    <td className="num text-right">{r.ready_pairs ? fmtNum(r.ready_pairs) : '—'}</td>
                    <td className="num text-right">{r.sold ? fmtNum(r.sold) : '—'}</td>
                    <td><Badge tone={r.status === 'active' ? 'active' : 'inactive'}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      <IconButton onClick={rowAction(() => setEditing(r))}><Pencil size={14} /></IconButton>
                      <IconButton onClick={rowAction(() => remove(r))}><Trash2 size={14} /></IconButton>
                    </td>
                  </ClickableRow>
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
