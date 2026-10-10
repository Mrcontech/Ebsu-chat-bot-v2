# One-click setup and start for Windows. Run it by double-clicking run-on-windows.bat.
#   1. installs Node.js LTS if it is missing or too old (winget)
#   2. installs XAMPP if it is missing (winget)
#   3. starts XAMPP's MySQL in the background if it is not already running
#   4. runs npm start (packages, database, build, server, opens the browser)
# Steps 1, 2 and the first npm start need internet. Windows may ask for permission
# (a "Do you want to allow..." box) while installing: click Yes.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Say($text) { Write-Host "`n>> $text" -ForegroundColor Cyan }
function Stop-WithMessage($text) {
  Write-Host "`n   $text`n" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}
function Update-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
function Test-Port($port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try { $client.Connect("127.0.0.1", $port); return $true } catch { return $false } finally { $client.Close() }
}
function Install-WithWinget($id, $name) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "winget is not available on this computer. Install $name by hand (see README), then run this again."
  }
  Write-Host "   Installing $name. This can take a few minutes..."
  winget install -e --id $id --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Installing $name failed (winget exit code $LASTEXITCODE). Install it by hand (see README), then run this again." }
  Update-Path
}

Write-Host "EBSU Enquiry Bot: Windows setup" -ForegroundColor Green

# 1. Node.js
Say "Checking Node.js"
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
  $v = (node -v).TrimStart("v").Split(".")
  $nodeOk = ([int]$v[0] -gt 20) -or ([int]$v[0] -eq 20 -and [int]$v[1] -ge 9)
}
if ($nodeOk) { Write-Host "   Node.js $(node -v) is installed." }
else {
  Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "Node.js was installed but this window cannot see it yet. Close this window and double-click run-on-windows.bat again."
  }
}

# 2. XAMPP
Say "Checking XAMPP"
$xampp = @($env:XAMPP_DIR, "C:\xampp", "D:\xampp", "$env:ProgramFiles\xampp") |
  Where-Object { $_ -and (Test-Path (Join-Path $_ "mysql\bin\mysqld.exe")) } | Select-Object -First 1
if ($xampp) { Write-Host "   XAMPP found at $xampp." }
elseif (Test-Port 3306) { Write-Host "   No XAMPP folder found, but a MySQL server is already running on port 3306. Using it." }
else {
  Install-WithWinget "ApacheFriends.Xampp.8.2" "XAMPP"
  $xampp = @("C:\xampp", "$env:ProgramFiles\xampp") | Where-Object { Test-Path (Join-Path $_ "mysql\bin\mysqld.exe") } | Select-Object -First 1
  if (-not $xampp) { Stop-WithMessage "XAMPP was installed but its folder was not found. If it is not in C:\xampp, set XAMPP_DIR to its folder, or start MySQL from the XAMPP Control Panel and run this again." }
}

# 3. MySQL
Say "Starting MySQL"
if (Test-Port 3306) { Write-Host "   MySQL is already running." }
else {
  Start-Process -FilePath (Join-Path $xampp "mysql\bin\mysqld.exe") `
    -ArgumentList "--defaults-file=`"$(Join-Path $xampp 'mysql\bin\my.ini')`"", "--standalone" `
    -WorkingDirectory $xampp -WindowStyle Hidden
  for ($i = 0; $i -lt 30 -and -not (Test-Port 3306); $i++) { Start-Sleep -Seconds 1 }
  if (-not (Test-Port 3306)) { Stop-WithMessage "MySQL did not start. Open the XAMPP Control Panel ($xampp\xampp-control.exe), click Start next to MySQL, read any error there, then run this again." }
  Write-Host "   MySQL is running (it keeps running after you close this window)."
}

# 4. The app
Say "Starting the app (the browser opens by itself when it is ready)"
& npm.cmd start
if ($LASTEXITCODE -ne 0) { Read-Host "`nSomething went wrong (see above). Press Enter to close" }
