import { useEffect, useState } from 'react';
import { api, fmtRs, fmtNum, today, daysAgo } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Empty, IconButton, StatCard, DateRange } from '../components/ui';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import { ClickableRow, rowAction, RecordDialog } from '../components/RecordDialog';

export default function Kharcha() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/kharcha?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [from, to]);

  const create = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.amount = Number(body.amount) || 0;
    try {
      await api.post('/kharcha', body);
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this expense to the recycle bin?')) return;
    await api.del('/kharcha/' + row.id);
    load();
  };

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const byCategory = Object.entries(rows.reduce((acc, r) => {
    const k = r.category || 'Uncategorised';
    acc[k] = (acc[k] || 0) + (Number(r.amount) || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageHeader
        label="Daily expenses"
        title="Kharcha"
        description="Simple list of daily factory expenses — every entry also flows into the roznamcha as cash out."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('kharcha.csv',
              ['Date', 'Category', 'Description', 'Amount', 'Method'],
              rows.map((r) => [r.date, r.category, r.description, r.amount, r.method]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button onClick={() => setCreating(true)}><Plus size={15} /> New expense</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total spend" value={fmtRs(total)} accent="copper" />
        <StatCard label="Entries" value={fmtNum(rows.length)} accent="teal" />
        <StatCard label="Categories" value={fmtNum(byCategory.length)} accent="ink" />
        <StatCard label="Average entry" value={fmtRs(rows.length ? total / rows.length : 0)} accent="copper" />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <Card title="Expense entries">
        {rows.length === 0 ? <Empty>No expenses recorded in this date range.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Expense</th><th>Category</th><th className="text-right">Amount</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <ClickableRow key={r.id} onOpen={() => setDetail({
                    title: `Expense — ${r.category || 'Uncategorised'}`,
                    subtitle: r.date,
                    fields: [
                      ['Date', r.date], ['Category', r.category], ['Description', r.description],
                      ['Amount', fmtRs(r.amount)], ['Method', r.method],
                    ],
                  })}>
                    <td className="num text-mutedfg">{r.date}</td>
                    <td>{r.description || '—'}</td>
                    <td className="font-semibold">{r.category || '—'}</td>
                    <td className="num text-right font-bold text-red-600">{fmtRs(r.amount)}</td>
                    <td><IconButton onClick={rowAction(() => remove(r))}><Trash2 size={14} /></IconButton></td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Spend by category" className="mt-4">
        {byCategory.length === 0 ? <Empty>Nothing to summarise yet.</Empty> : (
          <table className="tbl">
            <tbody>
              {byCategory.map(([name, amount]) => (
                <ClickableRow key={name} onOpen={() => setDetail({
                  title: `Spend — ${name}`,
                  subtitle: 'Total of every entry in this category',
                  fields: [['Category', name], ['Total spend', fmtRs(amount)]],
                })}>
                  <td>{name}</td>
                  <td className="num text-right font-bold">{fmtRs(amount)}</td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <Dialog title="New kharcha" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Input name="category" placeholder="Electricity, Wages, Rent…" autoFocus /></Field>
              <Field label="Amount (Rs) *"><Input name="amount" type="number" min="0" step="any" required /></Field>
              <Field label="Description" className="col-span-2"><Input name="description" /></Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={today()} /></Field>
              <Field label="Method"><Select name="method" defaultValue="Cash">{['Cash', 'Bank', 'Cheque', 'Online'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
            </div>
            <p className="mb-1 text-[11px] text-mutedfg">Saving posts this to Roznamcha automatically (source: kharcha).</p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}

      {detail && <RecordDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
