const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(process.env.DB_PATH || path.join(dataDir, 'hiker-shoes.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
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
  opening_cash REAL NOT NULL DEFAULT 0,
  bank_name TEXT DEFAULT '',
  account_title TEXT DEFAULT '',
  account_no TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  footer_note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS raw_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  unit_label TEXT DEFAULT 'pack',
  uses_pairs INTEGER NOT NULL DEFAULT 0,
  fields_json TEXT DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  sizes TEXT DEFAULT '',
  colors TEXT DEFAULT '',
  upper_type TEXT DEFAULT '',
  sole_type TEXT DEFAULT '',
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS raw_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_slug TEXT NOT NULL,
  item TEXT NOT NULL,
  article_code TEXT DEFAULT '',
  pack_type TEXT DEFAULT '',
  pairs_per_pack REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  total_pairs REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  supplier_id INTEGER,
  date TEXT NOT NULL DEFAULT (date('now')),
  custom_json TEXT DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS ready_shoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  carton_type TEXT DEFAULT '',
  pairs_per_carton REAL NOT NULL DEFAULT 0,
  cartons REAL NOT NULL DEFAULT 0,
  pairs REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  reference_id INTEGER,
  date TEXT NOT NULL DEFAULT (date('now')),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS production_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  line TEXT DEFAULT '',
  shift TEXT DEFAULT '',
  operator TEXT DEFAULT '',
  input_bags REAL NOT NULL DEFAULT 0,
  pairs_per_bag REAL NOT NULL DEFAULT 0,
  uppers_used REAL NOT NULL DEFAULT 0,
  carton_type TEXT DEFAULT '',
  pairs_per_carton REAL NOT NULL DEFAULT 0,
  output_cartons REAL NOT NULL DEFAULT 0,
  output_pairs REAL NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  product_details TEXT DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  product_details TEXT DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  category_slug TEXT NOT NULL DEFAULT 'uppers',
  pack_type TEXT DEFAULT '',
  pairs_per_pack REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  total_pairs REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT (date('now')),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  total_cartons REAL NOT NULL DEFAULT 0,
  total_pairs REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  received REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT DEFAULT '',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  carton_type TEXT DEFAULT '',
  pairs_per_carton REAL NOT NULL DEFAULT 0,
  cartons REAL NOT NULL DEFAULT 0,
  pairs REAL NOT NULL DEFAULT 0,
  rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_type TEXT NOT NULL,
  party_id INTEGER,
  party_name TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT DEFAULT '',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS kharcha (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL DEFAULT (date('now')),
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE TABLE IF NOT EXISTS roznamcha (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL DEFAULT (date('now')),
  direction TEXT NOT NULL,
  source TEXT NOT NULL,
  party TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  amount REAL NOT NULL,
  method TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_roznamcha_date ON roznamcha(date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`);

const seed = db.transaction(() => {
  db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run();
  if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c > 0) return;

  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
    .run('Admin', 'admin@hiker.pk', hashPassword('admin123'));
  db.prepare('UPDATE settings SET company_name=?, tagline=?, currency=?, address=?, phone=?, email=?, bank_name=?, account_title=?, account_no=?, iban=?, opening_cash=?, footer_note=? WHERE id=1')
    .run('HIKER Shoes Factory', 'Quality shoes, crafted with care', 'Rs',
      'Plot 12, Industrial Estate, Sialkot 51310, Pakistan',
      '+92 52 355 1234', 'info@hikershoes.pk',
      'Meezan Bank Ltd', 'HIKER Shoes Factory', '0123-0456789012', 'PK36MEZN0001230456789012',
      500000, 'Thank you for your business — goods once sold are not returnable.');

  const cats = [
    ['Uppers', 'uppers', 'bag', 1, 1],
    ['Chemicals', 'chemicals', 'kg', 0, 2],
    ['Laces', 'laces', 'pack', 1, 3],
  ];
  for (const c of cats) {
    db.prepare('INSERT INTO raw_categories (name, slug, unit_label, uses_pairs, sort_order) VALUES (?,?,?,?,?)').run(...c);
  }

  const articles = [
    ['HSF-001', 'Everest Hiker', 'hiking', '40-45', 'Brown / Black', 'full-grain', 'rubber', 4200, 6500],
    ['HSF-002', 'Trail Runner', 'sports', '39-44', 'Grey / Blue', 'suede', 'EVA', 3100, 4800],
    ['HSF-003', 'K2 Classic', 'formal', '39-44', 'Black', 'polished leather', 'PU', 3600, 5500],
  ];
  for (const a of articles) {
    db.prepare('INSERT INTO articles (code, name, category, sizes, colors, upper_type, sole_type, cost_price, selling_price) VALUES (?,?,?,?,?,?,?,?,?)').run(...a);
  }

  const suppliers = [
    ['Sialkot Leather Co', '+92 333 1112223', 'Kotli Loharan, Sialkot', 'Sialkot', 'Uppers, cut-to-size', 40000],
    ['Pak Soles & Chemicals', '+92 300 4445556', 'Daska Road, Sialkot', 'Daska', 'Soles, adhesives', 25000],
  ];
  for (const s of suppliers) {
    db.prepare("INSERT INTO suppliers (name, phone, address, city, product_details, opening_balance) VALUES (?,?,?,?,?,?)").run(...s);
  }

  const customers = [
    ['Karachi Footwear Mart', '+92 300 1234567', 'Saddar', 'Karachi', 'Wholesale hiking boots', 15000],
    ['Lahore Shoe House', '+92 321 7654321', 'Liberty Market', 'Lahore', 'Sports shoes', 0],
    ['Peshawar Traders', '+92 91 5551234', 'Hayatabad', 'Peshawar', 'Formal shoes', 8000],
  ];
  for (const c of customers) {
    db.prepare("INSERT INTO customers (name, phone, address, city, product_details, opening_balance) VALUES (?,?,?,?,?,?)").run(...c);
  }

  const d = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const stock = [
    ['uppers', 'Full-grain upper — HSF-001', 'HSF-001', 'bag', 12, 80, 'bags', 960, 380, 364800, 1],
    ['uppers', 'Suede upper — HSF-002', 'HSF-002', 'bag', 12, 60, 'bags', 720, 310, 223200, 1],
    ['uppers', 'Polished upper — HSF-003', 'HSF-003', 'bag', 12, 50, 'bags', 600, 340, 204000, 1],
    ['chemicals', 'Shoe adhesive', '', 'kg', 0, 60, 'kg', 0, 1250, 75000, 2],
    ['laces', 'Cotton laces 120cm', '', 'pack', 50, 40, 'packs', 2000, 65, 26000, 2],
  ];
  for (const s of stock) {
    db.prepare('INSERT INTO raw_stock (category_slug, item, article_code, pack_type, pairs_per_pack, quantity, unit, total_pairs, unit_price, amount, supplier_id, date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(...s, d(7));
  }
  db.prepare("INSERT INTO purchases (supplier_id, item, category_slug, pack_type, pairs_per_pack, quantity, total_pairs, unit_price, amount, date) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(1, 'Full-grain upper — HSF-001', 'uppers', 'bag', 12, 80, 960, 380, 364800, d(7));
  db.prepare("INSERT INTO purchases (supplier_id, item, category_slug, pack_type, pairs_per_pack, quantity, total_pairs, unit_price, amount, date) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(2, 'Shoe adhesive', 'chemicals', 'kg', 0, 60, 0, 1250, 75000, d(7));

  // Manual ready stock + a production entry that made some of it
  db.prepare("INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, date) VALUES (?,?,24,10,240,'manual',?)").run(1, 'Export 24', d(6));
  db.prepare("INSERT INTO production_entries (article_id, date, line, shift, operator, input_bags, pairs_per_bag, uppers_used, carton_type, pairs_per_carton, output_cartons, output_pairs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(1, d(5), 'Line A', 'Morning', 'Rashid Ali', 5, 12, 60, 'Export 24', 24, 5, 120);
  db.prepare("INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, reference_id, date) VALUES (?,?,24,5,120,'production',1,?)").run(1, 'Export 24', d(5));

  // Opening cash in roznamcha
  db.prepare("INSERT INTO roznamcha (direction, source, description, amount, date) VALUES ('in','opening','Opening cash balance',500000, ?)").run(d(30));

  // One invoice paid in full
  const inv = db.prepare("INSERT INTO invoices (invoice_no, customer_id, date, total_cartons, total_pairs, subtotal, discount, total, received, balance, payment_method, status, notes) VALUES ('HSF-0001', 1, ?, 4, 96, 528000, 8000, 520000, 520000, 0, 'cash', 'paid', 'First order')")
    .run(d(2)).lastInsertRowid;
  db.prepare('INSERT INTO invoice_lines (invoice_id, article_id, carton_type, pairs_per_carton, cartons, pairs, rate, amount) VALUES (?,?,?,24,4,96,5500,528000)').run(inv, 1, 'Export 24');
  db.prepare('INSERT INTO ready_shoes (article_id, carton_type, pairs_per_carton, cartons, pairs, source, reference_id, date) VALUES (1,?,24,-4,-96,\'sale\',?,?)').run('Export 24', inv, d(2));
  db.prepare("INSERT INTO payments (party_type, party_id, party_name, direction, amount, method, date) VALUES ('customer', 1, 'Karachi Footwear Mart', 'in', 520000, 'Cash', ?)").run(d(2));
  db.prepare("INSERT INTO roznamcha (direction, source, party, description, amount, method, date) VALUES ('in','customer_receipt','Karachi Footwear Mart','Invoice HSF-0001',520000,'Cash',?)").run(d(2));

  // One kharcha
  db.prepare("INSERT INTO kharcha (date, category, description, amount, method) VALUES (?,?,?,?, 'Cash')").run(d(1), 'Electricity', 'Factory meter bill', 45000);
  db.prepare("INSERT INTO roznamcha (direction, source, description, category, amount, method, date) VALUES ('out','kharcha','Electricity — Factory meter bill','Electricity',45000,'Cash',?)").run(d(1));

  // Supplier payment
  db.prepare("INSERT INTO payments (party_type, party_id, party_name, direction, amount, method, date) VALUES ('supplier', 2, 'Pak Soles & Chemicals', 'out', 40000, 'Bank', ?)").run(d(1));
  db.prepare("INSERT INTO roznamcha (direction, source, party, description, amount, method, date) VALUES ('out','supplier_payment','Pak Soles & Chemicals','Payment against purchase',40000,'Bank',?)").run(d(1));
});

seed();

module.exports = { db, hashPassword, verifyPassword };
