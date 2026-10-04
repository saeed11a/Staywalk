import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/Modal';

const BLANK = { name: '', phone: '', email: '', address: '' };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/customers').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (editing.id) await api.put('/customers/' + editing.id, body);
      else await api.post('/customers', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Delete customer "' + row.name + '"?')) return;
    try { await api.del('/customers/' + row.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add customer</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No customers yet</div> : (
          <table className="table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{r.email || '—'}</td>
                  <td>{r.address || '—'}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit customer' : 'New customer'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-row">
              <div className="form-group"><label>Name *</label>
                <input name="name" defaultValue={editing.name} required autoFocus /></div>
              <div className="form-group"><label>Phone</label>
                <input name="phone" defaultValue={editing.phone} /></div>
            </div>
            <div className="form-group"><label>Email</label>
              <input name="email" type="email" defaultValue={editing.email} /></div>
            <div className="form-group"><label>Address</label>
              <input name="address" defaultValue={editing.address} /></div>
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
