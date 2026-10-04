const { db } = require('../db');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const session = db.prepare(`
    SELECT s.token, u.id, u.name, u.email FROM sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(token);
  if (!session) return res.status(401).json({ error: 'Session expired — please sign in again' });
  req.user = { id: session.id, name: session.name, email: session.email };
  next();
};
