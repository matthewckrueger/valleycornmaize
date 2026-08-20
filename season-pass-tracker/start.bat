@echo off
cd /d "%~dp0"

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
