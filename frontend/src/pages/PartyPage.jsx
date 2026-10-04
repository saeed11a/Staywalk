import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Textarea, Select, PageHeader, Badge, Empty, IconButton, StatCard } from '../components/ui';
import { Pencil, Trash2, Plus, BookOpenText, Phone, Wallet } from 'lucide-react';

// Shared by Customers and Suppliers — kata buttons open the party ledger
export default function PartyPage({ kind, title }) {
  const base = kind === 'customers' ? '/customers' : '/suppliers';
  const isCustomer = kind === 'customers';
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

  const owed = rows.reduce((s, r) => s + Math.max(Number(r.balance) || 0, 0), 0);
  const advances = rows.reduce((s, r) => s + Math.max(-(Number(r.balance) || 0), 0), 0);
  const docs = rows.reduce((s, r) => s + (Number(r.doc_count) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Kata"
        title={`${title} (${rows.length})`}
        description={isCustomer
          ? 'Pick a customer button to open his kata — details, invoices, receipts and running balance.'
          : 'Each supplier button opens his kata: product details, purchases, payments and remaining balance.'}
        actions={
          <>
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-44" />
            <Button onClick={() => setEditing({ name: '', phone: '', address: '', city: '', product_details: '', opening_balance: '', status: 'active' })}>
              <Plus size={15} /> New {isCustomer ? 'customer' : 'supplier'}
            </Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={isCustomer ? 'Customers' : 'Suppliers'} value={fmtNum(rows.length)} accent="copper" />
        <StatCard label={isCustomer ? 'Receivable' : 'Payable'} value={fmtRs(owed)}
          sub={isCustomer ? 'Owed to the factory' : 'Owed by the factory'} accent="teal" />
        <StatCard label={isCustomer ? 'Advances' : 'Advances paid'} value={fmtRs(advances)}
          sub={isCustomer ? 'Paid in advance' : 'Paid ahead of supply'} accent="ink" />
        <StatCard label={isCustomer ? 'Invoices' : 'Purchases'} value={fmtNum(docs)} accent="copper" />
      </div>

      <Card title="Kata buttons">
        {filtered.length === 0 ? (
          <Empty title={`No ${isCustomer ? 'customers' : 'suppliers'} yet`}>
            Add one to start recording {isCustomer ? 'invoices and receipts' : 'purchases and payments'}.
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => {
              const bal = Number(r.balance) || 0;
              const tone = bal > 0 ? 'unpaid' : 'active';
              const toneLabel = bal > 0 ? 'Balance due' : 'Clear';
              return (
                <div key={r.id} className="rounded-xl border border-borderc p-3.5 transition-colors hover:border-copper">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => showLedger(r)} className="text-left">
                      <div className="font-heading text-[14px] font-bold hover:underline">{r.name}</div>
                      <div className="mt-1.5"><Badge tone={tone}>{toneLabel}</Badge></div>
                    </button>
                    <div className="flex shrink-0">
                      <IconButton onClick={() => setEditing(r)} title="Edit"><Pencil size={13} /></IconButton>
                      <IconButton onClick={() => remove(r)} title="Delete"><Trash2 size={13} /></IconButton>
                    </div>
                  </div>
                  <button onClick={() => showLedger(r)} className="mt-2 block w-full text-left">
                    <div className={`num text-[17px] font-extrabold ${bal > 0 ? 'text-red-600' : ''}`}>{fmtRs(Math.abs(bal))}</div>
                    {r.phone && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-mutedfg"><Phone size={11} /> {r.phone}</div>
                    )}
                    <div className="mt-0.5 text-[11px] text-mutedfg">{fmtNum(r.doc_count)} {isCustomer ? 'invoice(s)' : 'purchase(s)'}</div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-borderc bg-card p-4">
        <Wallet size={18} className="shrink-0 text-copper" />
        <div>
          <div className="font-heading text-[13px] font-bold">Select a {isCustomer ? 'customer' : 'supplier'} to open the kata</div>
          <div className="text-[11px] text-mutedfg">
            The kata shows every {isCustomer ? 'invoice' : 'purchase'}, payment and the running balance.
          </div>
        </div>
      </div>

      {editing && (
        <Dialog title={editing.id ? `Edit ${editing.name}` : `New ${isCustomer ? 'customer' : 'supplier'}`} onClose={() => setEditing(null)}>
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
