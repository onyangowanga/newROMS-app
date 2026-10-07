## Daily database and document backups

The daily job creates a PostgreSQL custom-format dump and a compressed archive of `/opt/roms-api/uploads`. Local archives are stored root-only under `/var/backups/roms` with 14-day retention. Once a Drive remote is configured, both archives are uploaded to its encrypted `rclone crypt` remote and Drive copies older than 90 days are pruned. The timer runs at 02:00 Africa/Nairobi and catches up after downtime.

Install the backup script and units from `server/`:

```bash
sudo apt-get update
sudo apt-get install -y rclone
sudo install -o root -g root -m 750 roms-daily-backup.sh /usr/local/sbin/roms-daily-backup.sh
sudo install -o root -g root -m 750 roms-restore-backup.sh /usr/local/sbin/roms-restore-backup.sh
sudo install -d -o root -g root -m 700 /var/backups/roms
sudo install -o root -g root -m 600 roms-backup.env.example /etc/roms-backup.env
sudo install -o root -g root -m 644 roms-daily-backup.service /etc/systemd/system/roms-daily-backup.service
sudo install -o root -g root -m 644 roms-daily-backup.timer /etc/systemd/system/roms-daily-backup.timer
sudo install -o root -g root -m 644 roms-restore@.service /etc/systemd/system/roms-restore@.service
```

Configure two rclone remotes as root with `sudo rclone config --config /root/.config/rclone/rclone.conf`: a Google Drive remote named `roms-drive`, then a `crypt` remote named `roms-encrypted` pointing to a private Drive folder such as `roms-drive:ROMS/encrypted-backups`. If rclone asks for browser authorization, open its printed URL, sign in to Google, and enter the returned code only into the VPS terminal. Choose strong crypt password and salt values and keep them in the root-only rclone config; they are needed to restore encrypted files. Do not share the Drive folder, authorization code, or crypt credentials in chat.

Set the remote in `/etc/roms-backup.env`:

```text
RCLONE_REMOTE=roms-encrypted:ROMS/database-and-documents
RCLONE_CONFIG=/root/.config/rclone/rclone.conf
```

Until `RCLONE_REMOTE` is set, the timer still creates local backups but logs that it skipped Drive upload. Then test and enable the schedule:

```bash
sudo systemctl daemon-reload
sudo systemctl start roms-daily-backup.service
sudo journalctl -u roms-daily-backup.service -n 30 --no-pager
sudo systemctl enable --now roms-daily-backup.timer
systemctl list-timers roms-daily-backup.timer
```

Super Admins can also open **Backups** in ROMS, run **Back up to Google Drive**, choose a paired database/uploads snapshot, and trigger **Restore selected snapshot** after typing `RESTORE ROMS`. Restore creates a local pre-restore copy, stops the API while replacing the database and uploads, and then restarts it. Do not close the browser and wait for the API to return before signing in again.

The Drive copy contains both `roms-db-*.dump` and `roms-uploads-*.tar.gz`. For recovery, download both using the `roms-encrypted` remote, restore the dump into a separate database first, and extract the uploads archive back to the configured uploads directory. Keep the crypt password and salt separate from the server; without them the Drive backup cannot be decrypted.
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

The supported staff roles are Super Admin, Finance Global, Branch Admin, Branch Finance, Branch Staff, and Recruiter. Branch Admin accounts are attached to a single branch and have read-only access to that branch's staff accounts and user activity report. Only Super Admin can create, edit, delete or reset staff accounts. See [the current system blueprint](system-blueprint.md) for source-verified permissions and live deployment facts; the least-privilege service example above is not the current root-run operational service.

Payment entries use Receipt, Refund, or Other. Receipts add to a candidate's Commission Total paid amount, refunds subtract from it, and Other requires a description but does not change commission balance. After adding the branch-admin role and transaction description field, run `npx prisma db push` and `npx prisma generate` from `/opt/roms-api`, then restart `roms-api`.
