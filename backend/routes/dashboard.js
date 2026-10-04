const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const stats = {
    pending_orders: db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status IN ('pending','confirmed')").get().c,
    in_production: db.prepare("SELECT COUNT(*) AS c FROM production WHERE status IN ('queued','in_progress')").get().c,
    revenue_this_month: db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')"
    ).get().s,
    outstanding: db.prepare(`
      SELECT COALESCE(SUM(
        (SELECT COALESCE(SUM(qty * unit_price), 0) FROM order_items WHERE order_id = i.order_id)
        - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id)
      ), 0) AS s
      FROM invoices i`).get().s,
  };
  const low_stock = db.prepare('SELECT * FROM materials WHERE quantity <= reorder_level ORDER BY quantity').all();
  const recent_orders = db.prepare(`
    SELECT o.id, o.order_date, o.status, c.name AS customer_name,
      COALESCE((SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id), 0) AS total
    FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id DESC LIMIT 5`).all();
  const active_production = db.prepare(`
    SELECT pr.id, pr.qty, pr.status, pr.due_date, p.name AS product_name, e.name AS employee_name
    FROM production pr JOIN products p ON p.id = pr.product_id
    LEFT JOIN employees e ON e.id = pr.assigned_to
    WHERE pr.status IN ('queued','in_progress') ORDER BY pr.due_date LIMIT 6`).all();
  res.json({ ...stats, low_stock, recent_orders, active_production });
});

module.exports = router;
