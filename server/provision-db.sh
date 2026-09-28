#!/usr/bin/env bash
set -euo pipefail
DB_PASS="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"
docker exec roms-postgres psql -U postgres -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'roms_user') THEN CREATE ROLE roms_user LOGIN PASSWORD '${DB_PASS}'; ELSE ALTER ROLE roms_user WITH PASSWORD '${DB_PASS}'; END IF; END \$\$;"
docker exec roms-postgres psql -U postgres -c "CREATE DATABASE roms OWNER roms_user;" 2>/dev/null || true
mkdir -p /opt/roms-api
printf 'DATABASE_URL=postgresql://roms_user:%s@127.0.0.1:5433/roms?schema=public\nJWT_SECRET=%s\nPORT=3000\nCORS_ORIGIN=https://new.rabiyaroms.top\n' "$DB_PASS" "$JWT_SECRET" > /opt/roms-api/.env
chmod 600 /opt/roms-api/.env
echo database-ready
