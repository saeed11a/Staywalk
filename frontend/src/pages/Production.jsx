import { useEffect, useState } from 'react';
import { api, fmtNum, today, daysAgo } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Empty, IconButton, StatCard, DateRange } from '../components/ui';
import { Plus, Trash2, Download, Printer } from 'lucide-react';

export default function Production() {
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [settings, setSettings] = useState(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/production?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/articles').then(setArticles);
    api.get('/settings').then(setSettings);
  }, [from, to]);

  const open = () => setForm({
    article_id: articles[0]?.id, date: today(), line: 'Line A', shift: 'Morning', operator: '',
    input_bags: '', pairs_per_bag: settings?.pairs_per_bag || 12,
    carton_type: '', pairs_per_carton: settings?.pairs_per_carton || 24, output_cartons: '',
  });

  const uppersUsed = (Number(form?.input_bags) || 0) * (Number(form?.pairs_per_bag) || 0);
  const outputPairs = (Number(form?.output_cartons) || 0) * (Number(form?.pairs_per_carton) || 0);

  const create = async (e) => {
    e.preventDefault();
    const body = { ...Object.fromEntries(new FormData(e.target).entries()) };
    body.article_id = Number(body.article_id);
    ['input_bags', 'pairs_per_bag', 'pairs_per_carton', 'output_cartons'].forEach((k) => { body[k] = Number(body[k]) || 0; });
    try {
      await api.post('/production', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this production entry to the recycle bin? Stock it produced stays in Ready Shoes.')) return;
    await api.del('/production/' + row.id);
    load();
  };

  const bags = rows.reduce((s, r) => s + (Number(r.input_bags) || 0), 0);
  const uppersIssued = rows.reduce((s, r) => s + (Number(r.uppers_used) || 0), 0);
  const cartons = rows.reduce((s, r) => s + (Number(r.output_cartons) || 0), 0);
  const produced = rows.reduce((s, r) => s + (Number(r.output_pairs) || 0), 0);
  const yieldPct = uppersIssued ? Math.round((produced / uppersIssued) * 100) : 0;

  return (
    <div>
      <PageHeader
        label="Shop floor"
        title="Production"
        description="Issue uppers for an article, receive the ready cartons — uppers stock falls and Ready Shoes rises automatically."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('production.csv',
              ['Date', 'Article', 'Bags', 'Pairs/bag', 'Uppers used', 'Carton size', 'Cartons', 'Pairs produced', 'Line', 'Shift', 'Operator'],
              rows.map((r) => [r.date, r.article_code, r.input_bags, r.pairs_per_bag, r.uppers_used, r.carton_type, r.output_cartons, r.output_pairs, r.line, r.shift, r.operator]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={open}><Plus size={15} /> New production</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Production runs" value={fmtNum(rows.length)} accent="copper" />
        <StatCard label="Uppers issued" value={`${fmtNum(uppersIssued)} prs`} sub={`${fmtNum(bags)} bag(s)`} accent="teal" />
        <StatCard label="Pairs produced" value={`${fmtNum(produced)} prs`} sub={`${fmtNum(cartons)} carton(s)`} accent="ink" />
        <StatCard label="Yield" value={`${yieldPct}%`} sub="Produced vs uppers issued" accent="copper" />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title="Production entries">
        {rows.length === 0 ? <Empty>No production entries in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Article</th><th>Date</th><th className="text-right">Uppers bags</th><th className="text-right">Uppers used</th><th>Carton size</th><th className="text-right">Cartons</th><th className="text-right">Pairs produced</th><th>Line / shift</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="num font-semibold">{r.article_code}</div>
                      <div className="text-[11px] text-mutedfg">{r.article_name}</div>
                    </td>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td className="num text-right">{fmtNum(r.input_bags)}</td>
                    <td className="num text-right font-semibold text-red-600">−{fmtNum(r.uppers_used)}</td>
                    <td className="text-mutedfg">{r.carton_type || '—'}</td>
                    <td className="num text-right">{fmtNum(r.output_cartons)}</td>
                    <td className="num text-right font-bold text-emerald-700">+{fmtNum(r.output_pairs)}</td>
                    <td className="text-mutedfg">{r.line || '—'} · {r.shift || '—'}</td>
                    <td><IconButton onClick={() => remove(r)}><Trash2 size={14} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && form && (
        <Dialog title="New production entry" onClose={() => setCreating(false)} wide>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-x-3 md:grid-cols-3">
              <Field label="Article *" className="col-span-2">
                <Select name="article_id" defaultValue={form.article_id} required>
                  {articles.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </Select>
              </Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={form.date} /></Field>
              <Field label="Line"><Input name="line" defaultValue={form.line} /></Field>
              <Field label="Shift"><Select name="shift" defaultValue={form.shift}>
                {['Morning', 'Evening', 'Night'].map((s) => <option key={s}>{s}</option>)}
              </Select></Field>
              <Field label="Operator"><Input name="operator" defaultValue={form.operator} /></Field>
              <Field label="Input bags (uppers)"><Input name="input_bags" type="number" step="any" min="0" value={form.input_bags}
                onChange={(e) => setForm({ ...form, input_bags: e.target.value })} required /></Field>
              <Field label="Pairs per bag"><Input name="pairs_per_bag" type="number" step="any" min="0" value={form.pairs_per_bag}
                onChange={(e) => setForm({ ...form, pairs_per_bag: e.target.value })} /></Field>
              <Field label="Carton type"><Input name="carton_type" defaultValue={form.carton_type} placeholder="Export 24" /></Field>
              <Field label="Pairs per carton"><Input name="pairs_per_carton" type="number" step="any" min="0" value={form.pairs_per_carton}
                onChange={(e) => setForm({ ...form, pairs_per_carton: e.target.value })} /></Field>
              <Field label="Output cartons"><Input name="output_cartons" type="number" step="any" min="0" value={form.output_cartons}
                onChange={(e) => setForm({ ...form, output_cartons: e.target.value })} required /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-center text-[12px]">
              <div><div className="microlabel">Uppers used (auto)</div><div className="num font-bold text-red-600">−{fmtNum(uppersUsed)} pairs</div></div>
              <div><div className="microlabel">Output pairs (auto)</div><div className="num font-bold text-emerald-700">+{fmtNum(outputPairs)} pairs</div></div>
            </div>
            <p className="mt-2 text-[11px] text-mutedfg">Saving deducts {fmtNum(uppersUsed)} uppers pairs from Raw Stock and adds {fmtNum(outputPairs)} pairs to Ready Shoes.</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit">Save entry</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
