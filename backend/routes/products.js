const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM products WHERE active=1 ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, code, category, sizes, price } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO products (name, code, category, sizes, price) VALUES (?,?,?,?,?)')
    .run(name, code || null, category || null, sizes || null, price || 0);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', (req, res) => {
  const { name, code, category, sizes, price } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE products SET name=?, code=?, category=?, sizes=?, price=? WHERE id=?')
    .run(name, code || null, category || null, sizes || null, price || 0, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
