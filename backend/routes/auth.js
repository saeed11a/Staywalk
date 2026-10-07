const express = require('express');
const crypto = require('crypto');
const { query, hashPassword, verifyPassword } = require('../db');

const router = express.Router();

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');

  await query(
    'INSERT INTO sessions (token, user_id) VALUES ($1, $2)',
    [token, userId]
  );

  return token;
}

function userOut(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'An account with this email already exists'
      });
    }

    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, hashPassword(password)]
    );

    const user = result.rows[0];
    const token = await createSession(user.id);

    res.status(201).json({
      token,
      user: userOut(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const token = await createSession(user.id);

    res.json({
      token,
      user: userOut(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (token) {
      await query(
        'DELETE FROM sessions WHERE token = $1',
        [token]
      );
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
