const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(process.env.DB_PATH || path.join(dataDir, 'hiker-erp.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  sizes TEXT,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  reorder_level REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  change REAL NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  salary REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  size TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS production (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  assigned_to INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  start_date TEXT,
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (assigned_to) REFERENCES employees(id)
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  issue_date TEXT NOT NULL DEFAULT (date('now')),
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
`);

const seed = db.transaction(() => {
  if (db.prepare('SELECT COUNT(*) AS c FROM products').get().c > 0) return;

  const customers = [
    ['Karachi Footwear Mart', '+92 300 1234567', 'sales@kfwmart.pk', 'Saddar, Karachi'],
    ['Lahore Shoe House', '+92 321 7654321', 'orders@lahoreshoe.pk', 'Liberty Market, Lahore'],
    ['Islamabad Traders', '+92 333 9876543', null, 'Blue Area, Islamabad'],
  ];
  for (const c of customers) {
    db.prepare('INSERT INTO customers (name, phone, email, address) VALUES (?,?,?,?)').run(...c);
  }

  const products = [
    ["Men's Hiking Boot", 'HKB-01', 'hiking', '40-45', 8500],
    ["Women's Trail Shoe", 'WTS-02', 'hiking', '36-41', 7200],
    ['Sports Runner', 'SPR-03', 'sports', '39-44', 5500],
    ['Leather Formal', 'LFM-04', 'formal', '39-44', 6800],
    ['Kids Sneaker', 'KSN-05', 'kids', '26-34', 3200],
  ];
  for (const p of products) {
    db.prepare('INSERT INTO products (name, code, category, sizes, price) VALUES (?,?,?,?,?)').run(...p);
  }

  const materials = [
    ['Full-grain leather', 'sq ft', 320, 150, 950],
    ['Rubber sole', 'pcs', 480, 200, 700],
    ['Cotton laces', 'pairs', 900, 300, 60],
    ['Shoe adhesive', 'kg', 24, 30, 1200],
    ['Metal eyelets', 'pcs', 1500, 500, 15],
  ];
  for (const m of materials) {
    db.prepare('INSERT INTO materials (name, unit, quantity, reorder_level, unit_cost) VALUES (?,?,?,?,?)').run(...m);
  }

  const employees = [
    ['Rashid Ali', 'cutter', '+92 301 1111111', 45000],
    ['Nasir Khan', 'stitcher', '+92 302 2222222', 40000],
    ['Bilal Ahmed', 'finisher', '+92 303 3333333', 38000],
    ['Sana Fatima', 'supervisor', '+92 304 4444444', 65000],
  ];
  for (const e of employees) {
    db.prepare('INSERT INTO employees (name, role, phone, salary) VALUES (?,?,?,?)').run(...e);
  }

  // Sample order + invoice + payment
  const orderId = db.prepare("INSERT INTO orders (customer_id, status) VALUES (1, 'completed')").run().lastInsertRowid;
  const items = [
    [orderId, 1, '42', 12, 8500],
    [orderId, 2, '38', 8, 7200],
  ];
  for (const it of items) {
    db.prepare('INSERT INTO order_items (order_id, product_id, size, qty, unit_price) VALUES (?,?,?,?,?)').run(...it);
  }
  const invoiceId = db.prepare(
    "INSERT INTO invoices (order_id, invoice_no, due_date) VALUES (?, 'INV-2026-0001', date('now','+30 days'))"
  ).run(orderId).lastInsertRowid;
  db.prepare('INSERT INTO payments (invoice_id, amount, method) VALUES (?, 100000, ?)').run(invoiceId, 'bank transfer');
  db.prepare("UPDATE invoices SET status = 'partial' WHERE id = ?").run(invoiceId);

  db.prepare("INSERT INTO production (product_id, qty, assigned_to, status) VALUES (1, 30, 1, 'in_progress')").run();
});

seed();

module.exports = db;
