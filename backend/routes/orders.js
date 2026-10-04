const express = require('express');
const db = require('../db');
const router = express.Router();

const ORDER_STATUSES = ['pending', 'confirmed', 'production', 'completed', 'delivered'];

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT o.*, c.name AS customer_name,
      COALESCE((SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id), 0) AS total,
      COALESCE((SELECT SUM(qty) FROM order_items WHERE order_id = o.id), 0) AS total_qty,
      (SELECT COUNT(*) FROM invoices WHERE order_id = o.id) AS invoice_count
    FROM orders o JOIN customers c ON c.id = o.customer_id
    ORDER BY o.id DESC`).all());
});

router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.name AS customer_name,
      COALESCE((SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id), 0) AS total
    FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.items = db.prepare(`
    SELECT oi.*, p.name AS product_name FROM order_items oi
    JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`).all(order.id);
  res.json(order);
});

router.post('/', (req, res) => {
  const { customer_id, order_date, notes, items } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'Customer is required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });
  for (const it of items) {
    if (!it.product_id || !Number(it.qty) || Number(it.qty) <= 0) {
      return res.status(400).json({ error: 'Each item needs a product and a positive quantity' });
    }
  }
  const create = db.transaction(() => {
    const info = db.prepare('INSERT INTO orders (customer_id, order_date, notes) VALUES (?,?,?)')
      .run(customer_id, order_date || null, notes || null);
    const orderId = info.lastInsertRowid;
    const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, size, qty, unit_price) VALUES (?,?,?,?,?)');
    for (const it of items) {
      stmt.run(orderId, it.product_id, it.size || null, Number(it.qty), Number(it.unit_price) || 0);
    }
    return orderId;
  });
  const id = create();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { status, notes } = req.body;
  if (status && !ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  db.prepare('UPDATE orders SET status=?, notes=? WHERE id=?')
    .run(status || order.status, notes !== undefined ? notes : order.notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
