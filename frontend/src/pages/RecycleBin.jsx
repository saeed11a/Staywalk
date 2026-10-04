import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, PageHeader, Empty, IconButton, Badge, StatCard, Field, Input, Select } from '../components/ui';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';

export default function RecycleBin() {
  const [rows, setRows] = useState([]);
  const [table, setTable] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/recycle-bin').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const restore = async (row) => {
    await api.post('/recycle-bin/restore', { table: row.table, id: row.id });
    load();
  };

  const purge = async (row) => {
    if (!confirm(`Permanently delete this ${row.table.replace(/_/g, ' ')} record? This cannot be undone.`)) return;
    try {
      await api.post('/recycle-bin/purge', { table: row.table, id: row.id });
      load();
    } catch (err) { setError(err.message); }
  };

  const tables = [...new Set(rows.map((r) => r.table))];
  const filtered = rows
    .filter((r) => (table ? r.table === table : true))
    .filter((r) => String(r.label || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        label="Recovery"
        title="Recycle Bin"
        description="Everything deleted anywhere in the app waits here. Restore puts a record back in its module; permanent delete cannot be undone."
      />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Deleted records" value={rows.length} accent="copper" />
        <StatCard label="Modules affected" value={tables.length} accent="teal" />
        <StatCard label="Latest deletion" value={rows[0]?.deleted_date?.slice(0, 10) || '—'} accent="ink" />
        <StatCard label="Shown" value={filtered.length} sub="After filters" accent="copper" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Module">
          <Select value={table} onChange={(e) => setTable(e.target.value)}>
            <option value="">All modules</option>
            {tables.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
        </Field>
        <Field label="Search">
          <Input placeholder="Record name" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
      </div>

      <Card title="Deleted records">
        {filtered.length === 0 ? (
          <div className="m-4 rounded-xl border border-dashed border-borderc bg-muted/40 px-4 py-11 text-center">
            <div className="font-heading text-[13px] font-bold">Recycle Bin is empty</div>
            <div className="mt-1 text-[12px] text-mutedfg">Deleted records from every module are collected here, shown in red.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Module</th><th>Record</th><th>Deleted</th><th></th></tr></thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.table}-${r.id}-${i}`}>
                    <td><Badge tone="copper">{r.table.replace(/_/g, ' ')}</Badge></td>
                    <td className="font-semibold text-red-600">{r.label || `#${r.id}`}</td>
                    <td className="num text-mutedfg">{r.deleted_date}</td>
                    <td className="whitespace-nowrap">
                      <IconButton onClick={() => restore(r)} title="Restore"><RotateCcw size={14} /></IconButton>
                      <IconButton onClick={() => purge(r)} title="Delete permanently"><Trash2 size={14} /></IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-borderc bg-card p-4">
        <AlertTriangle size={18} className="shrink-0 text-copper" />
        <div className="text-[11px] text-mutedfg">Permanent delete removes the row from the database — it cannot be restored afterwards.</div>
      </div>
    </div>
  );
}
