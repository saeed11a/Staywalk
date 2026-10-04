const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Hiker ERP API listening on ${port}`));
