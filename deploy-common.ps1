function Invoke-DeploymentCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-RemoteCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$Command
  )

  Invoke-DeploymentCommand 'ssh' @('-o', 'BatchMode=yes', $Target, $Command)
}

function Get-DeploymentTarget {
  param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [Parameter(Mandatory = $true)][string]$UserName
  )

  return "${UserName}@${HostName}"
}