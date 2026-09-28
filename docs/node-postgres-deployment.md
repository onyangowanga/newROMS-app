# ROMS Node/PostgreSQL deployment

This is the replacement path for PocketBase. Keep PostgreSQL private and expose only the Node API through Nginx.

## PostgreSQL

Use a dedicated database and least-privilege user. Example values:

```text
Database: roms
User: roms_user
Host: 127.0.0.1
Port: 5432
```

Set the API environment:

```bash
DATABASE_URL=postgresql://roms_user:CHANGE_ME@127.0.0.1:5432/roms?schema=public
JWT_SECRET=GENERATE_A_LONG_RANDOM_VALUE
PORT=3000
CORS_ORIGIN=https://new.rabiyaroms.top
```

## API service

Copy the `server/` directory to `/opt/roms-api`, install dependencies, then:

```bash
cd /opt/roms-api
npm ci
npx prisma generate
npx prisma migrate deploy
SEED_PASSWORD='CHANGE_ME' npm run seed
```

Create `/etc/systemd/system/roms-api.service`:

```ini
[Unit]
Description=ROMS Node API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/roms-api
EnvironmentFile=/opt/roms-api/.env
ExecStart=/usr/bin/node /opt/roms-api/src/index.js
Restart=on-failure
RestartSec=5
User=roms
Group=roms
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now roms-api
curl http://127.0.0.1:3000/api/health
```

## Nginx

Replace the PocketBase `/api/` proxy in the `new.rabiyaroms.top` server block with:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Remove the PocketBase `/_/` location after migration. Keep the existing static frontend location unchanged.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl https://new.rabiyaroms.top/api/health
```
