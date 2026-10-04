import { useEffect, useState } from 'react';
import { api, rs } from '../lib/api';
import Modal from '../components/Modal';

const BLANK = { name: '', role: '', phone: '', salary: '', status: 'active' };

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/employees').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    const body = { ...raw, salary: Number(raw.salary) || 0 };
    try {
      if (editing.id) await api.put('/employees/' + editing.id, body);
      else await api.post('/employees', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Mark "' + row.name + '" as inactive?')) return;
    await api.del('/employees/' + row.id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add employee</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No employees yet</div> : (
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.role || '—'}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{rs(r.salary)}</td>
                  <td><span className={'badge ' + r.status}>{r.status}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit employee' : 'New employee'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-row">
              <div className="form-group"><label>Name *</label>
                <input name="name" defaultValue={editing.name} required autoFocus /></div>
              <div className="form-group"><label>Role</label>
                <select name="role" defaultValue={editing.role}>
                  <option value="">—</option>
                  <option value="cutter">cutter</option>
                  <option value="stitcher">stitcher</option>
                  <option value="finisher">finisher</option>
                  <option value="supervisor">supervisor</option>
                  <option value="worker">worker</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Phone</label>
                <input name="phone" defaultValue={editing.phone} /></div>
              <div className="form-group"><label>Monthly salary (Rs)</label>
                <input name="salary" type="number" min="0" defaultValue={editing.salary} /></div>
            </div>
            <div className="form-group"><label>Status</label>
              <select name="status" defaultValue={editing.status}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
