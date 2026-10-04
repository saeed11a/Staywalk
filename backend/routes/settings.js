const { db } = require('../db');
const router = require('express').Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM settings WHERE id = 1').get());
});

router.put('/', (req, res) => {
  const FIELDS = ['company_name', 'tagline', 'currency', 'address', 'phone', 'email', 'invoice_prefix',
    'low_stock_threshold', 'pairs_per_bag', 'pairs_per_carton', 'opening_cash',
    'bank_name', 'account_title', 'account_no', 'iban', 'footer_note'];
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (sets.length) {
    db.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = 1`).run(...values);
  }
  res.json(db.prepare('SELECT * FROM settings WHERE id = 1').get());
});

module.exports = router;
