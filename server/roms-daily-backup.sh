#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/roms}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-roms-postgres}"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/roms-api/uploads}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-14}"
REMOTE_RETENTION_DAYS="${REMOTE_RETENTION_DAYS:-90}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

for command in docker tar flock; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required command: $command" >&2; exit 1; }
done
if [[ -n "$RCLONE_REMOTE" ]]; then
  command -v rclone >/dev/null 2>&1 || { echo 'RCLONE_REMOTE is set but rclone is not installed.' >&2; exit 1; }
fi
[[ -d "$UPLOADS_DIR" ]] || { echo "Uploads directory not found: $UPLOADS_DIR" >&2; exit 1; }

install -d -m 700 "$BACKUP_DIR"
exec 9>/run/lock/roms-daily-backup.lock
flock -n 9 || { echo 'A ROMS backup is already running.' >&2; exit 1; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_file="roms-db-${stamp}.dump"
uploads_file="roms-uploads-${stamp}.tar.gz"
database_tmp="$BACKUP_DIR/.${database_file}.tmp"
uploads_tmp="$BACKUP_DIR/.${uploads_file}.tmp"
trap 'rm -f "$database_tmp" "$uploads_tmp"' EXIT

docker exec "$POSTGRES_CONTAINER" sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$database_tmp"
[[ -s "$database_tmp" ]] || { echo 'Database dump is empty.' >&2; exit 1; }
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$database_tmp" >/dev/null
mv "$database_tmp" "$BACKUP_DIR/$database_file"

tar -czf "$uploads_tmp" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
[[ -s "$uploads_tmp" ]] || { echo 'Uploads archive is empty.' >&2; exit 1; }
mv "$uploads_tmp" "$BACKUP_DIR/$uploads_file"

if [[ -n "$RCLONE_REMOTE" ]]; then
  rclone mkdir "$RCLONE_REMOTE"
  rclone copyto "$BACKUP_DIR/$database_file" "${RCLONE_REMOTE%/}/$database_file" --immutable
  rclone copyto "$BACKUP_DIR/$uploads_file" "${RCLONE_REMOTE%/}/$uploads_file" --immutable
  rclone delete "$RCLONE_REMOTE" --min-age "${REMOTE_RETENTION_DAYS}d" --include 'roms-db-*.dump' --include 'roms-uploads-*.tar.gz'
else
  echo 'RCLONE_REMOTE is empty; local backups completed but were not uploaded.' >&2
fi

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'roms-db-*.dump' -o -name 'roms-uploads-*.tar.gz' \) -mtime "+$LOCAL_RETENTION_DAYS" -delete
echo "ROMS database and uploads backed up to $RCLONE_REMOTE at $stamp"