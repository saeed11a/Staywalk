const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM employees ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, role, phone, salary, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO employees (name, role, phone, salary, status) VALUES (?,?,?,?,?)')
    .run(name, role || null, phone || null, salary || 0, status || 'active');
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', (req, res) => {
  const { name, role, phone, salary, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE employees SET name=?, role=?, phone=?, salary=?, status=? WHERE id=?')
    .run(name, role || null, phone || null, salary || 0, status || 'active', req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE employees SET status='inactive' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
