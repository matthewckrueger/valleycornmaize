const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const currentSeason = () => String(new Date().getFullYear());

// ---------- helpers ----------

// A family is the "same" across seasons if its email matches, its phone
// matches, or its group name matches — checked independently, since old
// records are often missing a phone or email one year but not the next.
function familyKeys(group) {
  const keys = ['n:' + group.group_name.trim().toLowerCase()];
  if (group.email && group.email.trim()) keys.push('e:' + group.email.trim().toLowerCase());
  if (group.phone && group.phone.trim()) keys.push('p:' + group.phone.replace(/\D/g, ''));
  return keys;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  return lines.join('\n');
}

function getGroupWithDetail(id) {
  const group = db.prepare('SELECT * FROM pass_groups WHERE id = ?').get(id);
  if (!group) return null;
  const members = db.prepare('SELECT * FROM members WHERE group_id = ? ORDER BY date_of_birth IS NULL, date_of_birth DESC, id').all(id);
  const checkins = db.prepare('SELECT * FROM checkins WHERE group_id = ? ORDER BY checked_in_at DESC').all(id);
  const memberNamesStmt = db.prepare(`
    SELECT m.id, m.first_name, m.last_name FROM checkin_members cm
    JOIN members m ON m.id = cm.member_id WHERE cm.checkin_id = ?
  `);
  for (const c of checkins) {
    c.members = memberNamesStmt.all(c.id);
  }
  return { ...group, members, checkins };
}

// ---------- seasons ----------

app.get('/api/seasons', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT season FROM pass_groups ORDER BY season DESC').all();
  const seasons = rows.map((r) => r.season);
  if (!seasons.includes(currentSeason())) seasons.unshift(currentSeason());
  res.json({ seasons, currentSeason: currentSeason() });
});

// ---------- groups: search / list ----------

app.get('/api/groups', (req, res) => {
  const { search, season } = req.query;
  const clauses = [];
  const params = {};

  if (season) {
    clauses.push('g.season = @season');
    params.season = season;
  }

  if (search && search.trim()) {
    clauses.push(`(
      g.group_name LIKE @q OR g.contact_first_name LIKE @q OR g.contact_last_name LIKE @q
      OR g.email LIKE @q OR g.phone LIKE @q
      OR g.id IN (SELECT group_id FROM members WHERE first_name LIKE @q OR last_name LIKE @q)
    )`);
    params.q = `%${search.trim()}%`;
  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const sql = `
    SELECT g.*,
      (SELECT COUNT(*) FROM members m WHERE m.group_id = g.id) AS member_count,
      (SELECT COUNT(*) FROM checkins c WHERE c.group_id = g.id) AS visit_count,
      (SELECT MAX(checked_in_at) FROM checkins c WHERE c.group_id = g.id) AS last_visit
    FROM pass_groups g
    ${where}
    ORDER BY g.created_at DESC
    LIMIT 200
  `;
  const rows = db.prepare(sql).all(params);
  res.json(rows);
});

app.get('/api/groups/:id', (req, res) => {
  const detail = getGroupWithDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Not found' });
  res.json(detail);
});

app.post('/api/groups', (req, res) => {
  const b = req.body || {};
  if (!b.group_name || !b.group_name.trim()) {
    return res.status(400).json({ error: 'Family / group name is required' });
  }
  const season = (b.season && String(b.season).trim()) || currentSeason();

  const insertGroup = db.prepare(`
    INSERT INTO pass_groups (season, group_name, contact_first_name, contact_last_name, email, phone, notes)
    VALUES (@season, @group_name, @contact_first_name, @contact_last_name, @email, @phone, @notes)
  `);
  const info = insertGroup.run({
    season,
    group_name: b.group_name.trim(),
    contact_first_name: b.contact_first_name || null,
    contact_last_name: b.contact_last_name || null,
    email: b.email || null,
    phone: b.phone || null,
    notes: b.notes || null,
  });
  const groupId = Number(info.lastInsertRowid);

  const insertMember = db.prepare(`
    INSERT INTO members (group_id, first_name, last_name, date_of_birth)
    VALUES (?, ?, ?, ?)
  `);
  const sameName = (a, b) =>
    (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

  const members = (b.members || []).filter((m) => m.first_name && m.first_name.trim());

  // The contact is always on the pass — add them as a member automatically
  // unless they were already typed into the member list.
  const contactFirst = b.contact_first_name && b.contact_first_name.trim();
  if (contactFirst) {
    const alreadyListed = members.some(
      (m) => sameName(m.first_name, contactFirst) && sameName(m.last_name, b.contact_last_name)
    );
    if (!alreadyListed) {
      members.unshift({
        first_name: contactFirst,
        last_name: b.contact_last_name || null,
        date_of_birth: b.contact_date_of_birth || null,
      });
    }
  }

  for (const m of members) {
    insertMember.run(groupId, m.first_name.trim(), m.last_name || null, m.date_of_birth || null);
  }

  res.status(201).json(getGroupWithDetail(groupId));
});

app.put('/api/groups/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM pass_groups WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE pass_groups SET
      season = @season, group_name = @group_name,
      contact_first_name = @contact_first_name, contact_last_name = @contact_last_name,
      email = @email, phone = @phone, notes = @notes
    WHERE id = @id
  `).run({
    id: req.params.id,
    season: b.season || existing.season,
    group_name: (b.group_name && b.group_name.trim()) || existing.group_name,
    contact_first_name: b.contact_first_name ?? existing.contact_first_name,
    contact_last_name: b.contact_last_name ?? existing.contact_last_name,
    email: b.email ?? existing.email,
    phone: b.phone ?? existing.phone,
    notes: b.notes ?? existing.notes,
  });
  res.json(getGroupWithDetail(req.params.id));
});

app.delete('/api/groups/:id', (req, res) => {
  db.prepare('DELETE FROM pass_groups WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---------- members ----------

app.post('/api/groups/:id/members', (req, res) => {
  const b = req.body || {};
  if (!b.first_name || !b.first_name.trim()) {
    return res.status(400).json({ error: 'First name is required' });
  }
  const group = db.prepare('SELECT id FROM pass_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  db.prepare('INSERT INTO members (group_id, first_name, last_name, date_of_birth) VALUES (?, ?, ?, ?)')
    .run(req.params.id, b.first_name.trim(), b.last_name || null, b.date_of_birth || null);
  res.status(201).json(getGroupWithDetail(req.params.id));
});

app.put('/api/members/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE members SET first_name = @first_name, last_name = @last_name, date_of_birth = @date_of_birth
    WHERE id = @id
  `).run({
    id: req.params.id,
    first_name: (b.first_name && b.first_name.trim()) || existing.first_name,
    last_name: b.last_name ?? existing.last_name,
    date_of_birth: b.date_of_birth ?? existing.date_of_birth,
  });
  res.json(getGroupWithDetail(existing.group_id));
});

app.delete('/api/members/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json(getGroupWithDetail(existing.group_id));
});

// ---------- check-ins ----------

app.post('/api/groups/:id/checkin', (req, res) => {
  const b = req.body || {};
  const group = db.prepare('SELECT id FROM pass_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Default to everyone on the pass if no specific member_ids were sent.
  let memberIds = Array.isArray(b.member_ids) ? b.member_ids.map(Number).filter(Boolean) : null;
  if (!memberIds) {
    memberIds = db.prepare('SELECT id FROM members WHERE group_id = ?').all(req.params.id).map((m) => m.id);
  }

  const info = db.prepare('INSERT INTO checkins (group_id, note) VALUES (?, ?)').run(req.params.id, b.note || null);
  const checkinId = Number(info.lastInsertRowid);
  const linkMember = db.prepare('INSERT INTO checkin_members (checkin_id, member_id) VALUES (?, ?)');
  for (const memberId of memberIds) linkMember.run(checkinId, memberId);

  res.status(201).json(getGroupWithDetail(req.params.id));
});

app.delete('/api/checkins/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM checkins WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM checkins WHERE id = ?').run(req.params.id);
  res.json(getGroupWithDetail(existing.group_id));
});

app.get('/api/checkins/today', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, g.group_name, g.contact_first_name, g.contact_last_name,
      (SELECT COUNT(*) FROM checkin_members cm WHERE cm.checkin_id = c.id) AS member_count
    FROM checkins c JOIN pass_groups g ON g.id = c.group_id
    WHERE date(c.checked_in_at) = date('now')
    ORDER BY c.checked_in_at DESC
  `).all();
  res.json(rows);
});

// ---------- stats ----------

app.get('/api/stats', (req, res) => {
  const season = req.query.season || currentSeason();

  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM pass_groups WHERE season = @season) AS totalGroups,
      (SELECT COUNT(*) FROM members m JOIN pass_groups g ON g.id = m.group_id WHERE g.season = @season) AS totalMembers,
      (SELECT COUNT(*) FROM checkins c JOIN pass_groups g ON g.id = c.group_id WHERE g.season = @season) AS totalCheckins
  `).get({ season });

  const groupsThisSeason = db.prepare('SELECT * FROM pass_groups WHERE season = ?').all(season);
  const priorGroups = db.prepare('SELECT * FROM pass_groups WHERE season != ?').all(season);
  const priorKeys = new Set(priorGroups.flatMap(familyKeys));
  const returningCount = groupsThisSeason.filter((g) => familyKeys(g).some((k) => priorKeys.has(k))).length;

  const topGroups = db.prepare(`
    SELECT g.id, g.group_name, COUNT(c.id) AS visits
    FROM pass_groups g LEFT JOIN checkins c ON c.group_id = g.id
    WHERE g.season = @season
    GROUP BY g.id
    ORDER BY visits DESC, g.group_name
    LIMIT 10
  `).all({ season });

  const bySeasonSummary = db.prepare(`
    SELECT g.season,
      COUNT(DISTINCT g.id) AS groups,
      (SELECT COUNT(*) FROM checkins c WHERE c.group_id IN (SELECT id FROM pass_groups WHERE season = g.season)) AS checkins
    FROM pass_groups g
    GROUP BY g.season
    ORDER BY g.season DESC
  `).all();

  const totalGroups = totals.totalGroups || 0;
  res.json({
    season,
    totalGroups,
    totalMembers: totals.totalMembers || 0,
    totalCheckins: totals.totalCheckins || 0,
    avgVisitsPerGroup: totalGroups ? +(totals.totalCheckins / totalGroups).toFixed(2) : 0,
    returning: {
      count: returningCount,
      newCount: totalGroups - returningCount,
      percent: totalGroups ? Math.round((returningCount / totalGroups) * 100) : 0,
    },
    topGroups,
    bySeasonSummary,
  });
});

// ---------- CSV export (for Excel backups) ----------

app.get('/api/export/:table.csv', (req, res) => {
  const table = req.params.table;
  const allowed = {
    groups: 'SELECT * FROM pass_groups ORDER BY id',
    members: `SELECT m.*, g.group_name, g.season FROM members m JOIN pass_groups g ON g.id = m.group_id ORDER BY m.id`,
    checkins: `SELECT c.*, g.group_name, g.season,
        (SELECT group_concat(mm.first_name || COALESCE(' ' || mm.last_name, ''), '; ')
         FROM checkin_members cm JOIN members mm ON mm.id = cm.member_id WHERE cm.checkin_id = c.id) AS people_present
      FROM checkins c JOIN pass_groups g ON g.id = c.group_id ORDER BY c.id`,
  };
  if (!allowed[table]) return res.status(404).send('Unknown export');
  const rows = db.prepare(allowed[table]).all();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${table}-${currentSeason()}.csv"`);
  res.send(toCsv(rows));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Season pass tracker running:`);
  console.log(`  On this computer:  http://localhost:${PORT}`);
  console.log(`  On the network:    http://<this-computer's-IP-address>:${PORT}`);
});
