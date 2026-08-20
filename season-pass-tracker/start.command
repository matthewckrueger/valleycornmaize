#!/bin/bash
cd "$(dirname "$0")"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Checking for updates..."
  git pull --ff-only || echo "(couldn't check for updates right now - continuing with what's already here)"
  echo
fi

if [ ! -d node_modules ]; then
  echo "First time setup - installing, this takes a minute..."
  npm install
  echo
fi

echo "Starting Season Pass Tracker..."
echo
echo "Leave this window open while you're using the app."
echo "Close it when you're done for the day."
echo
npm start
