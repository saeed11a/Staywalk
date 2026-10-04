import { useEffect, useState } from 'react';
import { api, rs } from '../lib/api';
import Modal from '../components/Modal';

const BLANK = { name: '', code: '', category: 'hiking', sizes: '', price: '' };

export default function Products() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/products').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    const body = { ...raw, price: Number(raw.price) || 0 };
    try {
      if (editing.id) await api.put('/products/' + editing.id, body);
      else await api.post('/products', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (row) => {
    if (!confirm('Remove product "' + row.name + '"? It will no longer be available for new orders.')) return;
    await api.del('/products/' + row.id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add product</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No products yet</div> : (
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Sizes</th><th>Price</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code || '—'}</td>
                  <td>{r.name}</td>
                  <td>{r.category || '—'}</td>
                  <td>{r.sizes || '—'}</td>
                  <td>{rs(r.price)}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit product' : 'New product'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-row">
              <div className="form-group"><label>Name *</label>
                <input name="name" defaultValue={editing.name} required autoFocus /></div>
              <div className="form-group"><label>Code</label>
                <input name="code" defaultValue={editing.code} placeholder="HKB-01" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Category</label>
                <select name="category" defaultValue={editing.category}>
                  <option value="hiking">hiking</option>
                  <option value="sports">sports</option>
                  <option value="formal">formal</option>
                  <option value="casual">casual</option>
                  <option value="kids">kids</option>
                </select></div>
              <div className="form-group"><label>Size range</label>
                <input name="sizes" defaultValue={editing.sizes} placeholder="40-45" /></div>
            </div>
            <div className="form-group"><label>Unit price (Rs) *</label>
              <input name="price" type="number" min="0" step="1" defaultValue={editing.price} required /></div>
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
