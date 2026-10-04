const express = require('express');
const { db } = require('../db');
const { createInvoice, httpError } = require('../lib/stock-ops');
const router = express.Router();

router.get('/', (req, res) => {
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT i.*, c.name AS customer_name FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.is_deleted = 0 ${from && to ? 'AND i.date BETWEEN ? AND ?' : ''}
    ORDER BY i.date DESC, i.id DESC`).all(...(from && to ? [from, to] : []));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name AS customer_name, c.address AS customer_address, c.city AS customer_city, c.phone AS customer_phone
    FROM invoices i JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ? AND i.is_deleted = 0`).get(req.params.id);
  if (!invoice) throw httpError(404, 'Invoice not found');
  invoice.lines = db.prepare(`
    SELECT il.*, a.code AS article_code, a.name AS article_name FROM invoice_lines il
    JOIN articles a ON a.id = il.article_id WHERE il.invoice_id = ?`).all(invoice.id);
  res.json(invoice);
});

router.post('/', (req, res) => {
  const { customer_id, date, lines, discount, received, payment_method, notes } = req.body;
  if (!customer_id) throw httpError(400, 'Customer is required');
  if (!Array.isArray(lines) || lines.length === 0) throw httpError(400, 'At least one line is required');
  const result = createInvoice({
    customer_id, date: date || new Date().toISOString().slice(0, 10),
    lines, discount, received, payment_method, notes,
  });
  res.status(201).json(result);
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE invoices SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
