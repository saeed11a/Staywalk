const express = require('express');
const { query } = require('../db');
const { httpError } = require('../lib/stock-ops');

const router = express.Router();

async function nextCode() {
  const result = await query(
    'SELECT code FROM articles ORDER BY id DESC LIMIT 1'
  );

  const row = result.rows[0];

  const last = row
    ? (parseInt(String(row.code).replace(/\D/g, ''), 10) || 0)
    : 0;

  return 'HSF-' + String(last + 1).padStart(3, '0');
}

// Articles with live stock and sales figures derived from the other modules
const LIST_SQL = `
  SELECT a.*,
    (SELECT COALESCE(SUM(rs.quantity), 0) FROM raw_stock rs
      WHERE rs.is_deleted = 0
        AND rs.category_slug = 'uppers'
        AND rs.article_code = a.code) AS uppers_bags,

    (SELECT COALESCE(SUM(rs.total_pairs), 0) FROM raw_stock rs
      WHERE rs.is_deleted = 0
        AND rs.category_slug = 'uppers'
        AND rs.article_code = a.code) AS uppers_pairs,

    (SELECT COALESCE(SUM(r.pairs), 0) FROM ready_shoes r
      WHERE r.is_deleted = 0
        AND r.article_id = a.id) AS ready_pairs,

    (SELECT COALESCE(SUM(il.pairs), 0)
      FROM invoice_lines il
      JOIN invoices i ON i.id = il.invoice_id
      WHERE i.is_deleted = 0
        AND il.article_id = a.id) AS sold,

    (SELECT COALESCE(SUM(il.amount), 0)
      FROM invoice_lines il
      JOIN invoices i ON i.id = il.invoice_id
      WHERE i.is_deleted = 0
        AND il.article_id = a.id) AS sales_value

  FROM articles a
  WHERE a.is_deleted = 0
  ORDER BY a.code
`;

router.get('/', async (req, res, next) => {
  try {
    const result = await query(LIST_SQL);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      category,
      sizes,
      colors,
      upper_type,
      sole_type,
      cost_price,
      selling_price,
      status
    } = req.body;

    if (!name) {
      throw httpError(400, 'Name is required');
    }

    const code = req.body.code || await nextCode();

    const result = await query(
      `INSERT INTO articles
        (
          code,
          name,
          category,
          sizes,
          colors,
          upper_type,
          sole_type,
          cost_price,
          selling_price,
          status
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        code,
        name,
        category || '',
        sizes || '',
        colors || '',
        upper_type || '',
        sole_type || '',
        Number(cost_price) || 0,
        Number(selling_price) || 0,
        status || 'active'
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      code
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM articles
       WHERE id = $1
         AND is_deleted = 0`,
      [req.params.id]
    );

    const a = result.rows[0];

    if (!a) {
      throw httpError(404, 'Article not found');
    }

    const {
      name,
      category,
      sizes,
      colors,
      upper_type,
      sole_type,
      cost_price,
      selling_price,
      status
    } = req.body;

    await query(
      `UPDATE articles
       SET name = $1,
           category = $2,
           sizes = $3,
           colors = $4,
           upper_type = $5,
           sole_type = $6,
           cost_price = $7,
           selling_price = $8,
           status = $9
       WHERE id = $10`,
      [
        name || a.name,
        category ?? a.category,
        sizes ?? a.sizes,
        colors ?? a.colors,
        upper_type ?? a.upper_type,
        sole_type ?? a.sole_type,
        cost_price ?? a.cost_price,
        selling_price ?? a.selling_price,
        status || a.status,
        a.id
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `UPDATE articles
       SET is_deleted = 1,
           deleted_date = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
