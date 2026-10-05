const express = require('express');
const { db } = require('../db');
const router = express.Router();

// How many days of history the trend charts cover.
const TREND_DAYS = 14;

// Continuous list of the last N dates (so days with no activity plot as zero).
function trendDays() {
  const out = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const num = (sql) => db.prepare(sql).get().s || 0;
  const since = `-${TREND_DAYS - 1} days`;

  const cash = db.prepare("SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END), 0) AS s FROM roznamcha WHERE is_deleted = 0").get().s
    + (settings.opening_cash || 0);

  const receivables = db.prepare(`
    SELECT COALESCE(SUM(c.opening_balance), 0)
      + COALESCE((SELECT SUM(total) FROM invoices WHERE is_deleted = 0), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type='customer' AND direction='in' AND is_deleted = 0), 0) AS s
    FROM customers c WHERE c.is_deleted = 0`).get().s;

  const payables = db.prepare(`
    SELECT COALESCE(SUM(s.opening_balance), 0)
      + COALESCE((SELECT SUM(amount) FROM purchases WHERE is_deleted = 0), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type='supplier' AND direction='out' AND is_deleted = 0), 0) AS s
    FROM suppliers s WHERE s.is_deleted = 0`).get().s;

  const uppers = num("SELECT COALESCE(SUM(total_pairs), 0) AS s FROM raw_stock WHERE is_deleted = 0 AND category_slug = 'uppers'");
  const lowStock = uppers <= (settings.low_stock_threshold || 0);

  // ── Trend: sales + production per day across the window ────────────────
  const salesByDate = Object.fromEntries(
    db.prepare(`SELECT date, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total_pairs), 0) AS pairs, COUNT(*) AS count
                FROM invoices WHERE is_deleted = 0 AND date >= date('now', ?) GROUP BY date`).all(since)
      .map((r) => [r.date, r]));
  const prodByDate = Object.fromEntries(
    db.prepare(`SELECT date, COALESCE(SUM(output_pairs), 0) AS pairs, COALESCE(SUM(output_cartons), 0) AS cartons
                FROM production_entries WHERE is_deleted = 0 AND date >= date('now', ?) GROUP BY date`).all(since)
      .map((r) => [r.date, r]));

  const trend = trendDays().map((date) => ({
    date,
    label: date.slice(5),
    sales: salesByDate[date]?.total || 0,
    invoice_count: salesByDate[date]?.count || 0,
    pairs_sold: salesByDate[date]?.pairs || 0,
    produced: prodByDate[date]?.pairs || 0,
    cartons: prodByDate[date]?.cartons || 0,
  }));

  // ── Remaining stock across every category (raw + finished goods) ───────
  const cats = db.prepare('SELECT slug, name, unit_label, uses_pairs FROM raw_categories WHERE is_deleted = 0 ORDER BY sort_order, name').all();
  const rawAgg = Object.fromEntries(
    db.prepare(`SELECT category_slug AS slug, COUNT(*) AS lines, COALESCE(SUM(quantity), 0) AS quantity,
                       COALESCE(SUM(total_pairs), 0) AS pairs, COALESCE(SUM(amount), 0) AS value
                FROM raw_stock WHERE is_deleted = 0 GROUP BY category_slug`).all()
      .map((r) => [r.slug, r]));

  const stockByCategory = cats.map((c) => {
    const a = rawAgg[c.slug] || { lines: 0, quantity: 0, pairs: 0, value: 0 };
    const usesPairs = !!c.uses_pairs;
    return {
      slug: c.slug,
      name: c.name,
      uses_pairs: usesPairs,
      unit: usesPairs ? 'pairs' : (c.unit_label || 'units'),
      level: usesPairs ? a.pairs : a.quantity,
      pairs: a.pairs,
      quantity: a.quantity,
      value: a.value,
      lines: a.lines,
    };
  });

  const ready = db.prepare('SELECT COUNT(*) AS lines, COALESCE(SUM(pairs), 0) AS pairs FROM ready_shoes WHERE is_deleted = 0').get();
  stockByCategory.push({
    slug: 'ready-shoes', name: 'Ready Shoes', uses_pairs: true, unit: 'pairs',
    level: ready.pairs, pairs: ready.pairs, quantity: ready.pairs, value: 0, lines: ready.lines,
  });

  // ── Sales split by article ─────────────────────────────────────────────
  const salesByArticle = db.prepare(`
    SELECT a.code, a.name, COALESCE(SUM(il.pairs), 0) AS pairs, COALESCE(SUM(il.amount), 0) AS value
    FROM invoice_lines il
    JOIN invoices i ON i.id = il.invoice_id AND i.is_deleted = 0
    JOIN articles a ON a.id = il.article_id
    GROUP BY il.article_id ORDER BY value DESC`).all();

  const stockAlerts = db.prepare(`
    SELECT a.code, a.name, COALESCE(SUM(rs.pairs), 0) AS pairs FROM articles a
    LEFT JOIN ready_shoes rs ON rs.article_id = a.id AND rs.is_deleted = 0
    WHERE a.is_deleted = 0 GROUP BY a.id
    HAVING pairs < ? ORDER BY pairs LIMIT 6`).all(Math.max(settings.low_stock_threshold, 30));

  res.json({
    // money / KPIs
    cash,
    cash_in: num("SELECT COALESCE(SUM(amount), 0) AS s FROM roznamcha WHERE is_deleted = 0 AND direction = 'in'"),
    cash_out: num("SELECT COALESCE(SUM(amount), 0) AS s FROM roznamcha WHERE is_deleted = 0 AND direction = 'out'"),
    receivables,
    payables,
    sales_invoiced: num('SELECT COALESCE(SUM(total), 0) AS s FROM invoices WHERE is_deleted = 0'),
    invoice_count: num('SELECT COUNT(*) AS s FROM invoices WHERE is_deleted = 0'),
    kharcha_total: num('SELECT COALESCE(SUM(amount), 0) AS s FROM kharcha WHERE is_deleted = 0'),
    roznamcha_entries: num('SELECT COUNT(*) AS s FROM roznamcha WHERE is_deleted = 0'),
    stock_value: num('SELECT COALESCE(SUM(amount), 0) AS s FROM raw_stock WHERE is_deleted = 0'),

    // stock / production
    uppers_pairs: uppers,
    ready_pairs: ready.pairs,
    pairs_sold: num('SELECT COALESCE(SUM(total_pairs), 0) AS s FROM invoices WHERE is_deleted = 0'),
    production_pairs: num('SELECT COALESCE(SUM(output_pairs), 0) AS s FROM production_entries WHERE is_deleted = 0'),
    production_recent: trend.reduce((n, r) => n + r.produced, 0),
    low_stock: lowStock,

    // charts
    trend,
    trend_days: TREND_DAYS,
    stock_by_category: stockByCategory,
    sales_by_article: salesByArticle,
    stock_alerts: stockAlerts,
  });
});

module.exports = router;
