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
PUBLIC_APP_URL=https://new.rabiyaroms.top
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailbox@example.com
SMTP_PASS=CHANGE_ME
MAIL_FROM=ROMS <mailbox@example.com>
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

## Applicant receipts and tracking email

Configure the SMTP values in `/opt/roms-api/.env` to email tracking details automatically after a public application and to enable receipt-page resends. If SMTP is not configured, applicants can still print the thermal-width ticket and download PDF or JPEG receipts; manual tracking requires the short tracking number and the email address on the application.

After deploying a schema that adds `Branch.trackingSequence` and `Candidate.publicTrackingToken`, run:

```bash
cd /opt/roms-api
npx prisma db push
npx prisma generate
npm run migrate:tracking-ids
sudo systemctl restart roms-api
```

Tracking IDs use `ROMS-{BRANCH CODE}-{SEQUENCE}` (for example, `ROMS-NRB-001`). Email links contain a separate private token; treat them as credentials and do not post them publicly.

## Usernames and password resets

Staff sign in with a username and password. Existing usernames are backfilled from the part of each email address before `@`; Super Admins can see them in **System Users**. New accounts receive a generated one-time password that must be replaced after confirming the account's registered email. Temporary passwords expire after 24 hours.

Staff change passwords from **Change password** by confirming their username, registered email, and current password. Forgot-password requests are handled by a Super Admin using **Reset password**. Configure SMTP using the variables above to send one-time credentials by email; without SMTP, the password is shown once in the admin screen for secure handoff.

After deploying the User schema fields, run:

```bash
cd /opt/roms-api
npx prisma db push
npx prisma generate
npm run migrate:usernames
sudo systemctl restart roms-api
```

## Branch administration and payment categories

The supported staff roles are Super Admin, Finance Global, Branch Admin, Branch Finance, Branch Staff, and Recruiter. Branch Admin accounts are attached to a single branch and may manage only that branch's staff and finance users.

Payment entries use Receipt, Refund, or Other. Receipts add to a candidate's Commission Total paid amount, refunds subtract from it, and Other requires a description but does not change commission balance. After adding the branch-admin role and transaction description field, run `npx prisma db push` and `npx prisma generate` from `/opt/roms-api`, then restart `roms-api`.
