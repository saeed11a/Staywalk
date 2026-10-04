import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

const STATUSES = ['queued', 'in_progress', 'done'];

export default function Production() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/production').then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/products').then(setProducts);
    api.get('/employees').then(setEmployees);
  }, []);

  const setStatus = async (job, status) => {
    try { await api.put('/production/' + job.id, { status }); load(); }
    catch (err) { alert(err.message); }
  };

  const remove = async (job) => {
    if (!confirm('Delete this production job?')) return;
    await api.del('/production/' + job.id);
    load();
  };

  const create = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/production', {
        product_id: Number(raw.product_id),
        qty: Number(raw.qty),
        assigned_to: raw.assigned_to ? Number(raw.assigned_to) : null,
        start_date: raw.start_date || null,
        due_date: raw.due_date || null,
      });
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Production</h1>
        <button className="btn" onClick={() => setCreating(true)}>+ New job</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No production jobs yet</div> : (
          <table className="table">
            <thead><tr><th>Product</th><th>Qty</th><th>Assigned to</th><th>Start</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id}>
                  <td>{j.product_name} <small style={{ color: '#94a3b8' }}>{j.product_code}</small></td>
                  <td>{j.qty}</td>
                  <td>{j.employee_name || '—'}</td>
                  <td>{j.start_date || '—'}</td>
                  <td>{j.due_date || '—'}</td>
                  <td>
                    <select value={j.status} onChange={(e) => setStatus(j, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(j)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="New production job" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <div className="form-group"><label>Product *</label>
              <select name="product_id" required defaultValue={products[0]?.id}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Quantity *</label>
                <input name="qty" type="number" min="1" required autoFocus /></div>
              <div className="form-group"><label>Assign employee</label>
                <select name="assigned_to" defaultValue="">
                  <option value="">— Unassigned —</option>
                  {employees.map((e2) => <option key={e2.id} value={e2.id}>{e2.name} ({e2.role})</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Start date</label>
                <input name="start_date" type="date" /></div>
              <div className="form-group"><label>Due date</label>
                <input name="due_date" type="date" /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
