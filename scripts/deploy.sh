#!/usr/bin/env bash
# Runs on the EC2 host via appleboy/ssh-action.
# Pulls the latest code, installs production deps, migrates Postgres, restarts under pm2.

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/member-registration-app}"
BRANCH="${BRANCH:-main}"
APP_NAME="member-registration-app"

log() { printf '[deploy] %s\n' "$*"; }

log "app dir: $APP_DIR"
log "branch:  $BRANCH"

if [ ! -d "$APP_DIR" ]; then
  log "cloning repository into $APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  log "fetching latest changes"
  cd "$APP_DIR"
  git fetch --prune origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd --exclude=.env --exclude=node_modules
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  log "ERROR: .env not found in $APP_DIR. Create it with PG* and SESSION_SECRET values."
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a

log "node $(node -v) / npm $(npm -v)"

log "installing production dependencies"
npm ci --omit=dev || npm install --omit=dev

log "running database migrations"
npm run migrate

log "seeding login users (idempotent)"
npm run seed

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    log "restarting $APP_NAME under pm2"
    pm2 restart "$APP_NAME" --update-env
  else
    log "starting $APP_NAME under pm2"
    pm2 start ecosystem.config.cjs --only "$APP_NAME"
  fi
  pm2 save
  pm2 logs "$APP_NAME" --lines 15 --nostream || true
else
  log "pm2 not found. Install it with: npm install -g pm2 && pm2 startup"
  exit 1
fi

log "deployment complete"