const express = require('express');
const { ready } = require('./db');

const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./middleware/auth'), require('./routes'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && !err.status) console.error(err);

  res
    .status((err && err.status) || 500)
    .json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;

ready
  .then(() => {
    app.listen(port, () => {
      console.log(
        `HIKER Shoes Factory ERP API listening on port ${port}`
      );
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
