const express = require('express');
const { query } = require('../db');
const { pairsFromCartons, httpError } = require('../lib/stock-ops');

const router = express.Router();

// Live balance per article
router.get('/', async (req, res, next) => {
  try {
    const stockResult = await query(`
      SELECT
        a.id AS article_id,
        a.code,
        a.name,
        COALESCE(SUM(rs.cartons), 0) AS cartons,
        COALESCE(SUM(rs.pairs), 0) AS pairs
      FROM articles a
      LEFT JOIN ready_shoes rs
        ON rs.article_id = a.id
        AND rs.is_deleted = 0
      WHERE a.is_deleted = 0
      GROUP BY a.id, a.code, a.name
      ORDER BY a.code
    `);

    const movementsResult = await query(`
      SELECT
        rs.*,
        a.code AS article_code,
        a.name AS article_name
      FROM ready_shoes rs
      JOIN articles a
        ON a.id = rs.article_id
      WHERE rs.is_deleted = 0
      ORDER BY rs.date DESC, rs.id DESC
      LIMIT 200
    `);

    res.json({
      stock: stockResult.rows,
      movements: movementsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const d = req.body;

    if (!d.article_id) {
      throw httpError(400, 'Article is required');
    }

    const pairs = pairsFromCartons(
      d.cartons,
      d.pairs_per_carton
    );

    const result = await query(
      `
      INSERT INTO ready_shoes
        (
          article_id,
          carton_type,
          pairs_per_carton,
          cartons,
          pairs,
          source,
          date
        )
      VALUES
        ($1, $2, $3, $4, $5, 'manual', $6)
      RETURNING id
      `,
      [
        d.article_id,
        d.carton_type || '',
        Number(d.pairs_per_carton) || 0,
        Number(d.cartons) || 0,
        pairs,
        d.date || null
      ]
    );

    res.status(201).json({
      id: result.rows[0].id
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `
      UPDATE ready_shoes
      SET
        is_deleted = 1,
        deleted_date = NOW()
      WHERE id = $1
        AND source = 'manual'
      `,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
