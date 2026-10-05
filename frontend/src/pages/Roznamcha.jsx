import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtRs, daysAgo, today } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { Button, Card, Dialog, Field, Input, Select, PageHeader, Empty, IconButton, DateRange } from '../components/ui';
import { Plus, Trash2, Pencil, Download, Printer, Wallet } from 'lucide-react';
import { rowAction } from '../components/RecordDialog';

/** Big colour-filled totals card used at the top of the cash book */
function CashStat({ label, value, tone }) {
  const tones = {
    in: 'bg-emerald-600 text-white',
    out: 'bg-red-600 text-white',
    balance: 'bg-emerald-700 text-white',
    balanceNegative: 'bg-red-600 text-white',
  };
  return (
    <div className={`rounded-xl p-4 transition-colors ${tones[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="num mt-1.5 text-[20px] font-extrabold">{value < 0 ? '−' : ''}{fmtRs(Math.abs(value))}</div>
    </div>
  );
}

/** One grouped section (IN or OUT) with its own entry list */
function RoznamchaGroup({ title, tone, rows, total, hint, onEdit, onRemove }) {
  const toneCls = tone === 'in' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white';
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-heading text-[15px] font-extrabold">{title}</div>
          <div className="text-[11px] text-mutedfg">{hint}</div>
        </div>
        <div className={`rounded-lg px-3 py-2 text-right text-[12px] font-bold ${toneCls}`}>
          {title}: {fmtRs(total)}
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty>No entries in this date range.</Empty>
      ) : (
        <div className="divide-y divide-borderc border-t border-borderc">
          {rows.map((r) => (
            <div key={r.id} onClick={() => onEdit(r)} title="Click to open this entry"
              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
              <div className="min-w-0">
                <div className="font-heading text-[14px] font-bold">{r.party || r.description || r.source}</div>
                <div className="truncate text-[11px] text-mutedfg">
                  {r.date} · {fmtRs(r.amount)} · {r.description || r.category || r.source}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton onClick={rowAction(() => onEdit(r))} title="Edit"><Pencil size={13} /></IconButton>
                <IconButton onClick={rowAction(() => onRemove(r))} title="Delete"><Trash2 size={13} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Roznamcha() {
  const [rows, setRows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    api.get(`/roznamcha?from=${from}&to=${to}`).then(setRows).catch((e) => setError(e.message));
    api.get('/dashboard').then(setDashboard).catch(() => {});
  };
  useEffect(() => { load(); }, [from, to]);

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.amount = Number(body.amount) || 0;
    try {
      if (editing?.id) await api.put('/roznamcha/' + editing.id, body);
      else await api.post('/roznamcha', body);
      setCreating(false);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Move this entry to the recycle bin?')) return;
    await api.del('/roznamcha/' + row.id);
    load();
  };

  const inRows = rows.filter((r) => r.direction === 'in');
  const outRows = rows.filter((r) => r.direction === 'out');
  const totalIn = inRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalOut = outRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = Number(dashboard?.cash ?? totalIn - totalOut);
  const form = editing || creating ? (editing || { direction: 'in', source: 'other_income', date: today() }) : null;

  return (
    <div>
      <PageHeader
        label="Cash book"
        title="Cash Roznamcha"
        description="Customer receipts and daily expenses, with the remaining balance."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV('roznamcha.csv',
              ['Date', 'Direction', 'Source', 'Party', 'Description', 'Category', 'Amount', 'Method'],
              rows.map((r) => [r.date, r.direction, r.source, r.party, r.description, r.category, r.amount, r.method]))}>
              <Download size={13} /> Excel / CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> PDF / Print</Button>
            <Button variant="secondary" onClick={() => navigate('/payments')}><Wallet size={15} /> Record payment</Button>
            <Button onClick={() => setCreating(true)}><Plus size={15} /> New Entry</Button>
          </>
        }
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CashStat label="In" value={totalIn} tone="in" />
        <CashStat label="Out" value={totalOut} tone="out" />
        <CashStat label="Remaining" value={remaining} tone={remaining < 0 ? 'balanceNegative' : 'balance'} />
      </div>

      <DateRange from={from} setFrom={setFrom} to={to} setTo={setTo} onClear={() => { setFrom(daysAgo(30)); setTo(today()); }} />

      <RoznamchaGroup
        title="IN" tone="in" rows={inRows} total={totalIn}
        hint="Money received from customers" onEdit={setEditing} onRemove={remove}
      />
      <RoznamchaGroup
        title="OUT" tone="out" rows={outRows} total={totalOut}
        hint="Supplier payments and daily expenses" onEdit={setEditing} onRemove={remove}
      />

      {form && (
        <Dialog title={editing?.id ? 'Edit roznamcha entry' : 'Add roznamcha entry'} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={save} className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Direction">
                <Select name="direction" defaultValue={form.direction}><option value="in">in</option><option value="out">out</option></Select>
              </Field>
              <Field label="Source">
                <Select name="source" defaultValue={form.source || 'other_income'}>
                  <option value="other_income">other income</option>
                  <option value="opening">opening</option>
                </Select>
              </Field>
              <Field label="Amount (Rs) *"><Input name="amount" type="number" min="0" step="any" defaultValue={form.amount} required /></Field>
              <Field label="Date"><Input name="date" type="date" defaultValue={form.date || today()} /></Field>
              <Field label="Party"><Input name="party" defaultValue={form.party} /></Field>
              <Field label="Category"><Input name="category" defaultValue={form.category} /></Field>
              <Field label="Description" className="col-span-2"><Input name="description" defaultValue={form.description} /></Field>
              <Field label="Method"><Select name="method" defaultValue={form.method || 'Cash'}>{['Cash', 'Bank', 'Cheque', 'Online'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Reference"><Input name="reference" defaultValue={form.reference} /></Field>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
