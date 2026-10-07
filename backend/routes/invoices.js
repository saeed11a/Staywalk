const express = require('express');
const { query } = require('../db');
const { createInvoice, httpError } = require('../lib/stock-ops');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const range = from && to
      ? 'AND i.date BETWEEN $1 AND $2'
      : '';

    const rangeArgs = from && to
      ? [from, to]
      : [];

    // Item-level detail — one row per invoice line (used by the Sales report)
    if (req.query.items) {
      const result = await query(
        `
        SELECT
          i.invoice_no,
          i.date,
          i.customer_id,
          c.name AS customer_name,
          i.status,
          a.code AS article_code,
          a.name AS article_name,
          il.carton_type,
          il.pairs_per_carton,
          il.cartons,
          il.pairs,
          il.rate,
          il.amount
        FROM invoice_lines il
        JOIN invoices i ON i.id = il.invoice_id
        JOIN customers c ON c.id = i.customer_id
        JOIN articles a ON a.id = il.article_id
        WHERE i.is_deleted = 0
        ${range}
        ORDER BY i.date DESC, i.id DESC
        `,
        rangeArgs
      );

      return res.json(result.rows);
    }

    const result = await query(
      `
      SELECT
        i.*,
        c.name AS customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.is_deleted = 0
      ${range}
      ORDER BY i.date DESC, i.id DESC
      `,
      rangeArgs
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const invoiceResult = await query(
      `
      SELECT
        i.*,
        c.name AS customer_name,
        c.address AS customer_address,
        c.city AS customer_city,
        c.phone AS customer_phone
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1
        AND i.is_deleted = 0
      `,
      [req.params.id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      throw httpError(404, 'Invoice not found');
    }

    const linesResult = await query(
      `
      SELECT
        il.*,
        a.code AS article_code,
        a.name AS article_name
      FROM invoice_lines il
      JOIN articles a ON a.id = il.article_id
      WHERE il.invoice_id = $1
      `,
      [invoice.id]
    );

    invoice.lines = linesResult.rows;

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      customer_id,
      date,
      lines,
      discount,
      received,
      payment_method,
      notes
    } = req.body;

    if (!customer_id) {
      throw httpError(400, 'Customer is required');
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, 'At least one line is required');
    }

    const result = await createInvoice({
      customer_id,
      date: date || new Date().toISOString().slice(0, 10),
      lines,
      discount,
      received,
      payment_method,
      notes
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `
      UPDATE invoices
      SET is_deleted = 1,
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
