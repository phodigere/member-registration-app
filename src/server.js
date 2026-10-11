'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');

const { migrate } = require('./db/migrate');
const { healthCheck } = require('./db/pool');
const authRoutes = require('./routes/auth');
const { router: memberRoutes } = require('./routes/members');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('trust proxy', 1);

  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(
    session({
      store: new Pool({ connectionString: process.env.DATABASE_URL }),
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8,
      },
    })
  );

  app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
  });

  app.get('/health', async (req, res) => {
    try {
      const info = await healthCheck();
      res.json({ status: 'ok', database: info.database, version: info.version.split(' ').slice(0, 2).join(' ') });
    } catch (err) {
      res.status(503).json({ status: 'error', error: err.message });
    }
  });

  app.use('/', authRoutes);
  app.use('/members', memberRoutes);

  app.get('/', (req, res) => {
    res.redirect(req.session.user ? '/members' : '/login');
  });

  app.use((req, res) => {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(404).json({ error: 'Not found.' });
    }
    res.status(404).render('404', { title: 'Not found', currentUser: req.session.user || null });
  });

  app.use((err, req, res, _next) => {
    console.error('[error]', err);
    if (res.headersSent) return;
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(500).json({ error: 'Internal server error.' });
    }
    res.status(500).render('500', {
      title: 'Server error',
      currentUser: req.session.user || null,
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
    });
  });

  return app;
}

async function start() {
  await migrate();

  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`[server] member-registration-app running at http://localhost:${port}`);
  });
}

module.exports = { createApp, start };

if (require.main === module) {
  start().catch((err) => {
    console.error('[server] failed to start:', err);
    process.exit(1);
  });
}
