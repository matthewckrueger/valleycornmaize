@echo off
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel%==0 (
  echo Checking for updates...
  git pull --ff-only
  if errorlevel 1 echo (couldn't check for updates right now - continuing with what's already here)
  echo.
)

if not exist node_modules (
  echo First time setup - installing, this takes a minute...
  call npm install
  echo.
)

echo Starting Season Pass Tracker...
echo.
echo Leave this window open while you're using the app.
echo Close it when you're done for the day.
echo.
call npm start
pause
