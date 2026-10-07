param(
  [string]$HostName = '185.167.97.200',
  [string]$UserName = 'root',
  [string]$RemotePath = '/var/www/roms-new',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'deploy-common.ps1')

$target = Get-DeploymentTarget $HostName $UserName
if (-not $SkipBuild) {
  Write-Host 'Building frontend CSS...'
  Invoke-DeploymentCommand 'npm' @('run', 'build:css')
}

Write-Host "Uploading frontend to ${target}:${RemotePath}..."
Invoke-RemoteCommand $target "mkdir -p '$RemotePath'"
Invoke-DeploymentCommand 'scp' @(
  '-o', 'BatchMode=yes', '-r',
  'index.html', 'manifest.webmanifest', 'styles.css', 'tailwind.css', 'js', 'icons',
  "${target}:${RemotePath}/"
)
Invoke-RemoteCommand $target "chmod -R a+rX '$RemotePath'"
Write-Host 'Frontend deployment complete.'