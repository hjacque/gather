#!/usr/bin/env bash
# Daily Postgres backup — run via cron: 0 3 * * * /home/deploy/gather/scripts/backup.sh
set -euo pipefail

BACKUP_DIR="/home/$(whoami)/backups/gather"
DATE=$(date +%Y%m%d)
FILE="$BACKUP_DIR/gather_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# DATABASE_URL must be in the environment or loaded from the api .env
if [ -z "${DATABASE_URL:-}" ]; then
  set -a
  source "$(dirname "$0")/../apps/api/.env"
  set +a
fi

pg_dump "$DATABASE_URL" | gzip > "$FILE"

# Keep last 7 days
find "$BACKUP_DIR" -name "gather_*.sql.gz" -mtime +7 -delete

echo "Backup written to $FILE"
