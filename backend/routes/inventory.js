const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM materials ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, unit, quantity, reorder_level, unit_cost } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO materials (name, unit, quantity, reorder_level, unit_cost) VALUES (?,?,?,?,?)')
    .run(name, unit || null, quantity || 0, reorder_level || 0, unit_cost || 0);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', (req, res) => {
  const { name, unit, reorder_level, unit_cost } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE materials SET name=?, unit=?, reorder_level=?, unit_cost=? WHERE id=?')
    .run(name, unit || null, reorder_level || 0, unit_cost || 0, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});

// Receive or consume stock; change is positive (in) or negative (out)
router.post('/:id/adjust', (req, res) => {
  const { change, note } = req.body;
  const delta = Number(change);
  if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ error: 'Change must be a non-zero number' });
  const material = db.prepare('SELECT * FROM materials WHERE id=?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const qty = material.quantity + delta;
  if (qty < 0) return res.status(400).json({ error: 'Stock cannot go below zero' });
  db.prepare('UPDATE materials SET quantity=? WHERE id=?').run(qty, req.params.id);
  db.prepare('INSERT INTO stock_movements (material_id, change, note) VALUES (?,?,?)')
    .run(req.params.id, delta, note || null);
  res.json({ ...material, quantity: qty });
});

router.get('/:id/movements', (req, res) => {
  res.json(db.prepare('SELECT * FROM stock_movements WHERE material_id=? ORDER BY id DESC LIMIT 50')
    .all(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
