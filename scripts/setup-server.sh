#!/usr/bin/env bash
# One-shot setup for a fresh Hetzner CX22 (Ubuntu 24.04).
# Run as a non-root user with sudo access.
# Usage: bash setup-server.sh
set -euo pipefail

DEPLOY_USER="$(whoami)"
REPO_URL="git@github.com:hjacque/gather.git"   # update if your remote differs
APP_DIR="$HOME/gather"

echo "==> Updating system packages"
sudo apt-get update -q && sudo apt-get upgrade -yq

echo "==> Installing system dependencies"
sudo apt-get install -yq \
  curl git build-essential \
  postgresql postgresql-contrib \
  chromium-browser \
  ca-certificates gnupg

echo "==> Installing Caddy"
sudo apt-get install -yq debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -q && sudo apt-get install -yq caddy

echo "==> Installing Node.js 20 via NVM"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm alias default 20

echo "==> Installing PM2"
npm install -g pm2

echo "==> Setting up Postgres database"
sudo -u postgres psql -c "CREATE USER gather WITH PASSWORD 'changeme';" || true
sudo -u postgres psql -c "CREATE DATABASE gather OWNER gather;" || true
# Update the password in apps/api/.env after cloning

echo "==> Cloning repository"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo ""
echo "==> NEXT STEPS (manual):"
echo "  1. Edit apps/api/.env  — set DATABASE_URL with your Postgres password"
echo "  2. Edit Caddyfile      — replace gather.example.com with your domain"
echo "  3. Point your domain's A record to this server's IP"
echo "  4. Run: cd $APP_DIR && npm ci && npm run build"
echo "  5. Run: cd apps/api && npx prisma migrate deploy && cd ../.."
echo "  6. Run: pm2 start ecosystem.config.js && pm2 save && pm2 startup"
echo "  7. Run: sudo cp Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy"
echo "  8. Add cron for backups: (crontab -e) → 0 3 * * * $APP_DIR/scripts/backup.sh"
echo "  9. Add GitHub secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY"
echo ""
echo "Done."
