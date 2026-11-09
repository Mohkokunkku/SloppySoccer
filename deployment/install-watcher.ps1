[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ProjectPath,
  [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
$taskName = 'SloppySoccer-GitHubDeploy'
if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task still exists' }
  Write-Output 'Watcher task removed; runtime/checkpoint/releases retained.'
  return
}
$project = (Resolve-Path -LiteralPath $ProjectPath).Path
if ($project.Contains('"')) { throw 'Unsupported project path' }
$node = (Get-Command node.exe -ErrorAction Stop).Source
# Explicit installation is the only operation that publishes a snapshot.
& $node (Join-Path $project 'deployment/build-runtime.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Candidate build failed; task not registered' }
& $node (Join-Path $project 'node_modules/vitest/vitest.mjs') run --config (Join-Path $project 'deployment/vitest.config.ts') deployment/recovery-bundle.test.ts deployment/runtime.test.ts deployment/watcher.test.ts --root $project
if ($LASTEXITCODE -ne 0) { throw 'Candidate tests failed; task not registered' }
$candidate = Join-Path $project '.local-server/github-deploy/candidate'
$files = @('runtime.js','watcher.js','windows-boundary.js','recovery.mjs','package.json')
$manifest = ($files | ForEach-Object { $_ + ':' + (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $candidate $_)).Hash }) -join "`n"
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($manifest)))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
$snapshots = Join-Path $project '.local-server/github-deploy/snapshots'
New-Item -ItemType Directory -Force -Path $snapshots | Out-Null
$snapshot = Join-Path $snapshots $digest
if (-not (Test-Path -LiteralPath $snapshot)) {
  $staging = Join-Path $snapshots ([Guid]::NewGuid().ToString() + '.pending')
  New-Item -ItemType Directory -Path $staging | Out-Null
  foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $candidate $file) -Destination (Join-Path $staging $file) }
  $copied = ($files | ForEach-Object { $_ + ':' + (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $staging $_)).Hash }) -join "`n"
  if ($copied -ne $manifest) { throw 'Candidate changed during snapshot copy' }
  Move-Item -LiteralPath $staging -Destination $snapshot
}
$installedManifest = ($files | ForEach-Object { $_ + ':' + (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $snapshot $_)).Hash }) -join "`n"
if ($installedManifest -ne $manifest) { throw 'Existing snapshot differs; never overwrite installed files' }
foreach ($file in $files) { (Get-Item -LiteralPath (Join-Path $snapshot $file)).IsReadOnly = $true }
$runtime = Join-Path $snapshot 'runtime.js'
$arguments = '"' + $runtime + '" --once --project "' + $project + '"'
$action = New-ScheduledTaskAction -Execute $node -Argument $arguments -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 2)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Outbound verified main watcher; interactive user only; no inbound runner.' -Force | Out-Null
$installed = Get-ScheduledTask -TaskName $taskName
if ($installed.Actions.Execute -ne $node -or $installed.Actions.Arguments -ne $arguments) { throw 'Registered task target mismatch' }
Write-Output 'Watcher task registered, not started. First eligible tick initializes baseline only.'
