'use strict';

const { pool, ensureDatabaseExists } = require('./pool');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS members (
  id                SERIAL PRIMARY KEY,
  name              TEXT        NOT NULL,
  phone_number      TEXT        NOT NULL,
  institution       TEXT        NOT NULL,
  email             TEXT,
  social_media      TEXT,
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT members_phone_number_key UNIQUE (phone_number)
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS members_name_idx      ON members (name);
CREATE INDEX IF NOT EXISTS members_institution_idx ON members (institution);
CREATE INDEX IF NOT EXISTS members_created_at_idx  ON members (created_at DESC);
`;

async function migrate() {
  await ensureDatabaseExists();
  await pool.query(SCHEMA_SQL);
  console.log('[db] schema is up to date');
}

module.exports = { migrate, SCHEMA_SQL };

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db] migration failed:', err.message);
      process.exit(1);
    });
}
