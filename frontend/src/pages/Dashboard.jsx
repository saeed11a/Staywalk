import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, rs } from '../lib/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="empty">Loading…</div>;

  const stats = [
    { label: 'Open orders', value: data.pending_orders },
    { label: 'Jobs in production', value: data.in_production },
    { label: 'Revenue this month', value: rs(data.revenue_this_month) },
    { label: 'Outstanding balance', value: rs(data.outstanding) },
  ];

  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1></div>
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Recent orders</h2>
          {data.recent_orders.length === 0 ? <div className="empty">No orders yet</div> : (
            <table className="table">
              <thead><tr><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link to="/orders">{o.customer_name}</Link></td>
                    <td>{o.order_date}</td>
                    <td>{rs(o.total)}</td>
                    <td><span className={'badge ' + o.status}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <div className="card">
            <h2>Active production</h2>
            {data.active_production.length === 0 ? <div className="empty">No active jobs</div> : (
              <table className="table">
                <thead><tr><th>Product</th><th>Qty</th><th>Assigned</th><th>Status</th></tr></thead>
                <tbody>
                  {data.active_production.map((p) => (
                    <tr key={p.id}>
                      <td>{p.product_name}</td>
                      <td>{p.qty}</td>
                      <td>{p.employee_name || '—'}</td>
                      <td><span className={'badge ' + p.status}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card">
            <h2>Low stock materials</h2>
            {data.low_stock.length === 0 ? <div className="empty">All materials above reorder level</div> : (
              <table className="table">
                <thead><tr><th>Material</th><th>Qty</th><th>Reorder at</th></tr></thead>
                <tbody>
                  {data.low_stock.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.quantity} {m.unit}</td>
                      <td>{m.reorder_level} {m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
