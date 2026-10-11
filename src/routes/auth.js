'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { validateCredentials } = require('../validation');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/members');
  res.render('login', {
    title: 'Sign in',
    error: null,
    values: { username: '' },
    next: req.query.next || '',
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const { errors, values } = validateCredentials(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).render('login', {
        title: 'Sign in',
        error: Object.values(errors)[0],
        values: { username: values.username },
        next: req.body.next || '',
      });
    }

    const { rows } = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [
      values.username,
    ]);
    const user = rows[0];

    const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    const ok = await bcrypt.compare(values.password, hash);

    if (!user || !ok) {
      return res.status(401).render('login', {
        title: 'Sign in',
        error: 'Invalid username or password.',
        values: { username: values.username },
        next: req.body.next || '',
      });
    }

    await new Promise((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve()))
    );
    req.session.user = { id: user.id, username: user.username };
    req.session.save(() => res.redirect(req.body.next || '/members'));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('mra.sid');
    res.redirect('/login');
  });
});

module.exports = router;
