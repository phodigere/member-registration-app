'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { migrate } = require('./migrate');

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'registrar', password: 'registrar123', role: 'staff' },
];

async function seed() {
  await migrate();

  for (const { username, password } of DEFAULT_USERS) {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (rows.length > 0) {
      console.log(`[seed] user "${username}" already exists, skipping`);
      continue;
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`[seed] created user "${username}" with password "${password}"`);
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM members');
  console.log(`[seed] members table currently holds ${rows[0].count} member(s)`);
}

module.exports = { seed, DEFAULT_USERS };

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed:', err.message);
      process.exit(1);
    });
}
