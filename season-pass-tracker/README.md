# Season Pass Tracker

A simple, in-house tool for Valley Corn Maize to register season passes,
search for a family/group and check them in at the gate, and see season
stats (how many families came back, how often, etc.) — replacing the old
Excel sheet.

No accounts, no photo ID, nothing fancy: type in a family or group name,
list the kids/people on the pass with their birthdate, and you're done.
At the gate, search the name and tap **Check In Now**.

## Running it

This needs [Node.js](https://nodejs.org) 22.5 or newer (it uses Node's
built-in SQLite support, so there's nothing else to install — no database
server, no compiling anything).

From this folder:

```
npm install
npm start
```

You'll see:

```
Season pass tracker running:
  On this computer:  http://localhost:3000
  On the network:    http://<this-computer's-IP-address>:3000
```

Open `http://localhost:3000` in a browser on that computer. All the data
lives in one file: `data/season-passes.db`.

### Using it from other computers/tablets on the same WiFi

Since this runs as a little web server on the front-desk computer, any
other device on the **same WiFi network** (another laptop, a tablet at a
second table) can reach it too:

1. Find that computer's local IP address:
   - Windows: open Command Prompt, run `ipconfig`, look for "IPv4 Address"
     (something like `192.168.1.42`)
   - Mac: System Settings → Wi-Fi → Details, or run `ipconfig getifaddr en0`
     in Terminal
2. On the other device's browser, go to `http://192.168.1.42:3000` (using
   whatever address you found).
3. If it doesn't connect, the computer's firewall is probably blocking
   incoming connections on port 3000 — allow Node.js / port 3000 through
   Windows Defender Firewall (or your Mac's firewall) for the local network.

This only works while that computer is on and the app is running, and only
for devices on the same network — nobody outside your building can reach
it, which is intentional (there's no login screen on this app, so it should
stay off the public internet unless you add one).

### Starting it automatically

So the front desk doesn't need to open a terminal every morning, set the
computer to run `npm start` in this folder on startup:
- **Windows**: create a shortcut to a `.bat` file containing
  `cd /d "C:\path\to\season-pass-tracker" && npm start`, and put that
  shortcut in the Startup folder (`shell:startup`).
- **Mac**: use a login item (System Settings → General → Login Items) that
  runs a small script doing the same `cd` + `npm start`.

Leave that window open/minimized during the season; closing it stops the
server.

## Backing up the data

Two ways, and it's fine to use both:

1. **CSV exports** — on the Stats tab, there are buttons to download the
   families, people, and check-ins as CSV files, which open right in Excel.
   Good for a quick end-of-day/end-of-season copy.
2. **The database file itself** — `data/season-passes.db` is the entire
   database in one file. Periodically copy it into a synced folder (Dropbox,
   OneDrive, Google Drive) or onto a USB drive. If that computer ever has a
   problem, copy that file back into `data/` on a new one and everything —
   every family, every check-in, every past season — comes back exactly as
   it was.

## Bringing in old Excel records (optional)

If you want last season's passes searchable and counted in the "returning
families" stats right away, there's an import helper — see
`legacy-import/import.js` for the full instructions. Short version: export
each season's tab from the old spreadsheet as a CSV (keeping the same
columns you already use), then run:

```
node legacy-import/import.js 2025 path/to/2025.csv
```

...once per season tab. It skips anything that looks like it's already been
imported, so it's safe to re-run. Old entries that only had an age or said
"Adult" instead of a real birthdate are left blank rather than guessed —
you can fill in an actual birthdate by hand later if you want it.

## How the data is organized

- **Family / group**: a name, a season, a contact's first/last name (which
  is sometimes different from the family name — blended families, a
  grandparent buying the pass, etc.), email, phone, and notes.
- **People on the pass**: each person's first/last name and birthdate.
  These don't have to share the family's last name.
- **Check-ins**: each visit records who from the group actually showed up
  that day (not everyone always comes every time) — that's what "Who's
  here today?" is for when you check a group in.

## Stats tab

Shows, for whichever season you pick: total families/groups, total people,
total check-ins, average visits per group, and how many of that season's
families also showed up in a *different* season (matched by email, phone,
or family name — whichever one lines up) versus how many are brand new.
There's also a season-by-season table and a "most frequent visitors" list.

## If you ever want it reachable from anywhere (not just your WiFi)

Not needed for a single front-desk computer, but if that ever changes, this
same app can be deployed to a small always-on host (e.g. Render, Railway, a
cheap VPS) with a persistent disk for the `data/` folder. That's a bigger
step than this project needs today — worth revisiting only if you outgrow
"one computer at the gate."
