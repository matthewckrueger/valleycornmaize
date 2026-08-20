#!/bin/bash
cd "$(dirname "$0")"

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
