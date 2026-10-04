const express = require('express');
const { db } = require('../db');
const { httpError } = require('../lib/stock-ops');
const router = express.Router();

function nextCode() {
  const row = db.prepare("SELECT code FROM articles ORDER BY id DESC LIMIT 1").get();
  const last = row ? (parseInt(row.code.replace(/\D/g, ''), 10) || 0) : 0;
  return 'HSF-' + String(last + 1).padStart(3, '0');
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM articles WHERE is_deleted = 0 ORDER BY code').all());
});

router.post('/', (req, res) => {
  const { name, category, sizes, colors, upper_type, sole_type, cost_price, selling_price, status } = req.body;
  if (!name) throw httpError(400, 'Name is required');
  const code = req.body.code || nextCode();
  const info = db.prepare(`INSERT INTO articles (code, name, category, sizes, colors, upper_type, sole_type, cost_price, selling_price, status)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(code, name, category || '', sizes || '', colors || '', upper_type || '', sole_type || '',
      cost_price || 0, selling_price || 0, status || 'active');
  res.status(201).json({ id: info.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM articles WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!a) throw httpError(404, 'Article not found');
  const { name, category, sizes, colors, upper_type, sole_type, cost_price, selling_price, status } = req.body;
  db.prepare(`UPDATE articles SET name=?, category=?, sizes=?, colors=?, upper_type=?, sole_type=?, cost_price=?, selling_price=?, status=? WHERE id=?`)
    .run(name || a.name, category ?? a.category, sizes ?? a.sizes, colors ?? a.colors,
      upper_type ?? a.upper_type, sole_type ?? a.sole_type,
      cost_price ?? a.cost_price, selling_price ?? a.selling_price, status || a.status, a.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE articles SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
