const express = require('express');
const { query } = require('../db');
const { recordPurchase, httpError } = require('../lib/stock-ops');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const conditions = ['p.is_deleted = 0'];
    const params = [];

    if (from && to) {
      params.push(from, to);
      conditions.push(
        `p.date BETWEEN $${params.length - 1} AND $${params.length}`
      );
    }

    const result = await query(
      `
      SELECT
        p.*,
        s.name AS supplier_name
      FROM purchases p
      JOIN suppliers s
        ON s.id = p.supplier_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.date DESC, p.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const d = req.body;

    if (!d.supplier_id || !d.item) {
      throw httpError(400, 'Supplier and item are required');
    }

    const id = await recordPurchase({
      supplier_id: d.supplier_id,
      item: d.item,
      category_slug: d.category_slug || 'uppers',
      article_code: d.article_code || '',
      pack_type: d.pack_type || '',
      pairs_per_pack: Number(d.pairs_per_pack) || 0,
      quantity: Number(d.quantity) || 0,
      unit_price: Number(d.unit_price) || 0,
      date: d.date || new Date().toISOString().slice(0, 10),
    });

    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `
      UPDATE purchases
      SET
        is_deleted = 1,
        deleted_date = NOW()
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
