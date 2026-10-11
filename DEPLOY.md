# Deployment to EC2 (GitHub Actions)

`.github/workflows/deploy.yml` pushes each commit on `main` to an EC2 host over SSH,
installs production dependencies, migrates PostgreSQL, and restarts the app under pm2.

## One-time host setup

On the EC2 instance (Ubuntu 22.04/24.04):

```bash
sudo apt update && sudo apt install -y git nodejs npm postgresql-client
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
pm2 startup          # run the printed sudo command
pm2 save

sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

Give the `ubuntu` user a key pair (or attach an existing one via EC2 console). The
private key you attach must be the one saved as the `EC2_SSH_PRIVATE_KEY` secret.

## Repository secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Example | Required |
| --- | --- | --- |
| `EC2_HOST` | `203.0.113.25` or a hostname | yes |
| `EC2_USER` | `ubuntu` | yes |
| `EC2_SSH_PRIVATE_KEY` | full private key, `-----BEGIN OPENSSH PRIVATE KEY-----` … | yes |
| `EC2_SSH_PORT` | `22` | no |
| `EC2_APP_DIR` | `/home/ubuntu/member-registration-app` | no (defaults to that) |
| `PG_HOST` / `PG_PORT` / `PG_USER` / `PG_PASSWORD` / `PG_DATABASE` | Postgres connection details | optional (pre-flight check) |

Optional repository **variable**: `APP_PORT` (defaults to `3000`).

## On the host

`scripts/deploy.sh` clones the repo into `$APP_DIR` if it is missing, so the directory
stays clean between runs. It refuses to continue without a `.env` file, and `.env` is
git-ignored so each host keeps its own credentials:

```bash
cd /home/ubuntu/member-registration-app   # after the first deploy
cat > .env <<'EOF'
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-postgres-password
PGDATABASE=membership_app
PORT=3000
SESSION_SECRET=<long random string>
NODE_ENV=production
EOF
chmod 600 .env
```

Generate a session secret with `openssl rand -hex 32`.

If Postgres is running on the host itself, add this rule once so the app can connect
over TCP instead of only the Unix socket:

```bash
sudo sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
sudo systemctl restart postgresql
```

## First run

Push the workflow to `main`, then either watch it in the Actions tab or trigger it
manually with **Run workflow**. The job clones the repo; create `.env` afterwards using
the snippet above and re-run to confirm.

## Manual deploy

```bash
git push origin main
```

Or from the Actions tab → **Deploy** → **Run workflow**.

## Health check

`GET /health` on the host returns `{"status":"ok","database":"membership_app",...}`.
The workflow calls it after the restart and fails the job if the app is not responding.

## Logs

```bash
pm2 logs member-registration-app
pm2 monit
```

## Rollback

```bash
cd /home/ubuntu/member-registration-app
git log --oneline -5
git checkout <previous-sha>
npm ci --omit=dev && npm run migrate
pm2 restart member-registration-app
```