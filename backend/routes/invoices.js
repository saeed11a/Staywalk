const express = require('express');
const db = require('../db');
const router = express.Router();

function invoiceTotal(orderId) {
  return db.prepare('SELECT COALESCE(SUM(qty * unit_price), 0) AS t FROM order_items WHERE order_id = ?')
    .get(orderId).t;
}

function invoicePaid(invoiceId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS p FROM payments WHERE invoice_id = ?')
    .get(invoiceId).p;
}

function refreshStatus(invoiceId) {
  const total = db.prepare('SELECT order_id FROM invoices WHERE id=?').get(invoiceId);
  if (!total) return;
  const grand = invoiceTotal(total.order_id);
  const paid = invoicePaid(invoiceId);
  const status = paid <= 0 ? 'unpaid' : (paid >= grand - 0.01 ? 'paid' : 'partial');
  db.prepare('UPDATE invoices SET status=? WHERE id=?').run(status, invoiceId);
}

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT i.*, c.name AS customer_name, o.id AS order_id,
      COALESCE((SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id), 0) AS total,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) AS paid
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    JOIN customers c ON c.id = o.customer_id
    ORDER BY i.id DESC`).all());
});

router.post('/', (req, res) => {
  const { order_id, due_date } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(order_id);
  if (!order) return res.status(400).json({ error: 'Order not found' });
  const existing = db.prepare('SELECT id FROM invoices WHERE order_id=?').get(order_id);
  if (existing) return res.status(400).json({ error: 'This order already has an invoice' });
  const year = new Date().getFullYear();
  const seq = String(db.prepare('SELECT COUNT(*) AS c FROM invoices').get().c + 1).padStart(4, '0');
  const info = db.prepare("INSERT INTO invoices (order_id, invoice_no, due_date) VALUES (?,?,?)")
    .run(order_id, `INV-${year}-${seq}`, due_date || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/:id/payments', (req, res) => {
  const { amount, method } = req.body;
  const value = Number(amount);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  db.prepare('INSERT INTO payments (invoice_id, amount, method) VALUES (?,?,?)')
    .run(invoice.id, value, method || null);
  refreshStatus(invoice.id);
  res.status(201).json({ ok: true });
});

router.get('/:id/payments', (req, res) => {
  res.json(db.prepare('SELECT * FROM payments WHERE invoice_id=? ORDER BY id DESC').all(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
