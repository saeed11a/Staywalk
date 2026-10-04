const { db } = require('../db');

// Quantity conversions — pairs are never entered by hand.
const pairsFromPack = (quantity, pairsPerPack) => (Number(quantity) || 0) * (Number(pairsPerPack) || 0);
const pairsFromCartons = (cartons, pairsPerCarton) => (Number(cartons) || 0) * (Number(pairsPerCarton) || 0);

function availablePairs(articleId) {
  return db.prepare('SELECT COALESCE(SUM(pairs), 0) AS p FROM ready_shoes WHERE article_id = ? AND is_deleted = 0')
    .get(articleId).p;
}

function roznamchaPost(row) {
  db.prepare(`INSERT INTO roznamcha (date, direction, source, party, description, category, amount, method, reference)
    VALUES (@date, @direction, @source, @party, @description, @category, @amount, @method, @reference)`).run(row);
}

// Production: deducts uppers from Raw Stock, adds output pairs to Ready Shoes.
function recordProduction(data) {
  const uppersUsed = pairsFromPack(data.input_bags, data.pairs_per_bag);
  const outputPairs = pairsFromCartons(data.output_cartons, data.pairs_per_carton);
  if (uppersUsed < 0 || outputPairs < 0) throw httpError(400, 'Quantities must be positive');

  const run = db.transaction(() => {
    // Deduct uppers from raw stock rows (newest first, matching article code where possible)
    let remaining = uppersUsed;
    if (uppersUsed > 0) {
      const rows = db.prepare(`SELECT * FROM raw_stock WHERE is_deleted = 0 AND category_slug = 'uppers' AND total_pairs > 0
        ORDER BY CASE WHEN article_code = ? THEN 0 ELSE 1 END, date DESC, id DESC`).all(data.article_code || '');
      for (const r of rows) {
        if (remaining <= 0) break;
        const perPack = r.pairs_per_pack || 1;
        const pairsToTake = Math.min(r.total_pairs, remaining);
        const qtyToTake = pairsToTake / perPack;
        db.prepare('UPDATE raw_stock SET quantity = quantity - ?, total_pairs = total_pairs - ?, amount = amount - ? WHERE id = ?')
          .run(qtyToTake, pairsToTake, qtyToTake * r.unit_price, r.id);
        remaining -= pairsToTake;
      }
      if (remaining > 0.00001) throw httpError(400, `Not enough uppers stock — short by ${Math.ceil(remaining)} pairs`);
    }

    const info = db.prepare(`INSERT INTO production_entries
      (article_id, date, line, shift, operator, input_bags, pairs_per_bag, uppers_used, carton_type, pairs_per_carton, output_cartons, output_pairs)
      VALUES (@article_id, @date, @line, @shift, @operator, @input_bags, @pairs_per_bag, @uppers_used, @carton_type, @pairs_per_carton, @output_cartons, @output_pairs)`)
      .run({ ...data, uppers_used: uppersUsed, output_pairs: outputPairs });
    if (outputPairs > 0) {
      db.prepare(`INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, reference_id, date)
        VALUES (@article_id, @carton_type, @pairs_per_carton, @output_cartons, @output_pairs, 'production', @ref, @date)`)
        .run({ article_id: data.article_id, carton_type: data.carton_type, pairs_per_carton: data.pairs_per_carton,
          output_cartons: data.output_cartons, output_pairs: outputPairs, ref: info.lastInsertRowid, date: data.date });
    }
    return info.lastInsertRowid;
  });
  return run();
}

// Purchase: adds into Raw Stock and increases the supplier payable.
function recordPurchase(data) {
  const totalPairs = pairsFromPack(data.quantity, data.pairs_per_pack);
  const amount = (Number(data.quantity) || 0) * (Number(data.unit_price) || 0);
  const run = db.transaction(() => {
    const info = db.prepare(`INSERT INTO purchases
      (supplier_id, item, category_slug, pack_type, pairs_per_pack, quantity, total_pairs, unit_price, amount, date)
      VALUES (@supplier_id, @item, @category_slug, @pack_type, @pairs_per_pack, @quantity, @total_pairs, @unit_price, @amount, @date)`)
      .run({ ...data, total_pairs: totalPairs, amount });
    db.prepare(`INSERT INTO raw_stock (category_slug, item, article_code, pack_type, pairs_per_pack, quantity, unit, total_pairs, unit_price, amount, supplier_id, date)
      VALUES (@category_slug, @item, @article_code, @pack_type, @pairs_per_pack, @quantity, @unit, @total_pairs, @unit_price, @amount, @supplier_id, @date)`)
      .run({ ...data, total_pairs: totalPairs, amount, article_code: data.article_code || '', unit: data.unit || data.pack_type || '' });
    return info.lastInsertRowid;
  });
  return run();
}

// Invoice: cartons -> pairs, checks Ready Shoes stock, deducts it, writes lines,
// and any amount received creates a Payment + Roznamcha customer_receipt entry.
function createInvoice(data) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  for (const line of data.lines) {
    line.pairs = pairsFromCartons(line.cartons, line.pairs_per_carton);
    line.amount = line.pairs * (Number(line.rate) || 0);
    if (line.pairs <= 0) throw httpError(400, 'Each line needs cartons and pairs per carton');
  }
  const subtotal = data.lines.reduce((s, l) => s + l.amount, 0);
  const discount = Number(data.discount) || 0;
  const total = Math.max(subtotal - discount, 0);
  const received = Math.min(Number(data.received) || 0, total);
  const balance = total - received;
  const status = received <= 0 ? 'unpaid' : (balance <= 0.01 ? 'paid' : 'partial');
  const totalCartons = data.lines.reduce((s, l) => s + (Number(l.cartons) || 0), 0);
  const totalPairs = data.lines.reduce((s, l) => s + l.pairs, 0);

  const run = db.transaction(() => {
    for (const line of data.lines) {
      if (availablePairs(line.article_id) < line.pairs) {
        const article = db.prepare('SELECT code, name FROM articles WHERE id = ?').get(line.article_id);
        throw httpError(400, `Not enough ready stock for ${article ? article.code + ' ' + article.name : 'article'} — short by ${Math.ceil(line.pairs - availablePairs(line.article_id))} pairs`);
      }
    }
    const seq = db.prepare('SELECT COUNT(*) AS c FROM invoices').get().c + 1;
    const invoiceNo = `${settings.invoice_prefix}-${String(seq).padStart(4, '0')}`;
    const info = db.prepare(`INSERT INTO invoices
      (invoice_no, customer_id, date, total_cartons, total_pairs, subtotal, discount, total, received, balance, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(invoiceNo, data.customer_id, data.date, totalCartons, totalPairs, subtotal, discount, total, received, balance,
        data.payment_method || 'cash', status, data.notes || '');
    const invoiceId = info.lastInsertRowid;
    const lineStmt = db.prepare(`INSERT INTO invoice_lines
      (invoice_id, article_id, carton_type, pairs_per_carton, cartons, pairs, rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const stockStmt = db.prepare(`INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, reference_id, date)
      VALUES (?, ?, ?, ?, ?, 'sale', ?, ?)`);
    for (const line of data.lines) {
      lineStmt.run(invoiceId, line.article_id, line.carton_type || '', line.pairs_per_carton, line.cartons, line.pairs, line.rate, line.amount);
      stockStmt.run(line.article_id, line.carton_type || '', line.pairs_per_carton, -line.cartons, -line.pairs, invoiceId, data.date);
    }
    const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(data.customer_id);
    if (received > 0) {
      db.prepare(`INSERT INTO payments (party_type, party_id, party_name, direction, amount, date, method, reference)
        VALUES ('customer', ?, ?, 'in', ?, ?, ?, ?)`)
        .run(data.customer_id, customer.name, received, data.date, methodFromInvoice(data.payment_method), invoiceNo);
      roznamchaPost({
        date: data.date, direction: 'in', source: 'customer_receipt', party: customer.name,
        description: `Invoice ${invoiceNo}`, category: 'sales', amount: received,
        method: methodFromInvoice(data.payment_method), reference: invoiceNo,
      });
    }
    return { id: invoiceId, invoice_no: invoiceNo };
  });
  return run();
}

function methodFromInvoice(pm) {
  return pm === 'account' ? 'Bank' : 'Cash';
}

// Payment: customer receipt (in) / supplier payment (out) — posts to Roznamcha.
function recordPayment(data) {
  const run = db.transaction(() => {
    const info = db.prepare(`INSERT INTO payments (party_type, party_id, party_name, direction, amount, date, method, reference)
      VALUES (@party_type, @party_id, @party_name, @direction, @amount, @date, @method, @reference)`).run(data);
    roznamchaPost({
      date: data.date, direction: data.direction,
      source: data.party_type === 'supplier' ? 'supplier_payment' : 'customer_receipt',
      party: data.party_name, description: data.reference || '',
      category: data.party_type, amount: data.amount, method: data.method, reference: data.reference || '',
    });
    return info.lastInsertRowid;
  });
  return run();
}

// Kharcha: posts to Roznamcha as source kharcha.
function recordKharcha(data) {
  const run = db.transaction(() => {
    const info = db.prepare('INSERT INTO kharcha (date, category, description, amount, method) VALUES (@date, @category, @description, @amount, @method)').run(data);
    roznamchaPost({
      date: data.date, direction: 'out', source: 'kharcha', party: '',
      description: data.description || '', category: data.category || '', amount: data.amount, method: data.method,
    });
    return info.lastInsertRowid;
  });
  return run();
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { pairsFromPack, pairsFromCartons, availablePairs, recordProduction, recordPurchase, createInvoice, recordPayment, recordKharcha, roznamchaPost, httpError };
