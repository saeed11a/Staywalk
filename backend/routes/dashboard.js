const express = require('express');
const { db } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const num = (sql, ...args) => one(sql, ...args).s || 0;

  const cashIn = num("SELECT COALESCE(SUM(amount), 0) AS s FROM roznamcha WHERE is_deleted = 0 AND direction = 'in'");
  const cashOut = num("SELECT COALESCE(SUM(amount), 0) AS s FROM roznamcha WHERE is_deleted = 0 AND direction = 'out'");
  const cash = cashIn - cashOut + (settings.opening_cash || 0);

  const receivables = one(`
    SELECT COALESCE(SUM(c.opening_balance), 0)
      + COALESCE((SELECT SUM(total) FROM invoices WHERE is_deleted = 0), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type='customer' AND direction='in' AND is_deleted = 0), 0) AS s
    FROM customers c WHERE c.is_deleted = 0`).s;
  const payables = one(`
    SELECT COALESCE(SUM(s.opening_balance), 0)
      + COALESCE((SELECT SUM(amount) FROM purchases WHERE is_deleted = 0), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type='supplier' AND direction='out' AND is_deleted = 0), 0) AS s
    FROM suppliers s WHERE s.is_deleted = 0`).s;

  const readyPairs = num('SELECT COALESCE(SUM(pairs), 0) AS s FROM ready_shoes WHERE is_deleted = 0');
  const uppers = num("SELECT COALESCE(SUM(total_pairs), 0) AS s FROM raw_stock WHERE is_deleted = 0 AND category_slug = 'uppers'");
  const lowStock = uppers <= (settings.low_stock_threshold || 0);

  const sales = one('SELECT COALESCE(SUM(total), 0) AS invoiced, COUNT(*) AS count FROM invoices WHERE is_deleted = 0');
  const pairsSold = num('SELECT COALESCE(SUM(total_pairs), 0) AS s FROM invoices WHERE is_deleted = 0');
  const kharchaTotal = num('SELECT COALESCE(SUM(amount), 0) AS s FROM kharcha WHERE is_deleted = 0');
  const roznamchaEntries = one('SELECT COUNT(*) AS c FROM roznamcha WHERE is_deleted = 0').c;

  const salesChart = db.prepare(`
    SELECT date, COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM invoices
    WHERE is_deleted = 0 AND date >= date('now', '-13 days')
    GROUP BY date ORDER BY date`).all();

  const stockAlerts = db.prepare(`
    SELECT a.code, a.name, COALESCE(SUM(rs.pairs), 0) AS pairs FROM articles a
    LEFT JOIN ready_shoes rs ON rs.article_id = a.id AND rs.is_deleted = 0
    WHERE a.is_deleted = 0 GROUP BY a.id
    HAVING pairs < ? ORDER BY pairs LIMIT 6`).all(Math.max(settings.low_stock_threshold, 30));

  res.json({
    cash, cash_in: cashIn, cash_out: cashOut,
    opening_cash: settings.opening_cash || 0,
    receivables, payables,
    ready_pairs: readyPairs, uppers_pairs: uppers, low_stock: lowStock,
    sales_invoiced: sales.invoiced, invoice_count: sales.count,
    pairs_sold: pairsSold, sales_value: sales.invoiced,
    kharcha_total: kharchaTotal, roznamcha_entries: roznamchaEntries,
    sales_chart: salesChart, stock_alerts: stockAlerts,
  });
});

module.exports = router;
