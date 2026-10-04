import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function Purchase() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cats, setCats] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/purchases').then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/suppliers').then(setSuppliers).catch(() => {});
    api.get('/raw-categories').then(setCats).catch(() => {});
  }, []);

  const open = () => setForm({
    supplier_id: suppliers[0]?.id, item: '', category_slug: 'uppers', pack_type: 'bag',
    pairs_per_pack: 12, quantity: '', unit_price: '', date: today(),
  });

  const totalPairs = (Number(form?.quantity) || 0) * (Number(form?.pairs_per_pack) || 0);
  const amount = (Number(form?.quantity) || 0) * (Number(form?.unit_price) || 0);

  const create = async (e) => {
    e.preventDefault();
    const body = { ...Object.fromEntries(new FormData(e.target).entries()) };
    body.supplier_id = Number(body.supplier_id);
    ['pairs_per_pack', 'quantity', 'unit_price'].forEach((k) => { body[k] = Number(body[k]) || 0; });
    try {
      await api.post('/purchases', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this purchase to the recycle bin? (The stock it added stays in Raw Stock.)')) return;
    await api.del('/purchases/' + row.id);
    load();
  };

  return (
    <div>
      <PageHeader title="Purchase" actions={<Button onClick={open}><Plus size={15} /> New purchase</Button>} />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card>
        {rows.length === 0 ? <Empty>No purchases yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Supplier</th><th>Item</th><th>Category</th><th className="text-right">Qty</th><th className="text-right">Pairs/pack</th><th className="text-right">Total pairs</th><th className="text-right">Unit price</th><th className="text-right">Amount</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="font-semibold">{r.supplier_name}</td>
                    <td>{r.item}</td>
                    <td><Badge tone="copper">{r.category_slug}</Badge></td>
                    <td className="num text-right">{fmtNum(r.quantity)}</td>
                    <td className="num text-right">{fmtNum(r.pairs_per_pack)}</td>
                    <td className="num text-right font-bold">{fmtNum(r.total_pairs)}</td>
                    <td className="num text-right">{fmtRs(r.unit_price)}</td>
                    <td className="num text-right font-bold">{fmtRs(r.amount)}</td>
                    <td><IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && form && (
        <Dialog title="New purchase" onClose={() => setCreating(false)} wide>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-x-3 md:grid-cols-3">
              <Field label="Supplier *" className="col-span-2">
                <Select name="supplier_id" defaultValue={form.supplier_id} required>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={form.date} /></Field>
              <Field label="Item *" className="col-span-2"><Input name="item" defaultValue={form.item} required autoFocus placeholder="Full-grain upper — HSF-001" /></Field>
              <Field label="Category">
                <Select name="category_slug" defaultValue={form.category_slug}>
                  {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Pack type"><Input name="pack_type" defaultValue={form.pack_type} /></Field>
              <Field label="Pairs per pack"><Input name="pairs_per_pack" type="number" step="any" min="0" value={form.pairs_per_pack}
                onChange={(e) => setForm({ ...form, pairs_per_pack: e.target.value })} /></Field>
              <Field label="Quantity *"><Input name="quantity" type="number" step="any" min="0" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></Field>
              <Field label="Unit price (Rs)"><Input name="unit_price" type="number" step="any" min="0" value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-center text-[12px]">
              <div><div className="microlabel">Total pairs (auto)</div><div className="num font-bold">{fmtNum(totalPairs)}</div></div>
              <div><div className="microlabel">Amount (auto)</div><div className="num font-bold">{fmtRs(amount)}</div></div>
            </div>
            <p className="mt-2 text-[11px] text-mutedfg">Saving adds this to Raw Stock and increases the supplier payable (kata).</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit">Save purchase</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
