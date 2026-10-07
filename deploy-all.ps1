param(
  [string]$HostName = '185.167.97.200',
  [string]$UserName = 'root',
  [string]$FrontendPath = '/var/www/roms-new',
  [string]$BackendPath = '/opt/roms-api',
  [switch]$SkipBuild,
  [switch]$SkipDatabaseSync
)

$ErrorActionPreference = 'Stop'

$frontendArgs = @{
  HostName = $HostName
  UserName = $UserName
  RemotePath = $FrontendPath
  SkipBuild = $SkipBuild
}
$backendArgs = @{
  HostName = $HostName
  UserName = $UserName
  RemotePath = $BackendPath
  SkipDatabaseSync = $SkipDatabaseSync
}

& (Join-Path $PSScriptRoot 'deploy-frontend.ps1') @frontendArgs
& (Join-Path $PSScriptRoot 'deploy-backend.ps1') @backendArgs
Write-Host 'Full ROMS deployment complete.'