const express = require('express');
const { db } = require('../db');
const { recordPayment, recordKharcha, roznamchaPost, httpError } = require('../lib/stock-ops');
const router = express.Router();

// Mounted at /payments, /roznamcha and /kharcha — dispatched by baseUrl
function kind(req) {
  if (req.baseUrl.endsWith('/payments')) return 'payments';
  if (req.baseUrl.endsWith('/roznamcha')) return 'roznamcha';
  return 'kharcha';
}

function dateClause(req) {
  const { from, to } = req.query;
  return from && to ? 'AND date BETWEEN ? AND ?' : '';
}
function dateArgs(req) {
  const { from, to } = req.query;
  return from && to ? [from, to] : [];
}

router.get('/', (req, res) => {
  const k = kind(req);
  if (k === 'payments') {
    res.json(db.prepare(`SELECT * FROM payments WHERE is_deleted = 0 ${dateClause(req)} ORDER BY date DESC, id DESC`).all(...dateArgs(req)));
  } else if (k === 'roznamcha') {
    res.json(db.prepare(`SELECT * FROM roznamcha WHERE is_deleted = 0 ${dateClause(req)} ORDER BY date DESC, id DESC`).all(...dateArgs(req)));
  } else {
    res.json(db.prepare(`SELECT * FROM kharcha WHERE is_deleted = 0 ${dateClause(req)} ORDER BY date DESC, id DESC`).all(...dateArgs(req)));
  }
});

router.post('/', (req, res) => {
  const k = kind(req);
  const d = req.body;
  if (k === 'payments') {
    if (!d.party_name || !d.amount) throw httpError(400, 'Party and amount are required');
    const id = recordPayment({
      party_type: d.party_type || 'customer', party_id: d.party_id || null, party_name: d.party_name,
      direction: d.direction === 'out' ? 'out' : 'in', amount: Number(d.amount),
      date: d.date || new Date().toISOString().slice(0, 10),
      method: d.method || 'Cash', reference: d.reference || '',
    });
    return res.status(201).json({ id });
  }
  if (k === 'kharcha') {
    if (!d.amount) throw httpError(400, 'Amount is required');
    const id = recordKharcha({
      date: d.date || new Date().toISOString().slice(0, 10), category: d.category || '',
      description: d.description || '', amount: Number(d.amount), method: d.method || 'Cash',
    });
    return res.status(201).json({ id });
  }
  // Roznamcha manual entry (other_income / opening)
  if (!d.amount || !d.direction) throw httpError(400, 'Direction and amount are required');
  const info = db.prepare(`INSERT INTO roznamcha (date, direction, source, party, description, category, amount, method, reference)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(d.date || new Date().toISOString().slice(0, 10), d.direction === 'out' ? 'out' : 'in',
      d.source || 'other_income', d.party || '', d.description || '', d.category || '',
      Number(d.amount), d.method || 'Cash', d.reference || '');
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const k = kind(req);
  if (k !== 'roznamcha') throw httpError(400, 'Only roznamcha entries can be edited directly');
  const d = req.body;
  const row = db.prepare('SELECT * FROM roznamcha WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!row) throw httpError(404, 'Record not found');
  db.prepare(`UPDATE roznamcha SET date=?, direction=?, source=?, party=?, description=?, category=?, amount=?, method=?, reference=? WHERE id=?`)
    .run(d.date || row.date, d.direction === 'out' ? 'out' : 'in', d.source || row.source, d.party ?? row.party,
      d.description ?? row.description, d.category ?? row.category, Number(d.amount) || row.amount,
      d.method || row.method, d.reference ?? row.reference, row.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const k = kind(req);
  const t = k === 'payments' ? 'payments' : k === 'roznamcha' ? 'roznamcha' : 'kharcha';
  db.prepare(`UPDATE ${t} SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
