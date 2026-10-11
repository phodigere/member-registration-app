'use strict';

const express = require('express');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/requireAuth');
const { validateMember, parseTags } = require('../validation');

const router = express.Router();

router.use(requireAuth);

const SORTS = {
  newest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
  name: 'name ASC',
  institution: 'institution ASC',
};

async function listMembers({ search, sort, institution }) {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR institution ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (institution) {
    params.push(institution);
    where.push(`institution = $${params.length}`);
  }

  const orderBy = SORTS[sort] || SORTS.newest;
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT id, name, phone_number, institution, email, social_media, tags, created_at
       FROM members ${whereSql}
      ORDER BY ${orderBy}
      LIMIT 500`,
    params
  );
  return rows;
}

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').toString().trim().slice(0, 100);
    const sort = (req.query.sort || 'newest').toString();
    const institution = (req.query.institution || '').toString().trim().slice(0, 150);

    const members = await listMembers({ search, sort, institution });
    const { rows: institutions } = await query(
      'SELECT DISTINCT institution FROM members ORDER BY institution ASC'
    );

    res.render('members', {
      title: 'Members',
      members,
      institutions: institutions.map((r) => r.institution),
      flash: req.session.flash || null,
      filters: { search, sort, institution },
      formValues: {},
      errors: null,
    });
    req.session.flash = null;
  } catch (err) {
    next(err);
  }
});

router.get('/register', (req, res) => {
  res.render('members', {
    title: 'Register member',
    members: [],
    institutions: [],
    flash: req.session.flash || null,
    filters: { search: '', sort: 'newest', institution: '' },
    formValues: {},
    errors: null,
    openForm: true,
  });
  req.session.flash = null;
});

function renderWithErrors(res, values, errors, extra = {}) {
  return res.status(400).render('members', {
    title: 'Register member',
    members: [],
    institutions: [],
    flash: null,
    filters: { search: '', sort: 'newest', institution: '' },
    formValues: values,
    openForm: true,
    errors,
    ...extra,
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const { errors, values } = validateMember(req.body);

    if (Object.keys(errors).length > 0) {
      return renderWithErrors(res, values, errors);
    }

    let member;
    try {
      const { rows } = await query(
        `INSERT INTO members (name, phone_number, institution, email, social_media, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, phone_number, institution, email, social_media, tags, created_at`,
        [
          values.name,
          values.phone_number,
          values.institution,
          values.email || null,
          values.social_media || null,
          values.tags,
        ]
      );
      member = rows[0];
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'members_phone_number_key') {
        return renderWithErrors(res, values, {
          phone_number: 'A member with this phone number already exists.',
        });
      }
      throw err;
    }

    req.session.flash = {
      type: 'success',
      message: `Member "${member.name}" registered successfully (ID #${member.id}).`,
    };

    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(201).json({ member });
    }
    return res.redirect('/members');
  } catch (err) {
    next(err);
  }
});

router.get('/api/members', async (req, res, next) => {
  try {
    const search = (req.query.search || '').toString().trim().slice(0, 100);
    const sort = (req.query.sort || 'newest').toString();
    const members = await listMembers({ search, sort });
    res.json({ count: members.length, members });
  } catch (err) {
    next(err);
  }
});

router.get('/api/tags', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT tag, COUNT(*)::int AS count
         FROM members, UNNEST(tags) AS tag
        GROUP BY tag
        ORDER BY count DESC, tag ASC
        LIMIT 50`
    );
    res.json({ tags: rows });
  } catch (err) {
    next(err);
  }
});

async function deleteMember(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid member id.' });

    const { rowCount } = await query('DELETE FROM members WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Member not found.' });

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ deleted: id });
    }
    req.session.flash = { type: 'success', message: `Member #${id} removed.` };
    return res.redirect('/members');
  } catch (err) {
    next(err);
  }
}

router.post('/:id/delete', deleteMember);
router.delete('/:id', deleteMember);

module.exports = { router, listMembers, parseTags };
