// One-time helper to bring old Excel season-pass records into the tracker.
//
// How to use:
//   1. Open your old spreadsheet, and for each season tab: File > Save As > CSV
//      (keep the same columns you already use: Family Name, Last Name, First Name,
//      Phone number, Email, Birthdate/Age, then one column per visit date).
//   2. Put the app's database somewhere and make sure this script runs against it
//      (it uses the same data/season-passes.db file the app uses — run this from
//      the season-pass-tracker folder, with the app not running at the same time).
//   3. Run:  node legacy-import/import.js <season> <path-to-csv>
//      Example: node legacy-import/import.js 2025 legacy-import/2025.csv
//
// Rows are grouped into families the same way the old sheet did: a blank row
// ends a family, and a new family starts whenever the "Family Name" column has
// a value. Phone/email are read from whichever row in the block has them.
// A birthdate is only kept if the column actually contains a date — old
// entries like "Adult" or a bare age ("5") are skipped since there's no
// reliable date to convert them to (you can fill those in by hand later).
// Visit-date columns become check-ins; if only some people in a family have a
// given date, only those people are marked present for that visit.

const fs = require('fs');
const path = require('path');
const db = require('../db');

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseCsv(text) {
  return text.split(/\r?\n/).filter((l) => l.length > 0 || true).map(parseCsvLine);
}

function isBlankRow(row) {
  return row.every((c) => !c || !c.trim());
}

function looksLikeHeader(row) {
  const joined = row.slice(0, 3).join('|').toLowerCase();
  return joined.includes('family name') && joined.includes('first name');
}

function tryParseDate(raw, seasonYear) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Excel-exported ISO-ish or US dates: 2025-09-27, 9/27/2025, 09/27/25
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let [, mo, da, yr] = m;
    if (yr.length === 2) yr = (Number(yr) > 50 ? '19' : '20') + yr;
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  }

  // Bare "10/19" or "10/19-" with no year — assume the season year.
  m = s.match(/^(\d{1,2})\/(\d{1,2})\s*-?$/);
  if (m && seasonYear) {
    const [, mo, da] = m;
    return `${seasonYear}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  }

  return null;
}

function looksLikeDob(raw) {
  // Only trust it as a birthdate if it parses as an actual date, not a bare
  // age number or a word like "Adult"/"child".
  if (!raw) return false;
  const s = String(raw).trim();
  if (!s || /^\d+(\.\d+)?$/.test(s)) return false;
  if (/^(adult|child|kid)s?\b/i.test(s)) return false;
  return /^\d{4}-\d{1,2}-\d{1,2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s);
}

function run(season, csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);

  let dataRows = rows;
  const headerIdx = rows.findIndex(looksLikeHeader);
  if (headerIdx >= 0) dataRows = rows.slice(headerIdx + 1);

  const blocks = [];
  let current = null;
  for (const row of dataRows) {
    if (isBlankRow(row)) {
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    if (!current) current = { rows: [] };
    current.rows.push(row);
  }
  if (current) blocks.push(current);

  const insertGroup = db.prepare(`
    INSERT INTO pass_groups (season, group_name, contact_first_name, contact_last_name, email, phone, notes)
    VALUES (@season, @group_name, @contact_first_name, @contact_last_name, @email, @phone, 'Imported from old spreadsheet')
  `);
  const insertMember = db.prepare(`INSERT INTO members (group_id, first_name, last_name, date_of_birth) VALUES (?, ?, ?, ?)`);
  const insertCheckin = db.prepare(`INSERT INTO checkins (group_id, note) VALUES (?, 'Imported from old spreadsheet')`);
  const linkCheckinMember = db.prepare(`INSERT INTO checkin_members (checkin_id, member_id) VALUES (?, ?)`);
  const findExisting = db.prepare(`SELECT id FROM pass_groups WHERE season = ? AND lower(trim(group_name)) = ?`);

  let imported = 0, skipped = 0, totalMembers = 0, totalCheckins = 0;

  for (const block of blocks) {
    const familyNameCell = block.rows.find((r) => r[0] && r[0].trim())?.[0];
    if (!familyNameCell) { skipped++; continue; }
    const groupName = familyNameCell.trim();

    if (findExisting.get(season, groupName.toLowerCase())) {
      console.log(`  skipped (already imported this season): ${groupName}`);
      skipped++;
      continue;
    }

    const phone = block.rows.map((r) => r[3]).find((v) => v && v.trim()) || null;
    const email = block.rows.map((r) => r[4]).find((v) => v && v.trim()) || null;
    const contactRow = block.rows[0];

    const groupId = Number(insertGroup.run({
      season,
      group_name: groupName,
      contact_first_name: contactRow[2] || null,
      contact_last_name: contactRow[1] || null,
      email,
      phone,
    }).lastInsertRowid);

    // memberId -> set of visit dates (from that row's remaining columns)
    const memberVisits = [];
    for (const r of block.rows) {
      const lastName = r[1] || null;
      const firstName = r[2] || null;
      if (!firstName) continue;
      const dobRaw = r[5];
      const dob = looksLikeDob(dobRaw) ? tryParseDate(dobRaw, season) : null;
      const memberId = Number(insertMember.run(groupId, firstName, lastName, dob).lastInsertRowid);
      totalMembers++;

      const dates = new Set();
      for (let i = 6; i < r.length; i++) {
        const d = tryParseDate(r[i], season);
        if (d) dates.add(d);
      }
      memberVisits.push({ memberId, dates });
    }

    const allDates = new Set();
    for (const mv of memberVisits) for (const d of mv.dates) allDates.add(d);

    for (const date of allDates) {
      const checkinId = Number(insertCheckin.run(groupId).lastInsertRowid);
      db.prepare("UPDATE checkins SET checked_in_at = ? WHERE id = ?").run(date + ' 12:00:00', checkinId);
      for (const mv of memberVisits) {
        if (mv.dates.has(date)) linkCheckinMember.run(checkinId, mv.memberId);
      }
      totalCheckins++;
    }

    imported++;
  }

  console.log(`\nDone with ${path.basename(csvPath)} (season ${season}):`);
  console.log(`  ${imported} families imported, ${skipped} skipped`);
  console.log(`  ${totalMembers} people, ${totalCheckins} check-ins logged`);
}

const [, , season, csvPath] = process.argv;
if (!season || !csvPath) {
  console.error('Usage: node legacy-import/import.js <season> <path-to-csv>');
  process.exit(1);
}
run(season, csvPath);
