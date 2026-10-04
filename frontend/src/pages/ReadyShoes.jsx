import { useEffect, useState } from 'react';
import { api, fmtNum, today } from '../lib/api';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Badge, Empty, IconButton } from '../components/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function ReadyShoes() {
  const [data, setData] = useState(null);
  const [articles, setArticles] = useState([]);
  const [adding, setAdding] = useState(false);
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

  return (
    <div>
      <PageHeader title="Ready Shoes" actions={
        <Button onClick={() => setAdding(true)}><Plus size={15} /> Add stock</Button>
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <Card title="Stock balance by article">
        {!data || data.stock.length === 0 ? <Empty>No articles yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Article</th><th className="text-right">Cartons</th><th className="text-right">Pairs ready</th></tr></thead>
              <tbody>
                {data.stock.map((r) => (
                  <tr key={r.article_id}>
                    <td className="num font-semibold">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="num text-right">{fmtNum(r.cartons)}</td>
                    <td className="num text-right font-bold">{fmtNum(r.pairs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Movements" className="mt-4">
        {!data || data.movements.length === 0 ? <Empty>No stock movements yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Article</th><th>Carton type</th><th className="text-right">Cartons</th><th className="text-right">Pairs</th><th>Source</th><th></th></tr></thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id}>
                    <td className="num text-mutedfg">{m.date}</td>
                    <td>{m.article_code} {m.article_name}</td>
                    <td className="text-mutedfg">{m.carton_type || '—'}</td>
                    <td className="num text-right">{fmtNum(m.cartons)}</td>
                    <td className={`num text-right font-bold ${m.pairs < 0 ? 'text-red-600' : ''}`}>{fmtNum(m.pairs)}</td>
                    <td><Badge tone={m.source}>{m.source}</Badge></td>
                    <td>{m.source === 'manual' && <IconButton onClick={() => remove(m)}><Trash2 size={14} /></IconButton>}</td>
                  </tr>
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
    </div>
  );
}
