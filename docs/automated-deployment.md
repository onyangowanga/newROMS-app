# Automated VPS deployment

The repository includes three PowerShell deployment scripts for the VPS at `new.rabiyaroms.top`:

```powershell
.\deploy-frontend.ps1
.\deploy-backend.ps1
.\deploy-all.ps1
```

Run them from the project root. They use the existing OpenSSH key configured on the development machine and default to `root@185.167.97.200`.

## What each script does

`deploy-frontend.ps1` rebuilds `tailwind.css`, then uploads the static frontend files, JavaScript, and icons. Use `-SkipBuild` when the CSS has already been built.

`deploy-backend.ps1` uploads `server/package.json`, `package-lock.json`, `prisma`, and `src`, while leaving the VPS `.env`, `uploads`, and `node_modules` untouched. It installs dependencies, generates Prisma Client, runs `prisma db push`, reloads the systemd unit, restarts `roms-api`, and checks the local health endpoint. Use `-SkipDatabaseSync` only when the database schema is already synchronized.

`deploy-all.ps1` runs the frontend deployment followed by the backend deployment.

## Options

Use a different SSH account or paths when needed:

```powershell
.\deploy-all.ps1 -UserName deploy -HostName 185.167.97.200
.\deploy-frontend.ps1 -SkipBuild
.\deploy-backend.ps1 -SkipDatabaseSync
```

The SSH account must be able to write `/var/www/roms-new` and `/opt/roms-api`, install the systemd unit, restart `roms-api`, and run the API deployment commands. The VPS must already have Node.js, npm, PostgreSQL, and the production `/opt/roms-api/.env` configured.

If PowerShell blocks local scripts, run this once for the current user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```