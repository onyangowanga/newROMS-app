# Deploy ROMS at `new.rabiyaroms.top`

This setup keeps the existing application untouched. Nginx listens on ports 80/443 and selects the application by hostname. PocketBase runs privately on `127.0.0.1:8091`, so it does not compete with another service using the public web ports.

## DNS

Create or confirm this DNS record:

```text
Type: A
Name: new
Value: 185.167.97.200
TTL: 300
```

Check propagation from the VPS:

```bash
getent hosts new.rabiyaroms.top
```

The result should contain `185.167.97.200`.

## Upload the frontend

From the project folder on your development machine, upload the static files to a dedicated directory. Replace `YOUR_SSH_USER` with your Kamatera SSH user.

```bash
ssh YOUR_SSH_USER@185.167.97.200 'sudo mkdir -p /var/www/roms-new && sudo chown -R $USER:$USER /var/www/roms-new'
scp -r index.html styles.css js docs YOUR_SSH_USER@185.167.97.200:/var/www/roms-new/
```

The uploaded `js/runtime-config.js` already points to `https://new.rabiyaroms.top`.

## Install Nginx and HTTPS

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/new.rabiyaroms.top`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name new.rabiyaroms.top;

    root /var/www/roms-new;
    index index.html;

    # PocketBase API used by the ROMS frontend.
    location /api/ {
        proxy_pass http://127.0.0.1:8091;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PocketBase admin UI.
    location /_/ {
        proxy_pass http://127.0.0.1:8091;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static ROMS frontend. ES modules require HTTP(S), not file://.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable it without disabling the existing app:

```bash
sudo ln -s /etc/nginx/sites-available/new.rabiyaroms.top /etc/nginx/sites-enabled/new.rabiyaroms.top
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d new.rabiyaroms.top
```

When Certbot asks about redirecting HTTP to HTTPS, choose the redirect option.

## Start PocketBase on the private port

Use the systemd unit in [POCKETBASE-UBUNTU.md](./POCKETBASE-UBUNTU.md), then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl status pocketbase
curl -I http://127.0.0.1:8091/api/health
curl -I https://new.rabiyaroms.top/
```

Open the PocketBase admin UI at `https://new.rabiyaroms.top/_/`, create the first admin account, and configure the collections from [pocketbase-schema.md](./pocketbase-schema.md).

## Firewall

Only SSH and the public web ports need to be exposed. Do not expose PocketBase's private port:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 8090/tcp
sudo ufw deny 8091/tcp
sudo ufw enable
sudo ufw status
```

If the existing app already manages UFW, keep its current rules and only ensure `8091` is not publicly allowed.

## Troubleshooting

```bash
sudo nginx -t
sudo journalctl -u nginx -n 100 --no-pager
sudo journalctl -u pocketbase -n 100 --no-pager
curl -I http://127.0.0.1:8091/api/health
```

A `502 Bad Gateway` means Nginx cannot reach PocketBase. A browser CORS error usually means the request is not reaching the same HTTPS hostname or the PocketBase URL in `js/runtime-config.js` was not uploaded with the rest of the frontend.
