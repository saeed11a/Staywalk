import { useEffect, useState } from 'react';
import { api, rs } from '../lib/api';
import Modal from '../components/Modal';

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null); // invoice being paid
  const [viewing, setViewing] = useState(null); // invoice payments history
  const [error, setError] = useState('');

  const load = () => api.get('/invoices').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openCreate = async () => {
    const all = await api.get('/orders');
    setOrders(all.filter((o) => o.invoice_count === 0));
    setCreating(true);
  };

  const create = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/invoices', { order_id: Number(raw.order_id), due_date: raw.due_date || null });
      setCreating(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const pay = async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/invoices/' + paying.id + '/payments', { amount: Number(raw.amount), method: raw.method });
      setPaying(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (inv) => {
    if (!confirm('Delete ' + inv.invoice_no + '? Payments will also be deleted.')) return;
    await api.del('/invoices/' + inv.id);
    load();
  };

  const showPayments = async (inv) => {
    setViewing({ invoice: inv, payments: await api.get('/invoices/' + inv.id + '/payments') });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        <button className="btn" onClick={openCreate}>+ New invoice</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No invoices yet</div> : (
          <table className="table">
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Issued</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_no}</td>
                  <td>{inv.customer_name}</td>
                  <td>{inv.issue_date}</td>
                  <td>{inv.due_date || '—'}</td>
                  <td>{rs(inv.total)}</td>
                  <td>{rs(inv.paid)}</td>
                  <td>{rs(inv.total - inv.paid)}</td>
                  <td><span className={'badge ' + inv.status}>{inv.status}</span></td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setPaying(inv)}>Payment</button>{' '}
                    <button className="btn btn-secondary btn-sm" onClick={() => showPayments(inv)}>History</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(inv)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="New invoice" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <div className="form-group"><label>Order *</label>
              <select name="order_id" required defaultValue={orders[0]?.id || ''}>
                {orders.length === 0 && <option value="">No uninvoiced orders</option>}
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} — {o.customer_name} ({rs(o.total)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Due date</label>
              <input name="due_date" type="date" /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn" disabled={orders.length === 0}>Create</button>
            </div>
          </form>
        </Modal>
      )}

      {paying && (
        <Modal title={'Record payment — ' + paying.invoice_no} onClose={() => setPaying(null)}>
          <form onSubmit={pay}>
            <p style={{ marginTop: 0, color: '#64748b' }}>
              Total {rs(paying.total)} · Paid {rs(paying.paid)} · Balance <strong>{rs(paying.total - paying.paid)}</strong>
            </p>
            <div className="form-row">
              <div className="form-group"><label>Amount (Rs) *</label>
                <input name="amount" type="number" min="0.01" step="any" required autoFocus
                  defaultValue={Math.max(paying.total - paying.paid, 0)} /></div>
              <div className="form-group"><label>Method</label>
                <select name="method" defaultValue="cash">
                  <option value="cash">cash</option>
                  <option value="bank transfer">bank transfer</option>
                  <option value="cheque">cheque</option>
                  <option value="other">other</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPaying(null)}>Cancel</button>
              <button className="btn">Record</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title={'Payments — ' + viewing.invoice.invoice_no} onClose={() => setViewing(null)}>
          <div style={{ padding: 20 }}>
            {viewing.payments.length === 0 ? <div className="empty">No payments recorded</div> : (
              <table className="table">
                <thead><tr><th>When</th><th>Amount</th><th>Method</th></tr></thead>
                <tbody>
                  {viewing.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.paid_at}</td>
                      <td>{rs(p.amount)}</td>
                      <td>{p.method || '—'}</td>
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
