const express = require('express');
const { query } = require('../db');

const router = express.Router();

// How many days of history the trend charts cover.
const TREND_DAYS = 14;

// Continuous list of the last N dates
// so days with no activity plot as zero.
function trendDays() {
  const out = [];

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    out.push(
      new Date(Date.now() - i * 86400000)
        .toISOString()
        .slice(0, 10)
    );
  }

  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const settingsResult = await query(
      'SELECT * FROM settings WHERE id = 1'
    );

    const settings = settingsResult.rows[0] || {};

    const sinceDate = new Date(
      Date.now() - (TREND_DAYS - 1) * 86400000
    )
      .toISOString()
      .slice(0, 10);

    // ── Money / KPIs ────────────────────────────────────────────────

    const cashResult = await query(`
      SELECT COALESCE(
        SUM(
          CASE
            WHEN direction = 'in' THEN amount
            ELSE -amount
          END
        ),
        0
      ) AS s
      FROM roznamcha
      WHERE is_deleted = 0
    `);

    const receivablesResult = await query(`
      SELECT
        COALESCE(SUM(c.opening_balance), 0)
        +
        COALESCE(
          (
            SELECT SUM(total)
            FROM invoices
            WHERE is_deleted = 0
          ),
          0
        )
        -
        COALESCE(
          (
            SELECT SUM(amount)
            FROM payments
            WHERE party_type = 'customer'
              AND direction = 'in'
              AND is_deleted = 0
          ),
          0
        ) AS s
      FROM customers c
      WHERE c.is_deleted = 0
    `);

    const payablesResult = await query(`
      SELECT
        COALESCE(SUM(s.opening_balance), 0)
        +
        COALESCE(
          (
            SELECT SUM(amount)
            FROM purchases
            WHERE is_deleted = 0
          ),
          0
        )
        -
        COALESCE(
          (
            SELECT SUM(amount)
            FROM payments
            WHERE party_type = 'supplier'
              AND direction = 'out'
              AND is_deleted = 0
          ),
          0
        ) AS s
      FROM suppliers s
      WHERE s.is_deleted = 0
    `);

    const uppersResult = await query(`
      SELECT COALESCE(SUM(total_pairs), 0) AS s
      FROM raw_stock
      WHERE is_deleted = 0
        AND category_slug = 'uppers'
    `);

    const cashInResult = await query(`
      SELECT COALESCE(SUM(amount), 0) AS s
      FROM roznamcha
      WHERE is_deleted = 0
        AND direction = 'in'
    `);

    const cashOutResult = await query(`
      SELECT COALESCE(SUM(amount), 0) AS s
      FROM roznamcha
      WHERE is_deleted = 0
        AND direction = 'out'
    `);

    const salesInvoicedResult = await query(`
      SELECT COALESCE(SUM(total), 0) AS s
      FROM invoices
      WHERE is_deleted = 0
    `);

    const invoiceCountResult = await query(`
      SELECT COUNT(*) AS s
      FROM invoices
      WHERE is_deleted = 0
    `);

    const kharchaResult = await query(`
      SELECT COALESCE(SUM(amount), 0) AS s
      FROM kharcha
      WHERE is_deleted = 0
    `);

    const roznamchaEntriesResult = await query(`
      SELECT COUNT(*) AS s
      FROM roznamcha
      WHERE is_deleted = 0
    `);

    const stockValueResult = await query(`
      SELECT COALESCE(SUM(amount), 0) AS s
      FROM raw_stock
      WHERE is_deleted = 0
    `);

    const pairsSoldResult = await query(`
      SELECT COALESCE(SUM(total_pairs), 0) AS s
      FROM invoices
      WHERE is_deleted = 0
    `);

    const productionPairsResult = await query(`
      SELECT COALESCE(SUM(output_pairs), 0) AS s
      FROM production_entries
      WHERE is_deleted = 0
    `);

    const cash =
      Number(cashResult.rows[0]?.s || 0)
      + Number(settings.opening_cash || 0);

    const receivables =
      Number(receivablesResult.rows[0]?.s || 0);

    const payables =
      Number(payablesResult.rows[0]?.s || 0);

    const uppers =
      Number(uppersResult.rows[0]?.s || 0);

    const lowStock =
      uppers <= Number(settings.low_stock_threshold || 0);

    // ── Trend: sales + production per day ──────────────────────────

    const salesResult = await query(
      `
      SELECT
        date,
        COALESCE(SUM(total), 0) AS total,
        COALESCE(SUM(total_pairs), 0) AS pairs,
        COUNT(*) AS count
      FROM invoices
      WHERE is_deleted = 0
        AND date >= $1
      GROUP BY date
      `,
      [sinceDate]
    );

    const prodResult = await query(
      `
      SELECT
        date,
        COALESCE(SUM(output_pairs), 0) AS pairs,
        COALESCE(SUM(output_cartons), 0) AS cartons
      FROM production_entries
      WHERE is_deleted = 0
        AND date >= $1
      GROUP BY date
      `,
      [sinceDate]
    );

    const salesByDate = Object.fromEntries(
      salesResult.rows.map((r) => [
        String(r.date).slice(0, 10),
        r
      ])
    );

    const prodByDate = Object.fromEntries(
      prodResult.rows.map((r) => [
        String(r.date).slice(0, 10),
        r
      ])
    );

    const trend = trendDays().map((date) => ({
      date,
      label: date.slice(5),
      sales: Number(
        salesByDate[date]?.total || 0
      ),
      invoice_count: Number(
        salesByDate[date]?.count || 0
      ),
      pairs_sold: Number(
        salesByDate[date]?.pairs || 0
      ),
      produced: Number(
        prodByDate[date]?.pairs || 0
      ),
      cartons: Number(
        prodByDate[date]?.cartons || 0
      )
    }));

    // ── Remaining stock across every category ─────────────────────

    const catsResult = await query(`
      SELECT
        slug,
        name,
        unit_label,
        uses_pairs
      FROM raw_categories
      WHERE is_deleted = 0
      ORDER BY sort_order, name
    `);

    const rawAggResult = await query(`
      SELECT
        category_slug AS slug,
        COUNT(*) AS lines,
        COALESCE(SUM(quantity), 0) AS quantity,
        COALESCE(SUM(total_pairs), 0) AS pairs,
        COALESCE(SUM(amount), 0) AS value
      FROM raw_stock
      WHERE is_deleted = 0
      GROUP BY category_slug
    `);

    const rawAgg = Object.fromEntries(
      rawAggResult.rows.map((r) => [
        r.slug,
        r
      ])
    );

    const stockByCategory = catsResult.rows.map((c) => {
      const a = rawAgg[c.slug] || {
        lines: 0,
        quantity: 0,
        pairs: 0,
        value: 0
      };

      const usesPairs =
        c.uses_pairs === true ||
        c.uses_pairs === 1 ||
        c.uses_pairs === '1';

      return {
        slug: c.slug,
        name: c.name,
        uses_pairs: usesPairs,
        unit: usesPairs
          ? 'pairs'
          : (c.unit_label || 'units'),
        level: usesPairs
          ? Number(a.pairs || 0)
          : Number(a.quantity || 0),
        pairs: Number(a.pairs || 0),
        quantity: Number(a.quantity || 0),
        value: Number(a.value || 0),
        lines: Number(a.lines || 0)
      };
    });

    const readyResult = await query(`
      SELECT
        COUNT(*) AS lines,
        COALESCE(SUM(pairs), 0) AS pairs
      FROM ready_shoes
      WHERE is_deleted = 0
    `);

    const readyPairs =
      Number(readyResult.rows[0]?.pairs || 0);

    const readyLines =
      Number(readyResult.rows[0]?.lines || 0);

    stockByCategory.push({
      slug: 'ready-shoes',
      name: 'Ready Shoes',
      uses_pairs: true,
      unit: 'pairs',
      level: readyPairs,
      pairs: readyPairs,
      quantity: readyPairs,
      value: 0,
      lines: readyLines
    });

    // ── Sales split by article ─────────────────────────────────────

    const salesByArticleResult = await query(`
      SELECT
        a.code,
        a.name,
        COALESCE(SUM(il.pairs), 0) AS pairs,
        COALESCE(SUM(il.amount), 0) AS value
      FROM invoice_lines il
      JOIN invoices i
        ON i.id = il.invoice_id
       AND i.is_deleted = 0
      JOIN articles a
        ON a.id = il.article_id
      GROUP BY il.article_id, a.code, a.name
      ORDER BY value DESC
    `);

    const salesByArticle =
      salesByArticleResult.rows;

    // ── Low-stock article alerts ──────────────────────────────────

    const threshold = Math.max(
      Number(settings.low_stock_threshold || 0),
      30
    );

    const stockAlertsResult = await query(
      `
      SELECT
        a.code,
        a.name,
        COALESCE(SUM(rs.pairs), 0) AS pairs
      FROM articles a
      LEFT JOIN ready_shoes rs
        ON rs.article_id = a.id
       AND rs.is_deleted = 0
      WHERE a.is_deleted = 0
      GROUP BY a.id, a.code, a.name
      HAVING COALESCE(SUM(rs.pairs), 0) < $1
      ORDER BY pairs
      LIMIT 6
      `,
      [threshold]
    );

    const stockAlerts =
      stockAlertsResult.rows;

    const productionRecent = trend.reduce(
      (n, r) => n + Number(r.produced || 0),
      0
    );

    res.json({
      // money / KPIs
      cash,
      cash_in: Number(
        cashInResult.rows[0]?.s || 0
      ),
      cash_out: Number(
        cashOutResult.rows[0]?.s || 0
      ),
      receivables,
      payables,
      sales_invoiced: Number(
        salesInvoicedResult.rows[0]?.s || 0
      ),
      invoice_count: Number(
        invoiceCountResult.rows[0]?.s || 0
      ),
      kharcha_total: Number(
        kharchaResult.rows[0]?.s || 0
      ),
      roznamcha_entries: Number(
        roznamchaEntriesResult.rows[0]?.s || 0
      ),
      stock_value: Number(
        stockValueResult.rows[0]?.s || 0
      ),

      // stock / production
      uppers_pairs: uppers,
      ready_pairs: readyPairs,
      pairs_sold: Number(
        pairsSoldResult.rows[0]?.s || 0
      ),
      production_pairs: Number(
        productionPairsResult.rows[0]?.s || 0
      ),
      production_recent: productionRecent,
      low_stock: lowStock,

      // charts
      trend,
      trend_days: TREND_DAYS,
      stock_by_category: stockByCategory,
      sales_by_article: salesByArticle,
      stock_alerts: stockAlerts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
