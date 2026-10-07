const express = require('express');
const { query } = require('../db');
const {
  recordPayment,
  recordKharcha,
  roznamchaPost,
  httpError
} = require('../lib/stock-ops');

const router = express.Router();

// Mounted at /payments, /roznamcha and /kharcha — dispatched by baseUrl
function kind(req) {
  if (req.baseUrl.endsWith('/payments')) return 'payments';
  if (req.baseUrl.endsWith('/roznamcha')) return 'roznamcha';
  return 'kharcha';
}

function dateClause(req, startIndex = 1) {
  const { from, to } = req.query;

  return from && to
    ? `AND date BETWEEN $${startIndex} AND $${startIndex + 1}`
    : '';
}

function dateArgs(req) {
  const { from, to } = req.query;
  return from && to ? [from, to] : [];
}

router.get('/', async (req, res, next) => {
  try {
    const k = kind(req);
    const args = dateArgs(req);

    let table;

    if (k === 'payments') {
      table = 'payments';
    } else if (k === 'roznamcha') {
      table = 'roznamcha';
    } else {
      table = 'kharcha';
    }

    const result = await query(
      `SELECT *
       FROM ${table}
       WHERE is_deleted = 0
       ${dateClause(req)}
       ORDER BY date DESC, id DESC`,
      args
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const k = kind(req);
    const d = req.body;

    if (k === 'payments') {
      if (!d.party_name || !d.amount) {
        throw httpError(400, 'Party and amount are required');
      }

      const id = await recordPayment({
        party_type: d.party_type || 'customer',
        party_id: d.party_id || null,
        party_name: d.party_name,
        direction: d.direction === 'out' ? 'out' : 'in',
        amount: Number(d.amount),
        date:
          d.date ||
          new Date().toISOString().slice(0, 10),
        method: d.method || 'Cash',
        reference: d.reference || ''
      });

      return res.status(201).json({ id });
    }

    if (k === 'kharcha') {
      if (!d.amount) {
        throw httpError(400, 'Amount is required');
      }

      const id = await recordKharcha({
        date:
          d.date ||
          new Date().toISOString().slice(0, 10),
        category: d.category || '',
        description: d.description || '',
        amount: Number(d.amount),
        method: d.method || 'Cash'
      });

      return res.status(201).json({ id });
    }

    // Roznamcha manual entry (other_income / opening)
    if (!d.amount || !d.direction) {
      throw httpError(
        400,
        'Direction and amount are required'
      );
    }

    const id = await roznamchaPost({
      date:
        d.date ||
        new Date().toISOString().slice(0, 10),
      direction: d.direction === 'out' ? 'out' : 'in',
      source: d.source || 'other_income',
      party: d.party || '',
      description: d.description || '',
      category: d.category || '',
      amount: Number(d.amount),
      method: d.method || 'Cash',
      reference: d.reference || ''
    });

    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const k = kind(req);

    if (k !== 'roznamcha') {
      throw httpError(
        400,
        'Only roznamcha entries can be edited directly'
      );
    }

    const d = req.body;

    const result = await query(
      `SELECT *
       FROM roznamcha
       WHERE id = $1
         AND is_deleted = 0`,
      [req.params.id]
    );

    const row = result.rows[0];

    if (!row) {
      throw httpError(404, 'Record not found');
    }

    await query(
      `UPDATE roznamcha
       SET date = $1,
           direction = $2,
           source = $3,
           party = $4,
           description = $5,
           category = $6,
           amount = $7,
           method = $8,
           reference = $9
       WHERE id = $10`,
      [
        d.date || row.date,
        d.direction === 'out' ? 'out' : 'in',
        d.source || row.source,
        d.party ?? row.party,
        d.description ?? row.description,
        d.category ?? row.category,
        Number(d.amount) || Number(row.amount),
        d.method || row.method,
        d.reference ?? row.reference,
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
    const k = kind(req);

    const table =
      k === 'payments'
        ? 'payments'
        : k === 'roznamcha'
          ? 'roznamcha'
          : 'kharcha';

    await query(
      `UPDATE ${table}
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

module.exports = router;
