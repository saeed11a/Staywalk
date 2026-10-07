const express = require('express');
const { query } = require('../db');
const { pairsFromPack, httpError } = require('../lib/stock-ops');

// ----- Raw categories -----
const categories = express.Router();

categories.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM raw_categories
       WHERE is_deleted = 0
       ORDER BY sort_order, name`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

categories.post('/', async (req, res, next) => {
  try {
    const {
      name,
      slug,
      unit_label,
      uses_pairs,
      sort_order,
      fields
    } = req.body;

    if (!name || !slug) {
      throw httpError(400, 'Name and slug are required');
    }

    const result = await query(
      `INSERT INTO raw_categories
        (name, slug, unit_label, uses_pairs, sort_order, fields_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        name,
        slug,
        unit_label || 'unit',
        uses_pairs ? 1 : 0,
        sort_order || 0,
        JSON.stringify(fields || [])
      ]
    );

    res.status(201).json({
      id: result.rows[0].id
    });
  } catch (error) {
    next(error);
  }
});

categories.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `UPDATE raw_categories
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

// ----- Raw stock -----
const stock = express.Router();

stock.get('/', async (req, res, next) => {
  try {
    const slug = req.query.category;

    const filter = slug
      ? 'AND rs.category_slug = $1'
      : '';

    const params = slug
      ? [slug]
      : [];

    const result = await query(
      `SELECT
         rs.*,
         COALESCE(s.name, '') AS supplier_name
       FROM raw_stock rs
       LEFT JOIN suppliers s ON s.id = rs.supplier_id
       WHERE rs.is_deleted = 0
       ${filter}
       ORDER BY rs.date DESC, rs.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

stock.post('/', async (req, res, next) => {
  try {
    const d = req.body;

    if (!d.item || !d.category_slug) {
      throw httpError(400, 'Item and category are required');
    }

    const totalPairs = pairsFromPack(
      d.quantity,
      d.pairs_per_pack
    );

    const amount =
      (Number(d.quantity) || 0) *
      (Number(d.unit_price) || 0);

    const result = await query(
      `INSERT INTO raw_stock
        (
          category_slug,
          item,
          article_code,
          pack_type,
          pairs_per_pack,
          quantity,
          unit,
          total_pairs,
          unit_price,
          amount,
          supplier_id,
          date,
          custom_json
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        d.category_slug,
        d.item,
        d.article_code || '',
        d.pack_type || '',
        d.pairs_per_pack || 0,
        d.quantity || 0,
        d.unit || '',
        totalPairs,
        d.unit_price || 0,
        amount,
        d.supplier_id || null,
        d.date || null,
        JSON.stringify(d.custom || {})
      ]
    );

    res.status(201).json({
      id: result.rows[0].id
    });
  } catch (error) {
    next(error);
  }
});

stock.put('/:id', async (req, res, next) => {
  try {
    const d = req.body;

    const totalPairs = pairsFromPack(
      d.quantity,
      d.pairs_per_pack
    );

    const amount =
      (Number(d.quantity) || 0) *
      (Number(d.unit_price) || 0);

    await query(
      `UPDATE raw_stock
       SET item = $1,
           pack_type = $2,
           pairs_per_pack = $3,
           quantity = $4,
           unit = $5,
           total_pairs = $6,
           unit_price = $7,
           amount = $8,
           supplier_id = $9,
           date = $10,
           custom_json = $11
       WHERE id = $12`,
      [
        d.item,
        d.pack_type || '',
        d.pairs_per_pack || 0,
        d.quantity || 0,
        d.unit || '',
        totalPairs,
        d.unit_price || 0,
        amount,
        d.supplier_id || null,
        d.date || null,
        JSON.stringify(d.custom || {}),
        req.params.id
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

stock.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `UPDATE raw_stock
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

module.exports = { categories, stock };
