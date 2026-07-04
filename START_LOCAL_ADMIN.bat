@echo off
cd /d "%~dp0"

REM If the admin server is already listening on port 8787, don't start a second
REM instance (that crashes with EADDRINUSE). Just open the page and exit.
netstat -an | findstr ":8787" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
  echo ModVault Local Admin is already running.
  start "" "http://localhost:8787/local-admin.html"
  timeout /t 2 >nul
  exit /b 0
)

echo Starting ModVault Local Admin...
echo Open http://localhost:8787/local-admin.html if the browser does not open automatically.
start "" "http://localhost:8787/local-admin.html"
node tools\local-admin-server.js
pause
