const { query } = require('../db');
const router = require('express').Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM settings WHERE id = 1'
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const FIELDS = [
      'company_name',
      'tagline',
      'currency',
      'address',
      'phone',
      'email',
      'invoice_prefix',
      'low_stock_threshold',
      'pairs_per_bag',
      'pairs_per_carton',
      'opening_cash',
      'bank_name',
      'account_title',
      'account_no',
      'iban',
      'footer_note'
    ];

    const sets = [];
    const values = [];

    for (const f of FIELDS) {
      if (req.body[f] !== undefined) {
        values.push(req.body[f]);
        sets.push(`${f} = $${values.length}`);
      }
    }

    if (sets.length) {
      await query(
        `UPDATE settings
         SET ${sets.join(', ')}
         WHERE id = 1`,
        values
      );
    }

    const result = await query(
      'SELECT * FROM settings WHERE id = 1'
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
