const { query, withTransaction } = require('../db');

// Quantity conversions — pairs are never entered by hand.
const pairsFromPack = (quantity, pairsPerPack) =>
  (Number(quantity) || 0) * (Number(pairsPerPack) || 0);

const pairsFromCartons = (cartons, pairsPerCarton) =>
  (Number(cartons) || 0) * (Number(pairsPerCarton) || 0);

async function availablePairs(articleId, client = null) {
  const runner = client || { query };

  const result = await runner.query(
    `SELECT COALESCE(SUM(pairs), 0) AS p
     FROM ready_shoes
     WHERE article_id = $1
       AND is_deleted = 0`,
    [articleId]
  );

  return Number(result.rows[0]?.p || 0);
}

async function roznamchaPost(row, client = null) {
  const runner = client || { query };

  await runner.query(
    `INSERT INTO roznamcha
      (date, direction, source, party, description, category, amount, method, reference)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.date,
      row.direction,
      row.source,
      row.party || '',
      row.description || '',
      row.category || '',
      row.amount,
      row.method || '',
      row.reference || '',
    ]
  );
}

// Production: deducts uppers from Raw Stock, adds output pairs to Ready Shoes.
async function recordProduction(data) {
  const uppersUsed = pairsFromPack(
    data.input_bags,
    data.pairs_per_bag
  );

  const outputPairs = pairsFromCartons(
    data.output_cartons,
    data.pairs_per_carton
  );

  if (uppersUsed < 0 || outputPairs < 0) {
    throw httpError(400, 'Quantities must be positive');
  }

  return withTransaction(async (client) => {
    let remaining = uppersUsed;

    if (uppersUsed > 0) {
      const rows = await client.query(
        `SELECT *
         FROM raw_stock
         WHERE is_deleted = 0
           AND category_slug = 'uppers'
           AND total_pairs > 0
         ORDER BY
           CASE WHEN article_code = $1 THEN 0 ELSE 1 END,
           date DESC,
           id DESC`,
        [data.article_code || '']
      );

      for (const r of rows.rows) {
        if (remaining <= 0) break;

        const perPack = Number(r.pairs_per_pack) || 1;
        const stockPairs = Number(r.total_pairs) || 0;
        const unitPrice = Number(r.unit_price) || 0;

        const pairsToTake = Math.min(stockPairs, remaining);
        const qtyToTake = pairsToTake / perPack;

        await client.query(
          `UPDATE raw_stock
           SET
             quantity = quantity - $1,
             total_pairs = total_pairs - $2,
             amount = amount - $3
           WHERE id = $4`,
          [
            qtyToTake,
            pairsToTake,
            qtyToTake * unitPrice,
            r.id,
          ]
        );

        remaining -= pairsToTake;
      }

      if (remaining > 0.00001) {
        throw httpError(
          400,
          `Not enough uppers stock — short by ${Math.ceil(remaining)} pairs`
        );
      }
    }

    const production = await client.query(
      `INSERT INTO production_entries
        (
          article_id,
          date,
          line,
          shift,
          operator,
          input_bags,
          pairs_per_bag,
          uppers_used,
          carton_type,
          pairs_per_carton,
          output_cartons,
          output_pairs
        )
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        data.article_id,
        data.date,
        data.line || '',
        data.shift || '',
        data.operator || '',
        data.input_bags,
        data.pairs_per_bag,
        uppersUsed,
        data.carton_type || '',
        data.pairs_per_carton,
        data.output_cartons,
        outputPairs,
      ]
    );

    const productionId = production.rows[0].id;

    if (outputPairs > 0) {
      await client.query(
        `INSERT INTO ready_shoes
          (
            article_id,
            carton_type,
            pairs_per_carton,
            cartons,
            pairs,
            source,
            reference_id,
            date
          )
         VALUES ($1,$2,$3,$4,$5,'production',$6,$7)`,
        [
          data.article_id,
          data.carton_type || '',
          data.pairs_per_carton,
          data.output_cartons,
          outputPairs,
          productionId,
          data.date,
        ]
      );
    }

    return productionId;
  });
}

// Purchase: adds into Raw Stock and increases the supplier payable.
async function recordPurchase(data) {
  const totalPairs = pairsFromPack(
    data.quantity,
    data.pairs_per_pack
  );

  const amount =
    (Number(data.quantity) || 0) *
    (Number(data.unit_price) || 0);

  return withTransaction(async (client) => {
    const purchase = await client.query(
      `INSERT INTO purchases
        (
          supplier_id,
          item,
          category_slug,
          pack_type,
          pairs_per_pack,
          quantity,
          total_pairs,
          unit_price,
          amount,
          date
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        data.supplier_id,
        data.item,
        data.category_slug,
        data.pack_type || '',
        data.pairs_per_pack,
        data.quantity,
        totalPairs,
        data.unit_price,
        amount,
        data.date,
      ]
    );

    await client.query(
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
          date
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        data.category_slug,
        data.item,
        data.article_code || '',
        data.pack_type || '',
        data.pairs_per_pack,
        data.quantity,
        data.unit || data.pack_type || '',
        totalPairs,
        data.unit_price,
        amount,
        data.supplier_id,
        data.date,
      ]
    );

    return purchase.rows[0].id;
  });
}

// Invoice: cartons -> pairs, checks Ready Shoes stock, deducts it, writes lines,
// and any amount received creates a Payment + Roznamcha customer_receipt entry.
async function createInvoice(data) {
  const settingsResult = await query(
    'SELECT * FROM settings WHERE id = 1'
  );

  const settings = settingsResult.rows[0];

  if (!settings) {
    throw httpError(500, 'Company settings not found');
  }

  for (const line of data.lines) {
    line.pairs = pairsFromCartons(
      line.cartons,
      line.pairs_per_carton
    );

    line.amount =
      line.pairs * (Number(line.rate) || 0);

    if (line.pairs <= 0) {
      throw httpError(
        400,
        'Each line needs cartons and pairs per carton'
      );
    }
  }

  const subtotal = data.lines.reduce(
    (s, l) => s + Number(l.amount || 0),
    0
  );

  const discount = Number(data.discount) || 0;
  const total = Math.max(subtotal - discount, 0);

  const received = Math.min(
    Number(data.received) || 0,
    total
  );

  const balance = total - received;

  const status =
    received <= 0
      ? 'unpaid'
      : balance <= 0.01
        ? 'paid'
        : 'partial';

  const totalCartons = data.lines.reduce(
    (s, l) => s + (Number(l.cartons) || 0),
    0
  );

  const totalPairs = data.lines.reduce(
    (s, l) => s + Number(l.pairs || 0),
    0
  );

  return withTransaction(async (client) => {
    for (const line of data.lines) {
      const available = await availablePairs(
        line.article_id,
        client
      );

      if (available < line.pairs) {
        const articleResult = await client.query(
          'SELECT code, name FROM articles WHERE id = $1',
          [line.article_id]
        );

        const article = articleResult.rows[0];

        throw httpError(
          400,
          `Not enough ready stock for ${
            article
              ? article.code + ' ' + article.name
              : 'article'
          } — short by ${Math.ceil(
            line.pairs - available
          )} pairs`
        );
      }
    }

    const countResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS c FROM invoices'
    );

    const seq = Number(countResult.rows[0].c) + 1;

    const invoiceNo =
      `${settings.invoice_prefix}-${String(seq).padStart(4, '0')}`;

    const invoice = await client.query(
      `INSERT INTO invoices
        (
          invoice_no,
          customer_id,
          date,
          total_cartons,
          total_pairs,
          subtotal,
          discount,
          total,
          received,
          balance,
          payment_method,
          status,
          notes
        )
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        invoiceNo,
        data.customer_id,
        data.date,
        totalCartons,
        totalPairs,
        subtotal,
        discount,
        total,
        received,
        balance,
        data.payment_method || 'cash',
        status,
        data.notes || '',
      ]
    );

    const invoiceId = invoice.rows[0].id;

    for (const line of data.lines) {
      await client.query(
        `INSERT INTO invoice_lines
          (
            invoice_id,
            article_id,
            carton_type,
            pairs_per_carton,
            cartons,
            pairs,
            rate,
            amount
          )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          invoiceId,
          line.article_id,
          line.carton_type || '',
          line.pairs_per_carton,
          line.cartons,
          line.pairs,
          line.rate,
          line.amount,
        ]
      );

      await client.query(
        `INSERT INTO ready_shoes
          (
            article_id,
            carton_type,
            pairs_per_carton,
            cartons,
            pairs,
            source,
            reference_id,
            date
          )
         VALUES ($1,$2,$3,$4,$5,'sale',$6,$7)`,
        [
          line.article_id,
          line.carton_type || '',
          line.pairs_per_carton,
          -Number(line.cartons || 0),
          -Number(line.pairs || 0),
          invoiceId,
          data.date,
        ]
      );
    }

    const customerResult = await client.query(
      'SELECT name FROM customers WHERE id = $1',
      [data.customer_id]
    );

    const customer = customerResult.rows[0];

    if (!customer) {
      throw httpError(400, 'Customer not found');
    }

    if (received > 0) {
      const method = methodFromInvoice(
        data.payment_method
      );

      await client.query(
        `INSERT INTO payments
          (
            party_type,
            party_id,
            party_name,
            direction,
            amount,
            date,
            method,
            reference
          )
         VALUES
          ('customer',$1,$2,'in',$3,$4,$5,$6)`,
        [
          data.customer_id,
          customer.name,
          received,
          data.date,
          method,
          invoiceNo,
        ]
      );

      await roznamchaPost(
        {
          date: data.date,
          direction: 'in',
          source: 'customer_receipt',
          party: customer.name,
          description: `Invoice ${invoiceNo}`,
          category: 'sales',
          amount: received,
          method,
          reference: invoiceNo,
        },
        client
      );
    }

    return {
      id: invoiceId,
      invoice_no: invoiceNo,
    };
  });
}

function methodFromInvoice(pm) {
  return pm === 'account' ? 'Bank' : 'Cash';
}

// Payment: customer receipt (in) / supplier payment (out) — posts to Roznamcha.
async function recordPayment(data) {
  return withTransaction(async (client) => {
    const payment = await client.query(
      `INSERT INTO payments
        (
          party_type,
          party_id,
          party_name,
          direction,
          amount,
          date,
          method,
          reference
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        data.party_type,
        data.party_id,
        data.party_name,
        data.direction,
        data.amount,
        data.date,
        data.method,
        data.reference || '',
      ]
    );

    await roznamchaPost(
      {
        date: data.date,
        direction: data.direction,
        source:
          data.party_type === 'supplier'
            ? 'supplier_payment'
            : 'customer_receipt',
        party: data.party_name,
        description: data.reference || '',
        category: data.party_type,
        amount: data.amount,
        method: data.method,
        reference: data.reference || '',
      },
      client
    );

    return payment.rows[0].id;
  });
}

// Kharcha: posts to Roznamcha as source kharcha.
async function recordKharcha(data) {
  return withTransaction(async (client) => {
    const expense = await client.query(
      `INSERT INTO kharcha
        (date, category, description, amount, method)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [
        data.date,
        data.category || '',
        data.description || '',
        data.amount,
        data.method,
      ]
    );

    await roznamchaPost(
      {
        date: data.date,
        direction: 'out',
        source: 'kharcha',
        party: '',
        description: data.description || '',
        category: data.category || '',
        amount: data.amount,
        method: data.method,
      },
      client
    );

    return expense.rows[0].id;
  });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = {
  pairsFromPack,
  pairsFromCartons,
  availablePairs,
  recordProduction,
  recordPurchase,
  createInvoice,
  recordPayment,
  recordKharcha,
  roznamchaPost,
  httpError,
};
