@echo off
cd /d "%~dp0"
echo Starting ModVault Local Admin...
echo Open http://localhost:8787/local-admin.html if the browser does not open automatically.
start "" "http://localhost:8787/local-admin.html"
node tools\local-admin-server.js
pause
