const express = require('express');
const { db } = require('../db');
const { httpError } = require('../lib/stock-ops');
const router = express.Router();

// Handles both /customers and /suppliers (same shape)
function tableFor(path) {
  return path.includes('suppliers') ? 'suppliers' : 'customers';
}

router.get('/', (req, res) => {
  const t = tableFor(req.baseUrl);
  const rows = db.prepare(`SELECT * FROM ${t} WHERE is_deleted = 0 ORDER BY name`).all();
  const docs = t === 'customers'
    ? db.prepare('SELECT COUNT(*) AS c FROM invoices WHERE customer_id = ? AND is_deleted = 0')
    : db.prepare('SELECT COUNT(*) AS c FROM purchases WHERE supplier_id = ? AND is_deleted = 0');
  for (const row of rows) {
    row.balance = ledgerBalance(t, row);
    row.doc_count = docs.get(row.id).c;
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const t = tableFor(req.baseUrl);
  const { name, phone, address, city, product_details, opening_balance, status } = req.body;
  if (!name) throw httpError(400, 'Name is required');
  const info = db.prepare(`INSERT INTO ${t} (name, phone, address, city, product_details, opening_balance, status)
    VALUES (?,?,?,?,?,?,?)`)
    .run(name, phone || '', address || '', city || '', product_details || '', opening_balance || 0, status || 'active');
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const t = tableFor(req.baseUrl);
  const row = db.prepare(`SELECT * FROM ${t} WHERE id = ? AND is_deleted = 0`).get(req.params.id);
  if (!row) throw httpError(404, 'Record not found');
  const { name, phone, address, city, product_details, opening_balance, status } = req.body;
  db.prepare(`UPDATE ${t} SET name=?, phone=?, address=?, city=?, product_details=?, opening_balance=?, status=? WHERE id=?`)
    .run(name || row.name, phone ?? row.phone, address ?? row.address, city ?? row.city,
      product_details ?? row.product_details, opening_balance ?? row.opening_balance, status || row.status, row.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const t = tableFor(req.baseUrl);
  db.prepare(`UPDATE ${t} SET is_deleted = 1, deleted_date = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// Party ledger: opening balance + transactions + running balance
function ledgerBalance(t, row) {
  const debit = t === 'customers'
    ? db.prepare('SELECT COALESCE(SUM(total), 0) AS s FROM invoices WHERE customer_id = ? AND is_deleted = 0').get(row.id).s
    : db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM purchases WHERE supplier_id = ? AND is_deleted = 0').get(row.id).s;
  const credit = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE party_type = ? AND party_id = ? AND direction = ? AND is_deleted = 0`)
    .get(t === 'customers' ? 'customer' : 'supplier', row.id, t === 'customers' ? 'in' : 'out').s;
  return (row.opening_balance || 0) + debit - credit;
}

router.get('/:id/ledger', (req, res) => {
  const t = tableFor(req.baseUrl);
  const row = db.prepare(`SELECT * FROM ${t} WHERE id = ? AND is_deleted = 0`).get(req.params.id);
  if (!row) throw httpError(404, 'Record not found');
  const isCustomer = t === 'customers';
  const txns = [];
  if (isCustomer) {
    for (const inv of db.prepare('SELECT * FROM invoices WHERE customer_id = ? AND is_deleted = 0 ORDER BY date, id').all(row.id)) {
      txns.push({ date: inv.date, description: `Invoice ${inv.invoice_no}`, debit: inv.total, credit: 0, ref: inv.invoice_no });
    }
  } else {
    for (const p of db.prepare('SELECT * FROM purchases WHERE supplier_id = ? AND is_deleted = 0 ORDER BY date, id').all(row.id)) {
      txns.push({ date: p.date, description: `Purchase — ${p.item}`, debit: p.amount, credit: 0 });
    }
  }
  const partyType = isCustomer ? 'customer' : 'supplier';
  const dir = isCustomer ? 'in' : 'out';
  for (const p of db.prepare(`SELECT * FROM payments WHERE party_type = ? AND party_id = ? AND direction = ? AND is_deleted = 0 ORDER BY date, id`).all(partyType, row.id, dir)) {
    txns.push({ date: p.date, description: `Payment (${p.method})`, debit: 0, credit: p.amount, ref: p.reference });
  }
  txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let running = row.opening_balance || 0;
  const lines = txns.map((x) => {
    running += x.debit - x.credit;
    return { ...x, balance: running };
  });
  res.json({ party: row, opening_balance: row.opening_balance || 0, balance: running, lines });
});

module.exports = router;
