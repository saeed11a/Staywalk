const { Pool } = require('pg');
const crypto = require('crypto');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');

  if (!salt || !hash) return false;

  const candidate = crypto
    .scryptSync(String(password), salt, 64)
    .toString('hex');

  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

async function query(text, params = []) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initDb() {
  /*
   * USERS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /*
   * SESSIONS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  /*
   * SETTINGS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL DEFAULT 'HIKER Shoes',
      tagline TEXT DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'Rs',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      invoice_prefix TEXT NOT NULL DEFAULT 'HSF',
      low_stock_threshold INTEGER NOT NULL DEFAULT 100,
      pairs_per_bag INTEGER NOT NULL DEFAULT 100,
      pairs_per_carton INTEGER NOT NULL DEFAULT 24,
      opening_cash NUMERIC NOT NULL DEFAULT 0,
      bank_name TEXT DEFAULT '',
      account_title TEXT DEFAULT '',
      account_no TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      footer_note TEXT DEFAULT '',
      CONSTRAINT settings_single_row CHECK (id = 1)
    )
  `);

  /*
   * RAW CATEGORIES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS raw_categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      unit_label TEXT DEFAULT 'pack',
      uses_pairs INTEGER NOT NULL DEFAULT 0,
      fields_json TEXT DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * ARTICLES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS articles (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      sizes TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      upper_type TEXT DEFAULT '',
      sole_type TEXT DEFAULT '',
      cost_price NUMERIC NOT NULL DEFAULT 0,
      selling_price NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * RAW STOCK
   */
  await query(`
    CREATE TABLE IF NOT EXISTS raw_stock (
      id BIGSERIAL PRIMARY KEY,
      category_slug TEXT NOT NULL,
      item TEXT NOT NULL,
      article_code TEXT DEFAULT '',
      pack_type TEXT DEFAULT '',
      pairs_per_pack NUMERIC NOT NULL DEFAULT 0,
      quantity NUMERIC NOT NULL DEFAULT 0,
      unit TEXT DEFAULT '',
      total_pairs NUMERIC NOT NULL DEFAULT 0,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      amount NUMERIC NOT NULL DEFAULT 0,
      supplier_id BIGINT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      custom_json TEXT DEFAULT '{}',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * READY SHOES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS ready_shoes (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL,
      carton_type TEXT DEFAULT '',
      pairs_per_carton NUMERIC NOT NULL DEFAULT 0,
      cartons NUMERIC NOT NULL DEFAULT 0,
      pairs NUMERIC NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      reference_id BIGINT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * PRODUCTION
   */
  await query(`
    CREATE TABLE IF NOT EXISTS production_entries (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      line TEXT DEFAULT '',
      shift TEXT DEFAULT '',
      operator TEXT DEFAULT '',
      input_bags NUMERIC NOT NULL DEFAULT 0,
      pairs_per_bag NUMERIC NOT NULL DEFAULT 0,
      uppers_used NUMERIC NOT NULL DEFAULT 0,
      carton_type TEXT DEFAULT '',
      pairs_per_carton NUMERIC NOT NULL DEFAULT 0,
      output_cartons NUMERIC NOT NULL DEFAULT 0,
      output_pairs NUMERIC NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * CUSTOMERS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      product_details TEXT DEFAULT '',
      opening_balance NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * SUPPLIERS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      product_details TEXT DEFAULT '',
      opening_balance NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * PURCHASES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id BIGSERIAL PRIMARY KEY,
      supplier_id BIGINT NOT NULL,
      item TEXT NOT NULL,
      category_slug TEXT NOT NULL DEFAULT 'uppers',
      pack_type TEXT DEFAULT '',
      pairs_per_pack NUMERIC NOT NULL DEFAULT 0,
      quantity NUMERIC NOT NULL DEFAULT 0,
      total_pairs NUMERIC NOT NULL DEFAULT 0,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      amount NUMERIC NOT NULL DEFAULT 0,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * INVOICES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id BIGSERIAL PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id BIGINT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_cartons NUMERIC NOT NULL DEFAULT 0,
      total_pairs NUMERIC NOT NULL DEFAULT 0,
      subtotal NUMERIC NOT NULL DEFAULT 0,
      discount NUMERIC NOT NULL DEFAULT 0,
      total NUMERIC NOT NULL DEFAULT 0,
      received NUMERIC NOT NULL DEFAULT 0,
      balance NUMERIC NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'unpaid',
      notes TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * INVOICE LINES
   */
  await query(`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id BIGSERIAL PRIMARY KEY,
      invoice_id BIGINT NOT NULL,
      article_id BIGINT NOT NULL,
      carton_type TEXT DEFAULT '',
      pairs_per_carton NUMERIC NOT NULL DEFAULT 0,
      cartons NUMERIC NOT NULL DEFAULT 0,
      pairs NUMERIC NOT NULL DEFAULT 0,
      rate NUMERIC NOT NULL DEFAULT 0,
      amount NUMERIC NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE
    )
  `);

  /*
   * PAYMENTS
   */
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGSERIAL PRIMARY KEY,
      party_type TEXT NOT NULL,
      party_id BIGINT,
      party_name TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      method TEXT NOT NULL DEFAULT 'Cash',
      reference TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * KHARCHA
   */
  await query(`
    CREATE TABLE IF NOT EXISTS kharcha (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      amount NUMERIC NOT NULL,
      method TEXT NOT NULL DEFAULT 'Cash',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * ROZNAMCHA
   */
  await query(`
    CREATE TABLE IF NOT EXISTS roznamcha (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      direction TEXT NOT NULL,
      source TEXT NOT NULL,
      party TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      amount NUMERIC NOT NULL,
      method TEXT DEFAULT '',
      reference TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_date TIMESTAMPTZ
    )
  `);

  /*
   * INDEXES
   */
  await query(`
    CREATE INDEX IF NOT EXISTS idx_invoices_date
    ON invoices(date)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_roznamcha_date
    ON roznamcha(date)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_payments_date
    ON payments(date)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_raw_stock_category
    ON raw_stock(category_slug)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ready_shoes_article
    ON ready_shoes(article_id)
  `);

  /*
   * SETTINGS DEFAULT ROW
   */
  await query(`
    INSERT INTO settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);

  /*
   * SEED DATA
   *
   * We only seed when there are no users.
   * This prevents duplicate demo data every time
   * the server starts.
   */
  const userCount = await query(`
    SELECT COUNT(*)::INTEGER AS c
    FROM users
  `);

  if (userCount.rows[0].c > 0) {
    return;
  }

  /*
   * ADMIN
   */
  await query(`
    INSERT INTO users
      (name, email, password_hash)
    VALUES
      ($1, $2, $3)
  `, [
    'Admin',
    'admin@hiker.pk',
    hashPassword('admin123'),
  ]);

  /*
   * SETTINGS
   */
  await query(`
    UPDATE settings
    SET
      company_name = $1,
      tagline = $2,
      currency = $3,
      address = $4,
      phone = $5,
      email = $6,
      bank_name = $7,
      account_title = $8,
      account_no = $9,
      iban = $10,
      opening_cash = $11,
      footer_note = $12
    WHERE id = 1
  `, [
    'HIKER Shoes Factory',
    'Quality shoes, crafted with care',
    'Rs',
    'Plot 12, Industrial Estate, Sialkot 51310, Pakistan',
    '+92 52 355 1234',
    'info@hikershoes.pk',
    'Meezan Bank Ltd',
    'HIKER Shoes Factory',
    '0123-0456789012',
    'PK36MEZN0001230456789012',
    500000,
    'Thank you for your business — goods once sold are not returnable.',
  ]);

  /*
   * RAW CATEGORIES
   */
  const categories = [
    ['Uppers', 'uppers', 'bag', 1, 1],
    ['Chemicals', 'chemicals', 'kg', 0, 2],
    ['Laces', 'laces', 'pack', 1, 3],
  ];

  for (const c of categories) {
    await query(`
      INSERT INTO raw_categories
        (name, slug, unit_label, uses_pairs, sort_order)
      VALUES ($1, $2, $3, $4, $5)
    `, c);
  }

  /*
   * ARTICLES
   */
  const articles = [
    [
      'HSF-001',
      'Everest Hiker',
      'hiking',
      '40-45',
      'Brown / Black',
      'full-grain',
      'rubber',
      4200,
      6500,
    ],
    [
      'HSF-002',
      'Trail Runner',
      'sports',
      '39-44',
      'Grey / Blue',
      'suede',
      'EVA',
      3100,
      4800,
    ],
    [
      'HSF-003',
      'K2 Classic',
      'formal',
      '39-44',
      'Black',
      'polished leather',
      'PU',
      3600,
      5500,
    ],
  ];

  for (const a of articles) {
    await query(`
      INSERT INTO articles
        (
          code,
          name,
          category,
          sizes,
          colors,
          upper_type,
          sole_type,
          cost_price,
          selling_price
        )
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, a);
  }

  /*
   * SUPPLIERS
   */
  const suppliers = [
    [
      'Sialkot Leather Co',
      '+92 333 1112223',
      'Kotli Loharan, Sialkot',
      'Sialkot',
      'Uppers, cut-to-size',
      40000,
    ],
    [
      'Pak Soles & Chemicals',
      '+92 300 4445556',
      'Daska Road, Sialkot',
      'Daska',
      'Soles, adhesives',
      25000,
    ],
  ];

  for (const s of suppliers) {
    await query(`
      INSERT INTO suppliers
        (
          name,
          phone,
          address,
          city,
          product_details,
          opening_balance
        )
      VALUES ($1,$2,$3,$4,$5,$6)
    `, s);
  }

  /*
   * CUSTOMERS
   */
  const customers = [
    [
      'Karachi Footwear Mart',
      '+92 300 1234567',
      'Saddar',
      'Karachi',
      'Wholesale hiking boots',
      15000,
    ],
    [
      'Lahore Shoe House',
      '+92 321 7654321',
      'Liberty Market',
      'Lahore',
      'Sports shoes',
      0,
    ],
    [
      'Peshawar Traders',
      '+92 91 5551234',
      'Hayatabad',
      'Peshawar',
      'Formal shoes',
      8000,
    ],
  ];

  for (const c of customers) {
    await query(`
      INSERT INTO customers
        (
          name,
          phone,
          address,
          city,
          product_details,
          opening_balance
        )
      VALUES ($1,$2,$3,$4,$5,$6)
    `, c);
  }

  /*
   * DATE HELPER
   */
  const d = (daysAgo) => {
    const date = new Date(
      Date.now() - daysAgo * 86400000
    );

    return date.toISOString().slice(0, 10);
  };

  /*
   * RAW STOCK
   */
  const stock = [
    [
      'uppers',
      'Full-grain upper — HSF-001',
      'HSF-001',
      'bag',
      12,
      80,
      'bags',
      960,
      380,
      364800,
      1,
    ],
    [
      'uppers',
      'Suede upper — HSF-002',
      'HSF-002',
      'bag',
      12,
      60,
      'bags',
      720,
      310,
      223200,
      1,
    ],
    [
      'uppers',
      'Polished upper — HSF-003',
      'HSF-003',
      'bag',
      12,
      50,
      'bags',
      600,
      340,
      204000,
      1,
    ],
    [
      'chemicals',
      'Shoe adhesive',
      '',
      'kg',
      0,
      60,
      'kg',
      0,
      1250,
      75000,
      2,
    ],
    [
      'laces',
      'Cotton laces 120cm',
      '',
      'pack',
      50,
      40,
      'packs',
      2000,
      65,
      26000,
      2,
    ],
  ];

  for (const s of stock) {
    await query(`
      INSERT INTO raw_stock
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
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [...s, d(7)]);
  }

  /*
   * PURCHASES
   */
  await query(`
    INSERT INTO purchases
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
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    1,
    'Full-grain upper — HSF-001',
    'uppers',
    'bag',
    12,
    80,
    960,
    380,
    364800,
    d(7),
  ]);

  await query(`
    INSERT INTO purchases
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
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    2,
    'Shoe adhesive',
    'chemicals',
    'kg',
    0,
    60,
    0,
    1250,
    75000,
    d(7),
  ]);

  /*
   * MANUAL READY STOCK
   */
  await query(`
    INSERT INTO ready_shoes
      (
        article_id,
        carton_type,
        pairs_per_carton,
        cartons,
        pairs,
        source,
        date
      )
    VALUES
      ($1,$2,$3,$4,$5,$6,$7)
  `, [
    1,
    'Export 24',
    24,
    10,
    240,
    'manual',
    d(6),
  ]);

  /*
   * PRODUCTION
   */
  const production = await query(`
    INSERT INTO production_entries
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
    RETURNING id
  `, [
    1,
    d(5),
    'Line A',
    'Morning',
    'Rashid Ali',
    5,
    12,
    60,
    'Export 24',
    24,
    5,
    120,
  ]);

  await query(`
    INSERT INTO ready_shoes
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
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    1,
    'Export 24',
    24,
    5,
    120,
    'production',
    production.rows[0].id,
    d(5),
  ]);

  /*
   * OPENING CASH
   */
  await query(`
    INSERT INTO roznamcha
      (
        direction,
        source,
        description,
        amount,
        date
      )
    VALUES
      ($1,$2,$3,$4,$5)
  `, [
    'in',
    'opening',
    'Opening cash balance',
    500000,
    d(30),
  ]);

  /*
   * FIRST INVOICE
   */
  const invoice = await query(`
    INSERT INTO invoices
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
    RETURNING id
  `, [
    'HSF-0001',
    1,
    d(2),
    4,
    96,
    528000,
    8000,
    520000,
    520000,
    0,
    'cash',
    'paid',
    'First order',
  ]);

  const invoiceId = invoice.rows[0].id;

  /*
   * INVOICE LINE
   */
  await query(`
    INSERT INTO invoice_lines
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
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    invoiceId,
    1,
    'Export 24',
    24,
    4,
    96,
    5500,
    528000,
  ]);

  /*
   * SALE STOCK MOVEMENT
   */
  await query(`
    INSERT INTO ready_shoes
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
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    1,
    'Export 24',
    24,
    -4,
    -96,
    'sale',
    invoiceId,
    d(2),
  ]);

  /*
   * CUSTOMER PAYMENT
   */
  await query(`
    INSERT INTO payments
      (
        party_type,
        party_id,
        party_name,
        direction,
        amount,
        method,
        date
      )
    VALUES
      ($1,$2,$3,$4,$5,$6,$7)
  `, [
    'customer',
    1,
    
