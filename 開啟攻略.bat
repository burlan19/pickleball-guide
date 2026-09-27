@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  echo Pickleball guide: http://localhost:8123/  ^(close this window to stop^)
  start "" cmd /c "timeout /t 1 >nul & start http://localhost:8123/index.html"
  python -m http.server 8123
) else (
  start "" "%~dp0index.html"
)
