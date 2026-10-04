import { useEffect, useState } from 'react';
import { api, fmtNum, today } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton, StatCard } from '../components/ui';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import { ClickableRow, rowAction, RecordDialog } from '../components/RecordDialog';

export default function ReadyShoes() {
  const [data, setData] = useState(null);
  const [articles, setArticles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/ready-shoes').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); api.get('/articles').then(setArticles).catch(() => {}); }, []);

  const add = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.article_id = Number(body.article_id);
    body.pairs_per_carton = Number(body.pairs_per_carton) || 0;
    body.cartons = Number(body.cartons) || 0;
    try {
      await api.post('/ready-shoes', body);
      setAdding(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Remove this manual stock entry?')) return;
    await api.del('/ready-shoes/' + row.id);
    load();
  };

  const movements = data?.movements || [];
  const stock = data?.stock || [];
  const cartonsAdded = movements.reduce((s, m) => s + Math.max(Number(m.cartons) || 0, 0), 0);
  const pairsAdded = movements.reduce((s, m) => s + Math.max(Number(m.pairs) || 0, 0), 0);
  const available = stock.reduce((s, r) => s + (Number(r.pairs) || 0), 0);

  const batchLabel = (m) => {
    const src = m.source === 'production' ? 'Production' : m.source === 'sale' ? 'Invoice' : 'Manual';
    return `${src} ${m.date}`;
  };

  return (
    <div>
      <PageHeader
        label="Finished goods"
        title="Ready Shoes"
        description="Every batch of finished cartons. Production adds batches here automatically and invoices deduct from them."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('ready-shoes.csv',
              ['Date', 'Article', 'Name', 'Carton', 'Cartons', 'Pairs', 'Source'],
              movements.map((m) => [m.date, m.article_code, m.article_name, m.carton_type, m.cartons, m.pairs, m.source]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={() => setAdding(true)}><Plus size={15} /> Add cartons</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Batches" value={fmtNum(movements.length)} accent="copper" />
        <StatCard label="Cartons added" value={fmtNum(cartonsAdded)} accent="teal" />
        <StatCard label="Pairs added" value={`${fmtNum(pairsAdded)} prs`} accent="ink" />
        <StatCard label="Available now" value={`${fmtNum(available)} prs`} sub="Added batches minus invoiced pairs" accent="copper" />
      </div>

      <Card title="Carton batches">
        {movements.length === 0 ? (
          <Empty title="No carton batches yet">Production and manual entries land here, and invoices deduct from them.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Article</th><th>Name</th><th>Carton</th><th className="text-right">Cartons</th><th className="text-right">Pairs</th><th>Batch</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {movements.map((m) => (
                  <ClickableRow key={m.id} onOpen={() => setDetail({
                    title: `Batch — ${m.article_code}`,
                    subtitle: `${batchLabel(m)}`,
                    fields: [
                      ['Article', `${m.article_code} — ${m.article_name}`],
                      ['Carton type', m.carton_type],
                      ['Cartons', fmtNum(m.cartons)],
                      ['Pairs', fmtNum(m.pairs)],
                      ['Source', m.source === 'production' ? 'Production' : m.source === 'sale' ? 'Invoice' : 'Manual'],
                      ['Date', m.date],
                    ],
                  })}>
                    <td className="num font-semibold">{m.article_code}</td>
                    <td>{m.article_name}</td>
                    <td className="text-mutedfg">{m.carton_type || '—'}</td>
                    <td className="num text-right font-semibold">{fmtNum(m.cartons)}</td>
                    <td className={`num text-right font-bold ${m.pairs < 0 ? 'text-red-600' : ''}`}>{fmtNum(m.pairs)}</td>
                    <td><Badge tone={m.source}>{batchLabel(m)}</Badge></td>
                    <td className="num text-mutedfg">{m.date}</td>
                    <td>{m.source === 'manual' && <IconButton onClick={rowAction(() => remove(m))}><Trash2 size={14} /></IconButton>}</td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Stock balance by article" className="mt-4">
        {stock.length === 0 ? <Empty>No articles yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Article</th><th>Name</th><th className="text-right">Cartons</th><th className="text-right">Pairs ready</th></tr></thead>
              <tbody>
                {stock.map((r) => (
                  <ClickableRow key={r.article_id} onOpen={() => setDetail({
                    title: `Ready stock — ${r.code}`,
                    subtitle: r.name,
                    fields: [
                      ['Article', r.code], ['Name', r.name],
                      ['Cartons', fmtNum(r.cartons)], ['Pairs ready', fmtNum(r.pairs)],
                    ],
                  })}>
                    <td className="num font-semibold">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="num text-right">{fmtNum(r.cartons)}</td>
                    <td className="num text-right font-bold">{fmtNum(r.pairs)}</td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && (
        <Dialog title="Add ready stock (manual)" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="p-5">
            <Field label="Article *">
              <Select name="article_id" required defaultValue={articles[0]?.id}>
                {articles.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Carton type"><Input name="carton_type" placeholder="Export 24" /></Field>
              <Field label="Pairs per carton"><Input name="pairs_per_carton" type="number" min="0" defaultValue={24} /></Field>
              <Field label="Cartons"><Input name="cartons" type="number" step="any" min="0" required /></Field>
            </div>
            <Field label="Date"><Input name="date" type="date" defaultValue={today()} /></Field>
            <p className="mb-1 text-[11px] text-mutedfg">Pairs are computed automatically (cartons × pairs per carton).</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit">Add stock</Button>
            </div>
          </form>
        </Dialog>
      )}

      {detail && <RecordDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
