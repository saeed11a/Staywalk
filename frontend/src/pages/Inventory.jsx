import { useEffect, useState } from 'react';
import { api, rs } from '../lib/api';
import Modal from '../components/Modal';

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null); // material being adjusted
  const [creating, setCreating] = useState(false);
  const [movements, setMovements] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/inventory').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const adjust = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/inventory/' + editing.id + '/adjust', {
        change: Number(raw.change),
        note: raw.note,
      });
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const create = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/inventory', {
        name: raw.name,
        unit: raw.unit,
        quantity: Number(raw.quantity) || 0,
        reorder_level: Number(raw.reorder_level) || 0,
        unit_cost: Number(raw.unit_cost) || 0,
      });
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const showMovements = async (m) => {
    setMovements({ material: m, rows: await api.get('/inventory/' + m.id + '/movements') });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <button className="btn" onClick={() => setCreating(true)}>+ Add material</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No materials yet</div> : (
          <table className="table">
            <thead><tr><th>Material</th><th>Qty</th><th>Reorder at</th><th>Unit cost</th><th>Stock value</th><th></th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    {m.quantity <= m.reorder_level && <span className="badge unpaid" style={{ marginLeft: 8 }}>low</span>}
                  </td>
                  <td>{m.quantity} {m.unit}</td>
                  <td>{m.reorder_level} {m.unit}</td>
                  <td>{rs(m.unit_cost)}</td>
                  <td>{rs(m.quantity * m.unit_cost)}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(m)}>Adjust stock</button>{' '}
                    <button className="btn btn-secondary btn-sm" onClick={() => showMovements(m)}>History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={'Adjust stock — ' + editing.name} onClose={() => setEditing(null)}>
          <form onSubmit={adjust}>
            <p style={{ marginTop: 0, color: '#64748b' }}>
              Current stock: <strong>{editing.quantity} {editing.unit}</strong>
            </p>
            <div className="form-group"><label>Change (+ receive / − consume) *</label>
              <input name="change" type="number" step="any" required autoFocus placeholder="e.g. 50 or -20" /></div>
            <div className="form-group"><label>Note</label>
              <input name="note" placeholder="e.g. purchase, used for order #3" /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn">Apply</button>
            </div>
          </form>
        </Modal>
      )}

      {creating && (
        <Modal title="New material" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <div className="form-row">
              <div className="form-group"><label>Name *</label>
                <input name="name" required autoFocus /></div>
              <div className="form-group"><label>Unit</label>
                <input name="unit" placeholder="sq ft, pcs, kg…" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Opening quantity</label>
                <input name="quantity" type="number" step="any" min="0" defaultValue={0} /></div>
              <div className="form-group"><label>Reorder level</label>
                <input name="reorder_level" type="number" step="any" min="0" defaultValue={0} /></div>
            </div>
            <div className="form-group"><label>Unit cost (Rs)</label>
              <input name="unit_cost" type="number" step="any" min="0" defaultValue={0} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {movements && (
        <Modal title={'Stock history — ' + movements.material.name} onClose={() => setMovements(null)}>
          <div style={{ padding: 20 }}>
            {movements.rows.length === 0 ? <div className="empty">No movements recorded</div> : (
              <table className="table">
                <thead><tr><th>When</th><th>Change</th><th>Note</th></tr></thead>
                <tbody>
                  {movements.rows.map((mv) => (
                    <tr key={mv.id}>
                      <td>{mv.created_at}</td>
                      <td style={{ color: mv.change >= 0 ? '#166534' : '#991b1b' }}>
                        {mv.change >= 0 ? '+' : ''}{mv.change}
                      </td>
                      <td>{mv.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
