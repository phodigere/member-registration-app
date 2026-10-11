'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const redirectTo = encodeURIComponent(req.originalUrl || '/members');
  return res.redirect(`/login?next=${redirectTo}`);
}

module.exports = { requireAuth };
