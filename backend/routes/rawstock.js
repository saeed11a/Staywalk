const express = require('express');
const { db } = require('../db');
const { pairsFromPack, httpError } = require('../lib/stock-ops');

// ----- Raw categories -----
const categories = express.Router();

categories.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM raw_categories WHERE is_deleted = 0 ORDER BY sort_order, name').all());
});

categories.post('/', (req, res) => {
  const { name, slug, unit_label, uses_pairs, sort_order, fields } = req.body;
  if (!name || !slug) throw httpError(400, 'Name and slug are required');
  const info = db.prepare('INSERT INTO raw_categories (name, slug, unit_label, uses_pairs, sort_order, fields_json) VALUES (?,?,?,?,?,?)')
    .run(name, slug, unit_label || 'unit', uses_pairs ? 1 : 0, sort_order || 0, JSON.stringify(fields || []));
  res.status(201).json({ id: info.lastInsertRowid });
});

categories.delete('/:id', (req, res) => {
  db.prepare("UPDATE raw_categories SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ----- Raw stock -----
const stock = express.Router();

stock.get('/', (req, res) => {
  const slug = req.query.category;
  res.json(db.prepare(`SELECT rs.*, COALESCE(s.name, '') AS supplier_name FROM raw_stock rs
    LEFT JOIN suppliers s ON s.id = rs.supplier_id
    WHERE rs.is_deleted = 0 ${slug ? 'AND rs.category_slug = ?' : ''}
    ORDER BY rs.date DESC, rs.id DESC`).all(...(slug ? [slug] : [])));
});

stock.post('/', (req, res) => {
  const d = req.body;
  if (!d.item || !d.category_slug) throw httpError(400, 'Item and category are required');
  const totalPairs = pairsFromPack(d.quantity, d.pairs_per_pack);
  const amount = (Number(d.quantity) || 0) * (Number(d.unit_price) || 0);
  const info = db.prepare(`INSERT INTO raw_stock
    (category_slug, item, article_code, pack_type, pairs_per_pack, quantity, unit, total_pairs, unit_price, amount, supplier_id, date, custom_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(d.category_slug, d.item, d.article_code || '', d.pack_type || '', d.pairs_per_pack || 0,
      d.quantity || 0, d.unit || '', totalPairs, d.unit_price || 0, amount, d.supplier_id || null,
      d.date || null, JSON.stringify(d.custom || {}));
  res.status(201).json({ id: info.lastInsertRowid });
});

stock.put('/:id', (req, res) => {
  const d = req.body;
  const totalPairs = pairsFromPack(d.quantity, d.pairs_per_pack);
  const amount = (Number(d.quantity) || 0) * (Number(d.unit_price) || 0);
  db.prepare(`UPDATE raw_stock SET item=?, pack_type=?, pairs_per_pack=?, quantity=?, unit=?, total_pairs=?, unit_price=?, amount=?, supplier_id=?, date=?, custom_json=? WHERE id=?`)
    .run(d.item, d.pack_type || '', d.pairs_per_pack || 0, d.quantity || 0, d.unit || '', totalPairs,
      d.unit_price || 0, amount, d.supplier_id || null, d.date || null, JSON.stringify(d.custom || {}), req.params.id);
  res.json({ ok: true });
});

stock.delete('/:id', (req, res) => {
  db.prepare("UPDATE raw_stock SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = { categories, stock };
