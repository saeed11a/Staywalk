const express = require('express');
const { db } = require('../db');
const { pairsFromCartons, httpError } = require('../lib/stock-ops');
const router = express.Router();

// Live balance per article (all movements: manual, production, sale)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.id AS article_id, a.code, a.name,
      COALESCE(SUM(rs.cartons), 0) AS cartons,
      COALESCE(SUM(rs.pairs), 0) AS pairs
    FROM articles a
    LEFT JOIN ready_shoes rs ON rs.article_id = a.id AND rs.is_deleted = 0
    WHERE a.is_deleted = 0
    GROUP BY a.id ORDER BY a.code`).all();
  const movements = db.prepare(`
    SELECT rs.*, a.code AS article_code, a.name AS article_name FROM ready_shoes rs
    JOIN articles a ON a.id = rs.article_id
    WHERE rs.is_deleted = 0 ORDER BY rs.date DESC, rs.id DESC LIMIT 200`).all();
  res.json({ stock: rows, movements });
});

router.post('/', (req, res) => {
  const d = req.body;
  if (!d.article_id) throw httpError(400, 'Article is required');
  const pairs = pairsFromCartons(d.cartons, d.pairs_per_carton);
  const info = db.prepare(`INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, date)
    VALUES (?,?,?,?,?, 'manual', ?)`)
    .run(d.article_id, d.carton_type || '', d.pairs_per_carton || 0, d.cartons || 0, pairs, d.date || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE ready_shoes SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ? AND source = 'manual'").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
