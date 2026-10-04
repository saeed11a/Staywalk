import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Button, Card, PageHeader, Empty, IconButton, Badge } from '../components/ui';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function RecycleBin() {
  const [rows, setRows] = useState([]);
  const [table, setTable] = useState('');
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
  const filtered = table ? rows.filter((r) => r.table === table) : rows;

  return (
    <div>
      <PageHeader title="Recycle Bin" actions={
        tables.length > 0 ? (
          <select value={table} onChange={(e) => setTable(e.target.value)}
            className="h-9 rounded-lg border border-borderc bg-card px-3 text-sm">
            <option value="">All tables ({rows.length})</option>
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : undefined
      } />
      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>}
      <Card>
        {filtered.length === 0 ? <Empty>Nothing deleted — the bin is empty.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Table</th><th>Record</th><th>Deleted at</th><th></th></tr></thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.table}-${r.id}-${i}`}>
                    <td><Badge tone="copper">{r.table.replace(/_/g, ' ')}</Badge></td>
                    <td className="font-semibold">{r.label || `#${r.id}`}</td>
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
    </div>
  );
}
