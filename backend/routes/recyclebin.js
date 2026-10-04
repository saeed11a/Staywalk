const express = require('express');
const { db } = require('../db');
const { httpError } = require('../lib/stock-ops');
const router = express.Router();

// Every soft-deleted record from all modules
const TABLES = [
  ['articles', 'SELECT id, code AS label, deleted_date FROM articles WHERE is_deleted = 1'],
  ['raw_stock', 'SELECT id, item AS label, deleted_date FROM raw_stock WHERE is_deleted = 1'],
  ['ready_shoes', "SELECT id, 'ready shoes entry' AS label, deleted_date FROM ready_shoes WHERE is_deleted = 1"],
  ['production_entries', "SELECT id, 'production entry' AS label, deleted_date FROM production_entries WHERE is_deleted = 1"],
  ['purchases', 'SELECT id, item AS label, deleted_date FROM purchases WHERE is_deleted = 1'],
  ['customers', 'SELECT id, name AS label, deleted_date FROM customers WHERE is_deleted = 1'],
  ['suppliers', 'SELECT id, name AS label, deleted_date FROM suppliers WHERE is_deleted = 1'],
  ['invoices', 'SELECT id, invoice_no AS label, deleted_date FROM invoices WHERE is_deleted = 1'],
  ['payments', "SELECT id, party_name AS label, deleted_date FROM payments WHERE is_deleted = 1"],
  ['kharcha', 'SELECT id, description AS label, deleted_date FROM kharcha WHERE is_deleted = 1'],
  ['roznamcha', "SELECT id, description AS label, deleted_date FROM roznamcha WHERE is_deleted = 1"],
  ['raw_categories', 'SELECT id, name AS label, deleted_date FROM raw_categories WHERE is_deleted = 1'],
];

router.get('/', (req, res) => {
  const out = [];
  for (const [table, sql] of TABLES) {
    for (const row of db.prepare(sql).all()) {
      out.push({ table, id: row.id, label: row.label, deleted_date: row.deleted_date });
    }
  }
  out.sort((a, b) => (a.deleted_date < b.deleted_date ? 1 : -1));
  res.json(out);
});

router.post('/restore', (req, res) => {
  const { table, id } = req.body;
  if (!TABLES.find(([t]) => t === table)) throw httpError(400, 'Unknown table');
  db.prepare(`UPDATE ${table} SET is_deleted = 0, deleted_date = NULL WHERE id = ?`).run(id);
  res.json({ ok: true });
});

router.post('/purge', (req, res) => {
  const { table, id } = req.body;
  if (!TABLES.find(([t]) => t === table)) throw httpError(400, 'Unknown table');
  db.prepare(`DELETE FROM ${table} WHERE id = ? AND is_deleted = 1`).run(id);
  res.json({ ok: true });
});

module.exports = router;
