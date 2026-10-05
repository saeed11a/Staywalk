const express = require('express');
const auth = require('./middleware/auth');
const { db } = require('./db');

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', auth, require('./routes'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && !err.status) console.error(err);
  res.status((err && err.status) || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`HIKER Shoes Factory ERP API listening on ${port}`));
