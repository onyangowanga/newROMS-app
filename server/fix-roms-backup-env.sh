#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p /var/lib/roms
if [ -f /root/.config/rclone/rclone.conf ]; then
  cp -f /root/.config/rclone/rclone.conf /var/lib/roms/rclone.conf
fi
chmod 600 /var/lib/roms/rclone.conf 2>/dev/null || true

if [ -f /etc/roms-backup.env ]; then
  sed -i 's#^RCLONE_CONFIG=.*#RCLONE_CONFIG=/var/lib/roms/rclone.conf#' /etc/roms-backup.env
  sed -i 's#^RCLONE_REMOTE=.*#RCLONE_REMOTE=roms-encrypted:ROMS/database-and-documents#' /etc/roms-backup.env
else
  printf '%s\n' 'RCLONE_REMOTE=roms-encrypted:ROMS/database-and-documents' 'RCLONE_CONFIG=/var/lib/roms/rclone.conf' > /etc/roms-backup.env
fi
chmod 600 /etc/roms-backup.env

if ! grep -q 'EnvironmentFile=/etc/roms-backup.env' /etc/systemd/system/roms-api.service; then
  sed -i '/^\[Service\]/a EnvironmentFile=/etc/roms-backup.env' /etc/systemd/system/roms-api.service
fi

if ! grep -q 'EnvironmentFile=/etc/roms-backup.env' /etc/systemd/system/roms-api.service; then
  echo 'Failed to add /etc/roms-backup.env to roms-api.service' >&2
  exit 1
fi

systemctl daemon-reload
systemctl restart roms-api

curl -sS -i http://127.0.0.1:3000/api/admin/backups
