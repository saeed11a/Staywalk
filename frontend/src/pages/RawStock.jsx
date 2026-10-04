import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton, StatCard } from '../components/ui';
import { Pencil, Trash2, Plus, Layers, FlaskConical, Package, Hexagon, Boxes, Download, Printer } from 'lucide-react';
import { downloadCSV } from '../lib/csv';

const ICONS = { uppers: Layers, chemicals: FlaskConical, 'sole-sheets': Hexagon, laces: Package };
const BUILT_IN = ['uppers', 'chemicals', 'laces', 'sole-sheets'];
const DESCRIPTIONS = {
  uppers: 'Upper stock issued to production, entered in bags',
  chemicals: 'Adhesives, solvents and finishing chemicals',
  'sole-sheets': 'Rubber and TPR sole sheets',
  laces: 'Laces, threads and trims',
};

export default function RawStock() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState(null);
  const [catForm, setCatForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/raw-stock').then(setRows).catch((e) => setError(e.message));
  const loadCats = () => api.get('/raw-categories').then(setCats).catch(() => {});
  useEffect(() => { load(); loadCats(); }, []);

  const category = (slug) => cats.find((c) => c.slug === slug);
  const statsFor = (slug) => {
    const list = rows.filter((r) => r.category_slug === slug);
    return {
      lines: list.length,
      quantity: list.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
      pairs: list.reduce((s, r) => s + (Number(r.total_pairs) || 0), 0),
      value: list.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      usesPairs: !!category(slug)?.uses_pairs,
    };
  };

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const custom = {};
    (category(fd.get('category_slug'))?.fields_json ? JSON.parse(category(fd.get('category_slug')).fields_json) : [])
      .forEach((f) => { const v = fd.get('cf_' + f.key); if (v !== undefined && v !== '') custom[f.key] = v; });
    const body = {
      item: fd.get('item'), category_slug: fd.get('category_slug'), article_code: fd.get('article_code'),
      pack_type: fd.get('pack_type'), pairs_per_pack: Number(fd.get('pairs_per_pack')) || 0,
      quantity: Number(fd.get('quantity')) || 0, unit: fd.get('unit'),
      unit_price: Number(fd.get('unit_price')) || 0, supplier_id: Number(fd.get('supplier_id')) || null,
      date: fd.get('date') || today(), custom,
    };
    try {
      if (editing.id) await api.put('/raw-stock/' + editing.id, body);
      else await api.post('/raw-stock', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    const slug = (fd.get('slug') || name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      await api.post('/raw-categories', {
        name, slug, unit_label: fd.get('unit_label') || 'unit',
        uses_pairs: fd.get('uses_pairs') === 'yes',
      });
      setCatForm(null);
      loadCats();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm(`Move "${row.item}" to the recycle bin?`)) return;
    await api.del('/raw-stock/' + row.id);
    load();
  };

  const customFields = editing ? (category(editing.category_slug)?.fields_json ? JSON.parse(category(editing.category_slug).fields_json) : []) : [];
  const editingCustom = editing?.custom_json ? JSON.parse(editing.custom_json) : {};
  const shown = cat ? rows.filter((r) => r.category_slug === cat) : rows;
  const totalPairs = rows.reduce((s, r) => s + (Number(r.total_pairs) || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        label="Raw material"
        title="Raw Stock"
        description="Each category has its own page. Quantities convert into pairs automatically where the material is packed."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('raw-stock.csv',
              ['Date', 'Item', 'Category', 'Article', 'Pack type', 'Pairs/pack', 'Quantity', 'Unit', 'Total pairs', 'Unit price', 'Amount', 'Supplier'],
              rows.map((r) => [r.date, r.item, r.category_slug, r.article_code, r.pack_type, r.pairs_per_pack, r.quantity, r.unit, r.total_pairs, r.unit_price, r.amount, r.supplier_name]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button variant="secondary" onClick={() => setCatForm({ name: '', slug: '', unit_label: 'unit', uses_pairs: 'no' })}>
              <Plus size={15} /> New category
            </Button>
            <Button onClick={() => setEditing({ item: '', category_slug: cat || 'uppers', article_code: '', pack_type: '', pairs_per_pack: '', quantity: '', unit: '', unit_price: '', supplier_id: '', date: today() })}>
              <Plus size={15} /> Add stock
            </Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Categories" value={fmtNum(cats.length)} accent="copper" />
        <StatCard label="Stock lines" value={fmtNum(rows.length)} accent="teal" />
        <StatCard label="Pairs in stock" value={`${fmtNum(totalPairs)} prs`} accent="ink" />
        <StatCard label="Stock value" value={fmtRs(totalValue)} accent="copper" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => {
          const Icon = ICONS[c.slug] || Boxes;
          const st = statsFor(c.slug);
          return (
            <div key={c.slug} className={`rounded-xl border bg-card p-4 shadow-card transition-colors ${cat === c.slug ? 'border-teal' : 'border-borderc'}`}>
              <div className="flex items-start justify-between gap-2">
                <Icon size={18} className="text-copper" />
                {BUILT_IN.includes(c.slug) && <Badge tone="neutral">Built in</Badge>}
              </div>
              <div className="mt-2 font-heading text-[15px] font-bold">{c.name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-mutedfg">{DESCRIPTIONS[c.slug] || 'Raw material category'}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-borderc pt-2.5">
                <div><div className="microlabel">Lines</div><div className="num font-bold">{fmtNum(st.lines)}</div></div>
                <div><div className="microlabel">Quantity</div><div className="num font-bold">{fmtNum(st.quantity)}</div></div>
                <div>
                  <div className="microlabel">{st.usesPairs ? 'Pairs' : 'Value'}</div>
                  <div className="num font-bold">{st.usesPairs ? fmtNum(st.pairs) : fmtRs(st.value)}</div>
                </div>
              </div>
              <button
                onClick={() => setCat(cat === c.slug ? '' : c.slug)}
                className="mt-3 text-[12px] font-semibold text-copper hover:underline"
              >
                {cat === c.slug ? 'Showing below — show all' : `Open ${c.name} →`}
              </button>
            </div>
          );
        })}
      </div>

      <Card
        title={cat ? category(cat)?.name || cat : 'All categories'}
        actions={
          cat ? (
            <button onClick={() => setCat('')} className="text-[12px] font-semibold text-mutedfg hover:text-fg">Show all categories</button>
          ) : null
        }
      >
        {shown.length === 0 ? <Empty>No raw stock entries yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Item</th><th>Category</th><th>Article</th><th>Pack type</th><th className="text-right">Pairs/pack</th><th className="text-right">Qty</th><th className="text-right">Total pairs</th><th className="text-right">Price</th><th className="text-right">Amount</th><th>Supplier</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.item}</td>
                    <td><Badge tone="copper">{r.category_slug}</Badge></td>
                    <td className="num">{r.article_code || '—'}</td>
                    <td className="text-mutedfg">{r.pack_type || '—'}</td>
                    <td className="num text-right">{fmtNum(r.pairs_per_pack)}</td>
                    <td className="num text-right">{fmtNum(r.quantity)} {r.unit}</td>
                    <td className="num text-right font-bold">{fmtNum(r.total_pairs)}</td>
                    <td className="num text-right">{fmtRs(r.unit_price)}</td>
                    <td className="num text-right font-semibold">{fmtRs(r.amount)}</td>
                    <td className="text-mutedfg">{r.supplier_name || '—'}</td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="whitespace-nowrap">
                      <IconButton onClick={() => setEditing({ ...r, supplier_id: r.supplier_id || '' })}><Pencil size={14} /></IconButton>
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
        <Dialog title={editing.id ? 'Edit stock entry' : 'New stock entry'} onClose={() => setEditing(null)} wide>
          <form onSubmit={save} className="p-5">
            <div className="grid grid-cols-2 gap-x-3 md:grid-cols-3">
              <Field label="Item *" className="col-span-2"><Input name="item" defaultValue={editing.item} required autoFocus /></Field>
              <Field label="Category *">
                <Select name="category_slug" defaultValue={editing.category_slug}>
                  {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Article code"><Input name="article_code" defaultValue={editing.article_code} placeholder="HSF-001" /></Field>
              <Field label="Pack type"><Input name="pack_type" defaultValue={editing.pack_type} placeholder="bag" /></Field>
              <Field label="Pairs per pack"><Input name="pairs_per_pack" type="number" step="any" min="0" defaultValue={editing.pairs_per_pack} placeholder="auto → total pairs" /></Field>
              <Field label="Quantity *"><Input name="quantity" type="number" step="any" min="0" defaultValue={editing.quantity} required /></Field>
              <Field label="Unit"><Input name="unit" defaultValue={editing.unit} placeholder="bags" /></Field>
              <Field label="Unit price (Rs)"><Input name="unit_price" type="number" step="any" min="0" defaultValue={editing.unit_price} /></Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={editing.date?.slice(0, 10) || today()} /></Field>
              <SupplierField editing={editing} />
              {customFields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === 'select'
                    ? <Select name={'cf_' + f.key} defaultValue={editingCustom[f.key] || ''}>
                        <option value="">—</option>
                        {(f.options || []).map((o) => <option key={o}>{o}</option>)}
                      </Select>
                    : <Input name={'cf_' + f.key} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} defaultValue={editingCustom[f.key] || ''} />}
                </Field>
              ))}
            </div>
            <p className="mb-1 text-[11px] text-mutedfg">Total pairs are computed automatically (quantity × pairs per pack) — pairs are never entered by hand.</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}

      {catForm && (
        <Dialog title="New raw category" onClose={() => setCatForm(null)}>
          <form onSubmit={saveCategory} className="p-5">
            <Field label="Name *"><Input name="name" required autoFocus placeholder="Sole sheets" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug"><Input name="slug" placeholder="sole-sheets" /></Field>
              <Field label="Unit label"><Input name="unit_label" defaultValue="unit" placeholder="bag" /></Field>
              <Field label="Counts pairs?">
                <Select name="uses_pairs" defaultValue="no"><option value="no">No — value only</option><option value="yes">Yes — packs convert to pairs</option></Select>
              </Field>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCatForm(null)}>Cancel</Button>
              <Button type="submit">Create category</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function SupplierField({ editing }) {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => { api.get('/suppliers').then(setSuppliers).catch(() => {}); }, []);
  return (
    <Field label="Supplier">
      <Select name="supplier_id" defaultValue={editing.supplier_id || ''}>
        <option value="">—</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </Field>
  );
}
