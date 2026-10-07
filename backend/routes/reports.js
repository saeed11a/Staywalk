const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Stock report: raw stock by category + a per-article stock/production/sales roll-up
router.get('/stock', async (req, res, next) => {
  try {
    const [
      uppersPairsResult,
      readyPairsResult,
      pairsSoldResult,
      salesValueResult,
      byCategoryResult,
      byArticleResult
    ] = await Promise.all([
      query(`
        SELECT COALESCE(SUM(total_pairs), 0) AS s
        FROM raw_stock
        WHERE is_deleted = 0
          AND category_slug = 'uppers'
      `),

      query(`
        SELECT COALESCE(SUM(pairs), 0) AS s
        FROM ready_shoes
        WHERE is_deleted = 0
      `),

      query(`
        SELECT COALESCE(SUM(total_pairs), 0) AS s
        FROM invoices
        WHERE is_deleted = 0
      `),

      query(`
        SELECT COALESCE(SUM(total), 0) AS s
        FROM invoices
        WHERE is_deleted = 0
      `),

      query(`
        SELECT
          category_slug AS category,
          COUNT(*) AS lines,
          COALESCE(SUM(quantity), 0) AS quantity,
          COALESCE(SUM(total_pairs), 0) AS pairs,
          COALESCE(SUM(amount), 0) AS value
        FROM raw_stock
        WHERE is_deleted = 0
        GROUP BY category_slug
        ORDER BY category_slug
      `),

      query(`
        SELECT
          a.code,
          a.name,

          (
            SELECT COALESCE(SUM(rs.quantity), 0)
            FROM raw_stock rs
            WHERE rs.is_deleted = 0
              AND rs.category_slug = 'uppers'
              AND rs.article_code = a.code
          ) AS uppers_bags,

          (
            SELECT COALESCE(SUM(rs.total_pairs), 0)
            FROM raw_stock rs
            WHERE rs.is_deleted = 0
              AND rs.category_slug = 'uppers'
              AND rs.article_code = a.code
          ) AS uppers_pairs,

          (
            SELECT COALESCE(SUM(pe.uppers_used), 0)
            FROM production_entries pe
            WHERE pe.is_deleted = 0
              AND pe.article_id = a.id
          ) AS uppers_used,

          (
            SELECT COALESCE(SUM(pe.output_pairs), 0)
            FROM production_entries pe
            WHERE pe.is_deleted = 0
              AND pe.article_id = a.id
          ) AS produced,

          (
            SELECT COALESCE(SUM(il.pairs), 0)
            FROM invoice_lines il
            JOIN invoices i ON i.id = il.invoice_id
            WHERE i.is_deleted = 0
              AND il.article_id = a.id
          ) AS sold,

          (
            SELECT COALESCE(SUM(r.pairs), 0)
            FROM ready_shoes r
            WHERE r.is_deleted = 0
              AND r.article_id = a.id
          ) AS ready,

          (
            SELECT COALESCE(SUM(il.amount), 0)
            FROM invoice_lines il
            JOIN invoices i ON i.id = il.invoice_id
            WHERE i.is_deleted = 0
              AND il.article_id = a.id
          ) AS value

        FROM articles a
        WHERE a.is_deleted = 0
        ORDER BY a.code
      `)
    ]);

    const totals = {
      uppers_pairs: Number(uppersPairsResult.rows[0]?.s || 0),
      ready_pairs: Number(readyPairsResult.rows[0]?.s || 0),
      pairs_sold: Number(pairsSoldResult.rows[0]?.s || 0),
      sales_value: Number(salesValueResult.rows[0]?.s || 0)
    };

    res.json({
      totals,
      byCategory: byCategoryResult.rows,
      byArticle: byArticleResult.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
