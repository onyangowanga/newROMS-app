#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

snapshot="${1:-}"
[[ "$snapshot" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo 'Invalid snapshot identifier.' >&2; exit 2; }
: "${RCLONE_REMOTE:?RCLONE_REMOTE is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/roms}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-roms-postgres}"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/roms-api/uploads}"
command -v docker >/dev/null
command -v rclone >/dev/null
command -v tar >/dev/null
command -v flock >/dev/null

install -d -m 700 "$BACKUP_DIR"
exec 9>/run/lock/roms-daily-backup.lock
flock -n 9 || { echo 'Another backup or restore is already running.' >&2; exit 1; }

work_dir="$(mktemp -d "$BACKUP_DIR/.restore-${snapshot}.XXXXXX")"
pre_restore_dir="$BACKUP_DIR/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
api_stopped=0
cleanup() {
  result=$?
  if [[ "$api_stopped" == 1 ]]; then systemctl start roms-api || true; fi
  rm -rf "$work_dir"
  exit "$result"
}
trap cleanup EXIT

database_file="roms-db-${snapshot}.dump"
uploads_file="roms-uploads-${snapshot}.tar.gz"
rclone copyto "${RCLONE_REMOTE%/}/$database_file" "$work_dir/$database_file"
rclone copyto "${RCLONE_REMOTE%/}/$uploads_file" "$work_dir/$uploads_file"
[[ -s "$work_dir/$database_file" && -s "$work_dir/$uploads_file" ]] || { echo 'The selected backup is incomplete.' >&2; exit 1; }
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$work_dir/$database_file" >/dev/null
upload_name="$(basename "$UPLOADS_DIR")"
tar -tzf "$work_dir/$uploads_file" | awk -F/ -v expected="$upload_name" '$1 != expected { exit 1 }' || { echo 'The uploads archive contains an unexpected path.' >&2; exit 1; }

install -d -m 700 "$pre_restore_dir"
docker exec "$POSTGRES_CONTAINER" sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$pre_restore_dir/database.dump"
tar -czf "$pre_restore_dir/uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$upload_name"
[[ -s "$pre_restore_dir/database.dump" && -s "$pre_restore_dir/uploads.tar.gz" ]] || { echo 'Pre-restore backup verification failed.' >&2; exit 1; }
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$pre_restore_dir/database.dump" >/dev/null

systemctl stop roms-api
api_stopped=1
docker exec -i "$POSTGRES_CONTAINER" sh -c 'pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$work_dir/$database_file"

uploads_parent="$(dirname "$UPLOADS_DIR")"
old_uploads="$pre_restore_dir/uploads-before-restore"
mv "$UPLOADS_DIR" "$old_uploads"
if ! tar -xzf "$work_dir/$uploads_file" -C "$uploads_parent"; then
  rm -rf "$UPLOADS_DIR"
  mv "$old_uploads" "$UPLOADS_DIR"
  echo 'Could not extract the selected uploads archive.' >&2
  exit 1
fi

systemctl start roms-api
api_stopped=0
curl --fail --silent --show-error --retry 10 --retry-delay 1 http://127.0.0.1:3000/api/health >/dev/null
echo "Restored snapshot $snapshot. Pre-restore files are in $pre_restore_dir."