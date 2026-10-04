const express = require('express');
const { db } = require('../db');
const { recordPurchase, httpError } = require('../lib/stock-ops');
const router = express.Router();

router.get('/', (req, res) => {
  const { from, to } = req.query;
  res.json(db.prepare(`
    SELECT p.*, s.name AS supplier_name FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.is_deleted = 0 ${from && to ? 'AND p.date BETWEEN ? AND ?' : ''}
    ORDER BY p.date DESC, p.id DESC`).all(...(from && to ? [from, to] : [])));
});

router.post('/', (req, res) => {
  const d = req.body;
  if (!d.supplier_id || !d.item) throw httpError(400, 'Supplier and item are required');
  const id = recordPurchase({
    supplier_id: d.supplier_id, item: d.item, category_slug: d.category_slug || 'uppers',
    article_code: d.article_code || '', pack_type: d.pack_type || '', pairs_per_pack: Number(d.pairs_per_pack) || 0,
    quantity: Number(d.quantity) || 0, unit_price: Number(d.unit_price) || 0,
    date: d.date || new Date().toISOString().slice(0, 10),
  });
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE purchases SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
