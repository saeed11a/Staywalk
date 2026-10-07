const express = require('express');
const { query } = require('../db');
const { httpError } = require('../lib/stock-ops');

const router = express.Router();

// Handles both /customers and /suppliers (same shape)
function tableFor(path) {
  return path.includes('suppliers') ? 'suppliers' : 'customers';
}

router.get('/', async (req, res, next) => {
  try {
    const t = tableFor(req.baseUrl);
    const isCustomer = t === 'customers';

    const rowsResult = await query(
      `SELECT * FROM ${t}
       WHERE is_deleted = 0
       ORDER BY name`
    );

    const rows = rowsResult.rows;

    for (const row of rows) {
      const { debit, credit } = await ledgerTotals(t, row);

      row.debit_total = debit;
      row.credit_total = credit;
      row.balance =
        Number(row.opening_balance || 0) + debit - credit;

      const docsResult = await query(
        isCustomer
          ? `SELECT COUNT(*) AS c
             FROM invoices
             WHERE customer_id = $1
               AND is_deleted = 0`
          : `SELECT COUNT(*) AS c
             FROM purchases
             WHERE supplier_id = $1
               AND is_deleted = 0`,
        [row.id]
      );

      row.doc_count = Number(docsResult.rows[0]?.c || 0);

      const debitResult = await query(
        isCustomer
          ? `SELECT
               'Invoice ' || invoice_no AS label,
               total AS amount,
               date
             FROM invoices
             WHERE customer_id = $1
               AND is_deleted = 0
             ORDER BY date DESC, id DESC
             LIMIT 1`
          : `SELECT
               'Purchase — ' || item AS label,
               amount,
               date
             FROM purchases
             WHERE supplier_id = $1
               AND is_deleted = 0
             ORDER BY date DESC, id DESC
             LIMIT 1`,
        [row.id]
      );

      const partyType = isCustomer ? 'customer' : 'supplier';
      const dir = isCustomer ? 'in' : 'out';

      const creditResult = await query(
        `SELECT
           'Payment (' || method || ')' AS label,
           amount,
           date
         FROM payments
         WHERE party_type = $1
           AND party_id = $2
           AND direction = $3
           AND is_deleted = 0
         ORDER BY date DESC, id DESC
         LIMIT 1`,
        [partyType, row.id, dir]
      );

      const d = debitResult.rows[0];
      const c = creditResult.rows[0];

      row.last_transaction =
        [d, c]
          .filter(Boolean)
          .sort((a, b) =>
            a.date < b.date ? 1 : -1
          )[0] || null;
    }

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const t = tableFor(req.baseUrl);

    const {
      name,
      phone,
      address,
      city,
      product_details,
      opening_balance,
      status
    } = req.body;

    if (!name) {
      throw httpError(400, 'Name is required');
    }

    const result = await query(
      `INSERT INTO ${t}
        (
          name,
          phone,
          address,
          city,
          product_details,
          opening_balance,
          status
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        name,
        phone || '',
        address || '',
        city || '',
        product_details || '',
        opening_balance || 0,
        status || 'active'
      ]
    );

    res.status(201).json({
      id: result.rows[0].id
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const t = tableFor(req.baseUrl);

    const result = await query(
      `SELECT * FROM ${t}
       WHERE id = $1
         AND is_deleted = 0`,
      [req.params.id]
    );

    const row = result.rows[0];

    if (!row) {
      throw httpError(404, 'Record not found');
    }

    const {
      name,
      phone,
      address,
      city,
      product_details,
      opening_balance,
      status
    } = req.body;

    await query(
      `UPDATE ${t}
       SET name = $1,
           phone = $2,
           address = $3,
           city = $4,
           product_details = $5,
           opening_balance = $6,
           status = $7
       WHERE id = $8`,
      [
        name || row.name,
        phone ?? row.phone,
        address ?? row.address,
        city ?? row.city,
        product_details ?? row.product_details,
        opening_balance ?? row.opening_balance,
        status || row.status,
        row.id
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const t = tableFor(req.baseUrl);

    await query(
      `UPDATE ${t}
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

// Party ledger: opening balance + transactions + running balance
async function ledgerTotals(t, row) {
  const isCustomer = t === 'customers';

  const debitResult = await query(
    isCustomer
      ? `SELECT COALESCE(SUM(total), 0) AS s
         FROM invoices
         WHERE customer_id = $1
           AND is_deleted = 0`
      : `SELECT COALESCE(SUM(amount), 0) AS s
         FROM purchases
         WHERE supplier_id = $1
           AND is_deleted = 0`,
    [row.id]
  );

  const creditResult = await query(
    `SELECT COALESCE(SUM(amount), 0) AS s
     FROM payments
     WHERE party_type = $1
       AND party_id = $2
       AND direction = $3
       AND is_deleted = 0`,
    [
      isCustomer ? 'customer' : 'supplier',
      row.id,
      isCustomer ? 'in' : 'out'
    ]
  );

  return {
    debit: Number(debitResult.rows[0]?.s || 0),
    credit: Number(creditResult.rows[0]?.s || 0)
  };
}

async function ledgerBalance(t, row) {
  const { debit, credit } = await ledgerTotals(t, row);

  return Number(row.opening_balance || 0) + debit - credit;
}

router.get('/:id/ledger', async (req, res, next) => {
  try {
    const t = tableFor(req.baseUrl);

    const result = await query(
      `SELECT * FROM ${t}
       WHERE id = $1
         AND is_deleted = 0`,
      [req.params.id]
    );

    const row = result.rows[0];

    if (!row) {
      throw httpError(404, 'Record not found');
    }

    const isCustomer = t === 'customers';
    const txns = [];

    if (isCustomer) {
      const invoicesResult = await query(
        `SELECT *
         FROM invoices
         WHERE customer_id = $1
           AND is_deleted = 0
         ORDER BY date, id`,
        [row.id]
      );

      for (const inv of invoicesResult.rows) {
        txns.push({
          date: inv.date,
          description: `Invoice ${inv.invoice_no}`,
          debit: Number(inv.total || 0),
          credit: 0,
          ref: inv.invoice_no
        });
      }
    } else {
      const purchasesResult = await query(
        `SELECT *
         FROM purchases
         WHERE supplier_id = $1
           AND is_deleted = 0
         ORDER BY date, id`,
        [row.id]
      );

      for (const p of purchasesResult.rows) {
        txns.push({
          date: p.date,
          description: `Purchase — ${p.item}`,
          debit: Number(p.amount || 0),
          credit: 0
        });
      }
    }

    const partyType = isCustomer ? 'customer' : 'supplier';
    const dir = isCustomer ? 'in' : 'out';

    const paymentsResult = await query(
      `SELECT *
       FROM payments
       WHERE party_type = $1
         AND party_id = $2
         AND direction = $3
         AND is_deleted = 0
       ORDER BY date, id`,
      [partyType, row.id, dir]
    );

    for (const p of paymentsResult.rows) {
      txns.push({
        date: p.date,
        description: `Payment (${p.method})`,
        debit: 0,
        credit: Number(p.amount || 0),
        ref: p.reference
      });
    }

    txns.sort((a, b) =>
      a.date < b.date ? -1 :
      a.date > b.date ? 1 : 0
    );

    let running = Number(row.opening_balance || 0);

    const lines = txns.map((x) => {
      running += x.debit - x.credit;

      return {
        ...x,
        balance: running
      };
    });

    res.json({
      party: row,
      opening_balance: Number(row.opening_balance || 0),
      balance: running,
      lines
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
