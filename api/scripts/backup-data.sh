#!/usr/bin/env bash
# Backup helper for VPS-local data.
# - Mongo: prefer Databasus (https://databasus.com/mongodb-backup). Set BACKUP_MONGO=0 when Databasus owns Mongo.
# - MinIO: always archived when ./minio_data exists.
# Usage (from api repo root): ./scripts/backup-data.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_ROOT="${BACKUP_ROOT:-$ROOT/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_MONGO="${BACKUP_MONGO:-1}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"

MONGO_CONTAINER="${MONGO_CONTAINER:-mongodb_container}"
URI="${MONGODB_URI:-}"

if [[ "$BACKUP_MONGO" == "1" ]]; then
  if [[ -z "$URI" ]]; then
    echo "MONGODB_URI is not set (load .env or export it)." >&2
    exit 1
  fi
  echo "==> Mongo dump → $DEST/mongo.archive.gz"
  docker exec "$MONGO_CONTAINER" mongodump --uri="$URI" --archive --gzip > "$DEST/mongo.archive.gz"
else
  echo "==> skip Mongo (BACKUP_MONGO=0 — use Databasus)"
fi

if [[ -d "$ROOT/minio_data" ]]; then
  echo "==> MinIO volume → $DEST/minio_data.tar.gz"
  tar -czf "$DEST/minio_data.tar.gz" -C "$ROOT" minio_data
else
  echo "==> skip MinIO (./minio_data missing)"
fi

echo "==> prune backups older than ${KEEP_DAYS} days under $BACKUP_ROOT"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+$KEEP_DAYS" -exec rm -rf {} +

echo "==> done: $DEST"
du -sh "$DEST"/* 2>/dev/null || true
