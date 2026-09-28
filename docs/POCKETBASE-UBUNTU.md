# PocketBase on Ubuntu 24

The frontend expects PocketBase at the URL in `js/runtime-config.js`. Use HTTPS in production.

## 1. Create a service account and directories

```bash
sudo useradd --system --home /opt/pocketbase --shell /usr/sbin/nologin pocketbase
sudo mkdir -p /opt/pocketbase /var/lib/pocketbase
sudo chown -R pocketbase:pocketbase /opt/pocketbase /var/lib/pocketbase
```

## 2. Download PocketBase

Check the current release at https://pocketbase.io/docs/ and replace the version below when needed.

```bash
cd /tmp
PB_VERSION=0.26.2
curl -LO "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
sudo apt-get update
sudo apt-get install -y unzip ca-certificates
unzip -o "pocketbase_${PB_VERSION}_linux_amd64.zip" -d pocketbase-release
sudo install -m 0755 pocketbase-release/pocketbase /opt/pocketbase/pocketbase
sudo chown pocketbase:pocketbase /opt/pocketbase/pocketbase
```

For an ARM VPS, use the matching `linux_arm64` release asset instead.

## 3. Run as a systemd service

```bash
sudo tee /etc/systemd/system/pocketbase.service >/dev/null <<'EOF'
[Unit]
Description=ROMS PocketBase backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=/var/lib/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8091 --dir=/var/lib/pocketbase/pb_data
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl status pocketbase
```

PocketBase is intentionally private on `127.0.0.1:8091`; Nginx exposes it through the HTTPS subdomain below. Do not open port `8091` in the VPS firewall.

## 4. Configure the collections

In the PocketBase admin UI, create the collections and API rules from [pocketbase-schema.md](./pocketbase-schema.md). Create the first branch before creating branch users. Then create at least one user for each role and set the `branch` relation for branch staff and branch finance users.

Create jobs and candidates through the admin UI for initial seed data. For repeatable imports, PocketBase also supports importing a JSON backup from the Settings area; take a backup after configuring the schema.

## 5. Put PocketBase behind HTTPS

Use Caddy, Nginx, or a managed reverse proxy. For this VPS, use the Nginx configuration in [new-subdomain-deployment.md](./new-subdomain-deployment.md).

```text
new.rabiyaroms.top {
    reverse_proxy 127.0.0.1:8091
}
```

The ROMS frontend and PocketBase API can share `https://new.rabiyaroms.top`; the Nginx locations route `/api/` and `/_/` to PocketBase while the remaining paths serve the static frontend.

## 6. Verify from the browser

```bash
curl -I http://127.0.0.1:8091/api/health
journalctl -u pocketbase -f
```

Sign in through ROMS with a PocketBase auth user. A branch staff account should only receive candidates from its `branch` relation, while jobs remain global. A branch finance account should only receive transactions for its branch.
