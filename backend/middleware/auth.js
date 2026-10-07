const { query } = require('../db');

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query(`
      SELECT
        s.token,
        u.id,
        u.name,
        u.email
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = $1
    `, [token]);

    const session = result.rows[0];

    if (!session) {
      return res.status(401).json({
        error: 'Session expired — please sign in again'
      });
    }

    req.user = {
      id: session.id,
      name: session.name,
      email: session.email
    };

    next();
  } catch (error) {
    next(error);
  }
};
