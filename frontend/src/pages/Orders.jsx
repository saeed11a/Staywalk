import { useEffect, useState } from 'react';
import { api, rs } from '../lib/api';
import Modal from '../components/Modal';

const STATUSES = ['pending', 'confirmed', 'production', 'completed', 'delivered'];

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/orders').then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/customers').then(setCustomers);
    api.get('/products').then(setProducts);
  }, []);

  const setStatus = async (order, status) => {
    try { await api.put('/orders/' + order.id, { status }); load(); }
    catch (err) { alert(err.message); }
  };

  const remove = async (order) => {
    if (!confirm('Delete order #' + order.id + '? Invoices for it will also be deleted.')) return;
    await api.del('/orders/' + order.id);
    load();
  };

  const view = async (order) => {
    setViewing(await api.get('/orders/' + order.id));
  };

  const createInvoice = async (order) => {
    try {
      await api.post('/invoices', { order_id: order.id });
      alert('Invoice created for order #' + order.id);
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <button className="btn" onClick={() => setCreating(true)}>+ New order</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        {rows.length === 0 ? <div className="empty">No orders yet</div> : (
          <table className="table">
            <thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Invoice</th><th></th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); view(o); }}>{o.customer_name}</a></td>
                  <td>{o.order_date}</td>
                  <td>{o.total_qty}</td>
                  <td>{rs(o.total)}</td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className="badge-input">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    {o.invoice_count > 0
                      ? <span className="badge completed">invoiced</span>
                      : <button className="btn btn-secondary btn-sm" onClick={() => createInvoice(o)}>Create invoice</button>}
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(o)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <NewOrderModal
          customers={customers}
          products={products}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}

      {viewing && (
        <Modal title={'Order #' + viewing.id} onClose={() => setViewing(null)}>
          <div style={{ padding: 20 }}>
            <p><strong>Customer:</strong> {viewing.customer_name}</p>
            <p><strong>Date:</strong> {viewing.order_date} &nbsp; <strong>Status:</strong> {viewing.status}</p>
            {viewing.notes && <p><strong>Notes:</strong> {viewing.notes}</p>}
            <table className="table">
              <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead>
              <tbody>
                {viewing.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_name}</td>
                    <td>{it.size || '—'}</td>
                    <td>{it.qty}</td>
                    <td>{rs(it.unit_price)}</td>
                    <td>{rs(it.qty * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="total-line">Total: {rs(viewing.total)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewOrderModal({ customers, products, onClose, onSaved }) {
  const [customer_id, setCustomerId] = useState(customers[0]?.id || '');
  const [order_date, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: products[0]?.id || '', size: '', qty: 1, unit_price: products[0]?.price || 0 },
  ]);
  const [error, setError] = useState('');

  const setItem = (i, field, value) => {
    setItems(items.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, [field]: value };
      if (field === 'product_id') {
        const p = products.find((p) => p.id === Number(value));
        if (p) next.unit_price = p.price;
      }
      return next;
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        customer_id: Number(customer_id),
        order_date,
        notes,
        items: items.map((it) => ({
          product_id: Number(it.product_id),
          size: it.size,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
        })),
      });
      onSaved();
    } catch (err) { setError(err.message); }
  };

  const total = items.reduce((s, it) => s + Number(it.qty) * Number(it.unit_price), 0);

  return (
    <Modal title="New order" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group"><label>Customer *</label>
            <select value={customer_id} onChange={(e) => setCustomerId(e.target.value)} required>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Order date</label>
            <input type="date" value={order_date} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group"><label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></div>

        <div className="item-rows">
          {items.map((it, i) => (
            <div className="item-row" key={i}>
              <select value={it.product_id} onChange={(e) => setItem(i, 'product_id', e.target.value)}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Size" value={it.size} onChange={(e) => setItem(i, 'size', e.target.value)} />
              <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
              <input type="number" min="0" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} />
              <button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={() => setItems([...items, { product_id: products[0]?.id || '', size: '', qty: 1, unit_price: products[0]?.price || 0 }])}>
            + Add item
          </button>
        </div>
        <p className="total-line">Total: {rs(total)}</p>
        {error && <div className="error-banner">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn">Create order</button>
        </div>
      </form>
    </Modal>
  );
}
