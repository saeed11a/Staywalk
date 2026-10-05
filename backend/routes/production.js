const express = require('express');
const { db } = require('../db');
const { recordProduction, httpError } = require('../lib/stock-ops');
const router = express.Router();

router.get('/', (req, res) => {
  const { from, to } = req.query;
  res.json(db.prepare(`
    SELECT pe.*, a.code AS article_code, a.name AS article_name
    FROM production_entries pe JOIN articles a ON a.id = pe.article_id
    WHERE pe.is_deleted = 0 ${from && to ? 'AND pe.date BETWEEN ? AND ?' : ''}
    ORDER BY pe.date DESC, pe.id DESC`).all(...(from && to ? [from, to] : [])));
});

router.post('/', (req, res) => {
  const d = req.body;
  if (!d.article_id) throw httpError(400, 'Article is required');
  const id = recordProduction({
    article_id: d.article_id,
    date: d.date || new Date().toISOString().slice(0, 10),
    line: d.line || '', shift: d.shift || '', operator: d.operator || '',
    input_bags: Number(d.input_bags) || 0, pairs_per_bag: Number(d.pairs_per_bag) || 0,
    carton_type: d.carton_type || '', pairs_per_carton: Number(d.pairs_per_carton) || 0,
    output_cartons: Number(d.output_cartons) || 0,
  });
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE production_entries SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
