const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO customers (name, phone, email, address) VALUES (?,?,?,?)')
    .run(name, phone || null, email || null, address || null);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?')
    .run(name, phone || null, email || null, address || null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});

router.delete('/:id', (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE customer_id=?').get(req.params.id).c;
  if (used > 0) return res.status(400).json({ error: 'Customer has orders and cannot be deleted' });
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
