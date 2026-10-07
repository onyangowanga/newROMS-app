param(
  [string]$HostName = '185.167.97.200',
  [string]$UserName = 'root',
  [string]$RemotePath = '/opt/roms-api',
  [switch]$SkipDatabaseSync
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'deploy-common.ps1')

$target = Get-DeploymentTarget $HostName $UserName
$databaseStep = if ($SkipDatabaseSync) { 'echo Database sync skipped.' } else { 'npx prisma db push' }

Write-Host "Uploading backend to ${target}:${RemotePath}..."
Invoke-RemoteCommand $target "test -f '$RemotePath/.env' || { echo 'Missing $RemotePath/.env on the VPS.' >&2; exit 1; }; mkdir -p '$RemotePath'"
Invoke-DeploymentCommand 'scp' @(
  '-o', 'BatchMode=yes', '-r',
  'server/package.json', 'server/package-lock.json', 'server/prisma', 'server/src',
  "${target}:${RemotePath}/"
)
Invoke-DeploymentCommand 'scp' @('-o', 'BatchMode=yes', 'server/roms-api.service', "${target}:/tmp/roms-api.service")

$remoteCommand = @"
set -eu
cd '$RemotePath'
npm ci
npx prisma generate
$databaseStep
install -m 644 /tmp/roms-api.service /etc/systemd/system/roms-api.service
systemctl daemon-reload
systemctl enable roms-api
systemctl restart roms-api
if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/conf.d ]; then
  cat >/etc/nginx/conf.d/roms-upload-limit.conf <<'NGINXCONF'
client_max_body_size 20m;
NGINXCONF
  nginx -t
  systemctl reload nginx
fi
curl --retry 15 --retry-delay 1 --retry-connrefused --fail --silent --show-error http://127.0.0.1:3000/api/health
rm -f /tmp/roms-api.service
"@
Write-Host 'Installing dependencies, syncing the schema, and restarting the API...'
Invoke-RemoteCommand $target $remoteCommand
Write-Host 'Backend deployment complete.'