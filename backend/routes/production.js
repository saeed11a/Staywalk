const express = require('express');
const db = require('../db');
const router = express.Router();

const PRODUCTION_STATUSES = ['queued', 'in_progress', 'done'];

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT pr.*, p.name AS product_name, p.code AS product_code, e.name AS employee_name
    FROM production pr
    JOIN products p ON p.id = pr.product_id
    LEFT JOIN employees e ON e.id = pr.assigned_to
    ORDER BY CASE pr.status WHEN 'in_progress' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END, pr.id DESC`).all());
});

router.post('/', (req, res) => {
  const { product_id, qty, assigned_to, start_date, due_date } = req.body;
  if (!product_id || !Number(qty) || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Product and a positive quantity are required' });
  }
  const info = db.prepare(
    'INSERT INTO production (product_id, qty, assigned_to, start_date, due_date) VALUES (?,?,?,?,?)'
  ).run(product_id, Number(qty), assigned_to || null, start_date || null, due_date || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { status } = req.body;
  if (!PRODUCTION_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE production SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM production WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
