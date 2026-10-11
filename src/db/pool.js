'use strict';

require('dotenv').config();

const { Pool, Client } = require('pg');

const config = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
};

const database = process.env.PGDATABASE || 'membership_app';

const pool = new Pool({
  ...config,
  database,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

async function ensureDatabaseExists() {
  const name = database.replace(/"/g, '');
  const admin = new Client({ ...config, database: 'postgres' });
  try {
    await admin.connect();
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${name}"`);
      console.log(`[db] created database "${name}"`);
    }
    return true;
  } finally {
    await admin.end().catch(() => {});
  }
}

async function query(text, params) {
  return pool.query(text, params);
}

async function healthCheck() {
  const { rows } = await pool.query('SELECT current_database() AS database, version() AS version');
  return rows[0];
}

module.exports = { pool, query, config, database, ensureDatabaseExists, healthCheck };
