import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { api, fmtRs, fmtNum, today } from '../lib/api';
import { Button, Card, Field, Input, Select, Textarea, PageHeader } from '../components/ui';
import InvoiceSheet from '../components/InvoiceSheet';

export default function NewInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    customer_id: '', date: today(), lines: [], discount: '', received: '', payment_method: 'cash', notes: '',
  });

  useEffect(() => {
    api.get('/customers').then((cs) => {
      setCustomers(cs);
      setForm((f) => ({ ...f, customer_id: f.customer_id || cs[0]?.id }));
    });
    api.get('/articles').then((as) => {
      setArticles(as.filter((a) => a.status === 'active'));
      setForm((f) => ({
        ...f,
        lines: f.lines.length ? f.lines : [emptyLine(as.find((a) => a.status === 'active'))],
      }));
    });
    api.get('/settings').then(setSettings);
  }, []);

  const emptyLine = (article) => ({
    article_id: article?.id || '',
    carton_type: 'Export ' + (settings?.pairs_per_carton || 24),
    pairs_per_carton: settings?.pairs_per_carton || 24,
    cartons: '',
    rate: article?.selling_price || '',
  });

  const setLine = (i, field, value) => {
    setForm((f) => {
      const lines = [...f.lines];
      const line = { ...lines[i], [field]: value };
      if (field === 'article_id') {
        const a = articles.find((x) => x.id === Number(value));
        if (a) line.rate = a.selling_price;
      }
      lines[i] = line;
      return { ...f, lines };
    });
  };

  const linePairs = (l) => (Number(l.cartons) || 0) * (Number(l.pairs_per_carton) || 0);
  const lineAmount = (l) => linePairs(l) * (Number(l.rate) || 0);
  const subtotal = form.lines.reduce((s, l) => s + lineAmount(l), 0);
  const discount = Number(form.discount) || 0;
  const total = Math.max(subtotal - discount, 0);
  const received = Math.min(Number(form.received) || 0, total);
  const totalCartons = form.lines.reduce((s, l) => s + (Number(l.cartons) || 0), 0);
  const totalPairs = form.lines.reduce((s, l) => s + linePairs(l), 0);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        customer_id: Number(form.customer_id),
        date: form.date,
        lines: form.lines.map((l) => ({
          article_id: Number(l.article_id),
          carton_type: l.carton_type,
          pairs_per_carton: Number(l.pairs_per_carton) || 0,
          cartons: Number(l.cartons) || 0,
          rate: Number(l.rate) || 0,
        })),
        discount, received, payment_method: form.payment_method, notes: form.notes,
      };
      const r = await api.post('/invoices', payload);
      navigate('/invoices');
      return r;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const previewInvoice = {
    invoice_no: '(new)',
    customer_name: customers.find((c) => c.id === Number(form.customer_id))?.name || '—',
    customer_address: customers.find((c) => c.id === Number(form.customer_id))?.address,
    customer_city: customers.find((c) => c.id === Number(form.customer_id))?.city,
    customer_phone: customers.find((c) => c.id === Number(form.customer_id))?.phone,
    date: form.date,
    lines: form.lines.map((l) => ({
      article_code: articles.find((a) => a.id === Number(l.article_id))?.code || '',
      article_name: articles.find((a) => a.id === Number(l.article_id))?.name || '',
      carton_type: l.carton_type, cartons: Number(l.cartons) || 0,
      pairs: linePairs(l), rate: Number(l.rate) || 0, amount: lineAmount(l),
    })),
    subtotal, discount, total, received, balance: total - received,
    total_cartons: totalCartons, total_pairs: totalPairs,
    payment_method: form.payment_method, notes: form.notes,
  };

  return (
    <div>
      <PageHeader title="New Invoice" actions={
        <Button variant="secondary" onClick={() => navigate('/invoices')}><X size={15} /> Cancel</Button>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          <Card title="Header">
            <div className="grid grid-cols-2 gap-x-3 p-4">
              <Field label="Customer *">
                <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Payment method">
                <Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="account">Account (bank transfer)</option>
                </Select>
              </Field>
              <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></Field>
            </div>
          </Card>

          <Card title="Items" actions={
            <Button variant="secondary" size="sm"
              onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine(articles[0])] })}>
              <Plus size={13} /> Add line
            </Button>
          }>
            <div className="space-y-2 p-4">
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-borderc p-2">
                  <div className="col-span-12 sm:col-span-5">
                    <Select value={l.article_id} onChange={(e) => setLine(i, 'article_id', e.target.value)}>
                      {articles.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-1"><Input value={l.carton_type} onChange={(e) => setLine(i, 'carton_type', e.target.value)} placeholder="Carton" /></div>
                  <div className="col-span-4 sm:col-span-2"><Input type="number" min="0" value={l.pairs_per_carton} onChange={(e) => setLine(i, 'pairs_per_carton', e.target.value)} placeholder="Pairs/ctn" /></div>
                  <div className="col-span-4 sm:col-span-1"><Input type="number" min="0" value={l.cartons} onChange={(e) => setLine(i, 'cartons', e.target.value)} placeholder="Ctns" /></div>
                  <div className="col-span-6 sm:col-span-2"><Input type="number" min="0" value={l.rate} onChange={(e) => setLine(i, 'rate', e.target.value)} placeholder="Rate" /></div>
                  <div className="col-span-6 sm:col-span-1 flex items-center">
                    <span className="num w-full text-right text-[12px] font-semibold">{fmtRs(lineAmount(l))}</span>
                  </div>
                  <div className="col-span-12 flex items-center justify-between">
                    <span className="num text-[11px] text-mutedfg">{fmtNum(linePairs(l))} pairs</span>
                    <button type="button" className="text-mutedfg hover:text-red-600" onClick={() => setForm({ ...form, lines: form.lines.filter((_, x) => x !== i) })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Totals">
            <div className="grid grid-cols-2 gap-x-3 p-4">
              <Field label="Discount (Rs)"><Input type="number" min="0" step="any" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
              <Field label="Received (Rs)"><Input type="number" min="0" step="any" value={form.received} onChange={(e) => setForm({ ...form, received: e.target.value })} /></Field>
              <div className="col-span-2 space-y-1 rounded-xl bg-muted p-3 text-sm">
                <div className="flex justify-between"><span className="text-mutedfg">Subtotal</span><span className="num">{fmtRs(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-mutedfg">Discount</span><span className="num">− {fmtRs(discount)}</span></div>
                <div className="flex justify-between border-t border-borderc pt-1"><span className="font-bold">Grand total</span><span className="num font-bold">{fmtRs(total)}</span></div>
                <div className="flex justify-between"><span className="text-mutedfg">Received</span><span className="num">{fmtRs(received)}</span></div>
                <div className="flex justify-between"><span className="font-bold">Balance</span><span className="num font-bold">{fmtRs(total - received)}</span></div>
                <div className="flex justify-between text-[11px] text-mutedfg"><span>{fmtNum(totalCartons)} cartons</span><span>{fmtNum(totalPairs)} pairs</span></div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy} size="lg"><Save size={15} /> {busy ? 'Saving…' : 'Save invoice'}</Button>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="microlabel mb-2">Live preview</div>
          {settings && <InvoiceSheet settings={settings} invoice={previewInvoice} compact />}
          <p className="mt-2 text-center text-[11px] text-mutedfg">The print sheet keeps exact colors on paper — Cash prints without the bank box, Account prints it.</p>
        </div>
      </div>
    </div>
  );
}
