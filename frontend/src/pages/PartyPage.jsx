import { useEffect, useState } from 'react';
import { api, fmtRs, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Textarea, Select, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Pencil, Trash2, Plus, BookOpenText } from 'lucide-react';

// Shared by Customers and Suppliers
export default function PartyPage({ kind, title }) {
  const base = kind === 'customers' ? '/customers' : '/suppliers';
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(base).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.opening_balance = Number(body.opening_balance) || 0;
    try {
      if (editing.id) await api.put(base + '/' + editing.id, body);
      else await api.post(base, body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm(`Move "${row.name}" to the recycle bin?`)) return;
    await api.del(base + '/' + row.id);
    load();
  };

  const showLedger = async (row) => {
    setLedger({ loading: true, party: row });
    const data = await api.get(`${base}/${row.id}/ledger`);
    setLedger({ ...data, loading: false });
  };

  const filtered = rows.filter((r) =>
    [r.name, r.phone, r.city].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title={title} actions={
        <>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-48" />
          <Button onClick={() => setEditing({ name: '', phone: '', address: '', city: '', product_details: '', opening_balance: '', status: 'active' })}>
            <Plus size={15} /> Add {kind === 'customers' ? 'customer' : 'supplier'}
          </Button>
        </>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card>
        {filtered.length === 0 ? <Empty>Nothing here yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Products</th><th className="text-right">Opening</th><th className="text-right">{kind === 'customers' ? 'Receivable (kata)' : 'Payable (kata)'}</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.name}</td>
                    <td className="num">{r.phone || '—'}</td>
                    <td className="text-mutedfg">{r.city || '—'}</td>
                    <td className="text-mutedfg">{r.product_details || '—'}</td>
                    <td className="num text-right">{fmtRs(r.opening_balance)}</td>
                    <td className="num text-right font-bold">{fmtRs(r.balance)}</td>
                    <td><Badge tone={r.status === 'active' ? 'active' : 'inactive'}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      <IconButton onClick={() => showLedger(r)} title="Ledger"><BookOpenText size={14} /></IconButton>
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
        <Dialog title={editing.id ? `Edit ${editing.name}` : 'New entry'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" className="col-span-2"><Input name="name" defaultValue={editing.name} required autoFocus /></Field>
              <Field label="Phone"><Input name="phone" defaultValue={editing.phone} /></Field>
              <Field label="City"><Input name="city" defaultValue={editing.city} /></Field>
              <Field label="Address" className="col-span-2"><Input name="address" defaultValue={editing.address} /></Field>
              <Field label="Product details" className="col-span-2"><Textarea name="product_details" defaultValue={editing.product_details} /></Field>
              <Field label="Opening balance (Rs)"><Input name="opening_balance" type="number" step="any" defaultValue={editing.opening_balance} /></Field>
              <Field label="Status"><Select name="status" defaultValue={editing.status}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Select></Field>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}

      {ledger && (
        <Dialog title={`Ledger — ${ledger.party?.name}`} onClose={() => setLedger(null)} wide>
          <div className="p-5">
            {ledger.loading ? <Empty>Loading…</Empty> : (
              <>
                <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted p-2"><div className="microlabel">Opening</div><div className="num font-bold">{fmtRs(ledger.opening_balance)}</div></div>
                  <div className="rounded-lg bg-muted p-2"><div className="microlabel">Balance</div><div className="num font-bold">{fmtRs(ledger.balance)}</div></div>
                  <div className="rounded-lg bg-muted p-2"><div className="microlabel">Entries</div><div className="num font-bold">{ledger.lines.length}</div></div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-borderc">
                  <table className="tbl">
                    <thead><tr><th>Date</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
                    <tbody>
                      <tr><td colSpan={5} className="text-[11px] text-mutedfg italic">Opening balance: {fmtRs(ledger.opening_balance)}</td></tr>
                      {ledger.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="num text-mutedfg">{l.date}</td>
                          <td>{l.description}{l.ref ? <span className="text-mutedfg"> · {l.ref}</span> : ''}</td>
                          <td className="num text-right">{l.debit ? fmtRs(l.debit) : '—'}</td>
                          <td className="num text-right">{l.credit ? fmtRs(l.credit) : '—'}</td>
                          <td className="num text-right font-bold">{fmtRs(l.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
