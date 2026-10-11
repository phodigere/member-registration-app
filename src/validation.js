'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOCIAL_RE = /^(https?:\/\/)?([\w.-]+@[\w.-]+\.\w+)?@?[\w.-]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

const MAX_TAG_COUNT = 10;
const MAX_TAG_LENGTH = 30;

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function parseTags(value) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const tag = clean(item).replace(/^#/, '');
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAG_COUNT) break;
  }
  return out;
}

function validateMember(body) {
  const errors = {};

  const name = clean(body.name);
  const phoneNumber = clean(body.phone_number ?? body.phoneNumber);
  const institution = clean(body.institution);
  const email = clean(body.email);
  const socialMedia = clean(body.social_media ?? body.socialMedia);
  const tags = parseTags(body.tags);

  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > 120) {
    errors.name = 'Name must be 120 characters or fewer.';
  }

  if (!phoneNumber) {
    errors.phone_number = 'Phone number is required.';
  } else if (!PHONE_RE.test(phoneNumber)) {
    errors.phone_number = 'Enter a valid phone number (7-20 digits).';
  }

  if (!institution) {
    errors.institution = 'Institution is required.';
  } else if (institution.length > 150) {
    errors.institution = 'Institution must be 150 characters or fewer.';
  }

  if (email && !EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (email && email.length > 200) {
    errors.email = 'Email must be 200 characters or fewer.';
  }

  if (socialMedia && !SOCIAL_RE.test(socialMedia)) {
    errors.social_media = 'Enter a valid handle, URL, or email.';
  } else if (socialMedia && socialMedia.length > 200) {
    errors.social_media = 'Social media must be 200 characters or fewer.';
  }

  return {
    errors,
    values: { name, phone_number: phoneNumber, institution, email, social_media: socialMedia, tags },
  };
}

function validateCredentials(body) {
  const errors = {};
  const username = clean(body.username);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username) errors.username = 'Username is required.';
  else if (username.length < 3) errors.username = 'Username must be at least 3 characters.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

  return { errors, values: { username, password } };
}

module.exports = { validateMember, validateCredentials, parseTags, clean };
