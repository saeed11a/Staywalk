const express = require('express');
const { query } = require('../db');
const { recordProduction, httpError } = require('../lib/stock-ops');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const conditions = ['pe.is_deleted = 0'];
    const params = [];

    if (from && to) {
      params.push(from, to);
      conditions.push(
        `pe.date BETWEEN $${params.length - 1} AND $${params.length}`
      );
    }

    const result = await query(
      `
      SELECT
        pe.*,
        a.code AS article_code,
        a.name AS article_name
      FROM production_entries pe
      JOIN articles a
        ON a.id = pe.article_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pe.date DESC, pe.id DESC
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

    if (!d.article_id) {
      throw httpError(400, 'Article is required');
    }

    const id = await recordProduction({
      article_id: d.article_id,
      date: d.date || new Date().toISOString().slice(0, 10),
      line: d.line || '',
      shift: d.shift || '',
      operator: d.operator || '',
      input_bags: Number(d.input_bags) || 0,
      pairs_per_bag: Number(d.pairs_per_bag) || 0,
      carton_type: d.carton_type || '',
      pairs_per_carton: Number(d.pairs_per_carton) || 0,
      output_cartons: Number(d.output_cartons) || 0,
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
      UPDATE production_entries
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
