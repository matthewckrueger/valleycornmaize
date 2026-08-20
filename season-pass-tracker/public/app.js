const state = {
  season: null,
  seasons: [],
  selectedGroupId: null,
};

// ---------- utils ----------

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.toggle('err', !!isErr);
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- tabs ----------

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'stats') loadStats();
    if (btn.dataset.tab === 'checkin') loadToday();
  });
});

// ---------- seasons ----------

async function loadSeasons() {
  const data = await api('/api/seasons');
  state.seasons = data.seasons;
  state.season = data.currentSeason;
  const sel = document.getElementById('seasonSelect');
  sel.innerHTML = data.seasons.map((s) => `<option value="${s}">${s}</option>`).join('');
  sel.value = state.season;
  document.getElementById('registerSeason').value = state.season;
  sel.addEventListener('change', () => {
    state.season = sel.value;
    loadStats();
  });
}

// ---------- search & check-in ----------

const searchInput = document.getElementById('searchInput');
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 200);
});

async function runSearch() {
  const q = searchInput.value.trim();
  const results = document.getElementById('searchResults');
  if (!q) {
    results.innerHTML = '';
    return;
  }
  const rows = await api('/api/groups?search=' + encodeURIComponent(q));
  if (!rows.length) {
    results.innerHTML = '<div class="empty-note">No matching families or groups found.</div>';
    return;
  }
  results.innerHTML = '';
  for (const g of rows) {
    const today = g.last_visit && new Date(g.last_visit.replace(' ', 'T') + 'Z').toDateString() === new Date().toDateString();
    const contactName = [g.contact_first_name, g.contact_last_name].filter(Boolean).join(' ');
    const subParts = [
      contactName,
      peopleLabel(g.member_count) + ' on pass',
      plural(g.visit_count, 'visit'),
      g.last_visit ? 'last visit ' + fmtDateOnly(g.last_visit) : null,
    ];
    const item = el(`
      <div class="result-item">
        <div>
          <div class="result-main">${escapeHtml(g.group_name)}</div>
          <div class="result-sub">${escapeHtml(joinParts(subParts))}</div>
        </div>
        <span class="result-badge ${today ? 'today' : ''}">${g.season}</span>
      </div>
    `);
    item.addEventListener('click', () => openGroup(g.id));
    results.appendChild(item);
  }
}

function joinParts(parts, sep) {
  return parts.filter((p) => p !== null && p !== undefined && p !== '').join(sep || ' · ');
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function peopleLabel(n) {
  return n === 1 ? '1 person' : `${n} people`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function openGroup(id) {
  state.selectedGroupId = id;
  const g = await api('/api/groups/' + id);
  renderGroupDetail(g);
}

function renderGroupDetail(g, editing) {
  const box = document.getElementById('groupDetail');
  box.classList.remove('hidden');

  if (editing) {
    box.innerHTML = `
      <h2>Edit ${escapeHtml(g.group_name)}</h2>
      <form id="editGroupForm">
        <div class="field-row">
          <label>Family / Group Name *<input name="group_name" required value="${escapeHtml(g.group_name)}"></label>
          <label>Season<input name="season" value="${escapeHtml(g.season)}"></label>
        </div>
        <div class="field-row">
          <label>Contact First Name<input name="contact_first_name" value="${escapeHtml(g.contact_first_name || '')}"></label>
          <label>Contact Last Name<input name="contact_last_name" value="${escapeHtml(g.contact_last_name || '')}"></label>
        </div>
        <div class="field-row">
          <label>Email<input name="email" type="email" value="${escapeHtml(g.email || '')}"></label>
          <label>Phone<input name="phone" type="tel" value="${escapeHtml(g.phone || '')}"></label>
        </div>
        <label class="full">Notes<textarea name="notes" rows="2">${escapeHtml(g.notes || '')}</textarea></label>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save Changes</button>
          <button type="button" class="btn-secondary" id="cancelEdit">Cancel</button>
        </div>
      </form>
    `;
    document.getElementById('cancelEdit').addEventListener('click', () => renderGroupDetail(g, false));
    document.getElementById('editGroupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const updated = await api(`/api/groups/${g.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            group_name: f.group_name.value.trim(),
            season: f.season.value.trim(),
            contact_first_name: f.contact_first_name.value.trim(),
            contact_last_name: f.contact_last_name.value.trim(),
            email: f.email.value.trim(),
            phone: f.phone.value.trim(),
            notes: f.notes.value.trim(),
          }),
        });
        renderGroupDetail(updated, false);
        toast('Saved changes');
        runSearch();
      } catch (err) {
        toast(err.message, true);
      }
    });
    return;
  }

  const memberRows = g.members.map((m) => `
    <tr>
      <td>${escapeHtml([m.first_name, m.last_name].filter(Boolean).join(' '))}</td>
      <td>${m.date_of_birth ? fmtDateOnly(m.date_of_birth) : '—'}</td>
      <td><button class="btn-danger" data-remove-member="${m.id}">Remove</button></td>
    </tr>
  `).join('');

  const contactLine = joinParts([
    [g.contact_first_name, g.contact_last_name].filter(Boolean).join(' '),
    g.email,
    g.phone,
  ]);

  const historyRows = g.checkins.slice(0, 8).map((c) => {
    const names = (c.members || []).map((m) => m.first_name).join(', ');
    return `<div>${fmtDate(c.checked_in_at)}${names ? ' — ' + escapeHtml(names) : ''}</div>`;
  }).join('');

  box.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>${escapeHtml(g.group_name)} <span class="result-badge">${g.season}</span></h2>
        <div class="detail-contact">${escapeHtml(contactLine)}</div>
        ${g.notes ? `<div class="detail-contact">Note: ${escapeHtml(g.notes)}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-secondary" id="editDetail">Edit</button>
        <button class="btn-secondary" id="closeDetail">Close</button>
      </div>
    </div>

    <table class="member-table">
      <thead><tr><th>Name</th><th>Date of Birth</th><th></th></tr></thead>
      <tbody>${memberRows || '<tr><td colspan="3" class="empty-note">No one listed yet</td></tr>'}</tbody>
    </table>

    <div class="member-row" style="margin-top:12px;">
      <div class="mf name"><label>First name</label><input id="newMemberFirst"></div>
      <div class="mf name"><label>Last name</label><input id="newMemberLast"></div>
      <div class="mf dob"><label>Date of birth</label><input id="newMemberDob" type="date"></div>
      <button class="btn-secondary" id="addMemberBtn" type="button">+ Add Person</button>
    </div>

    <div class="checkin-cta" style="flex-direction:column;align-items:flex-start;">
      <div style="font-weight:600;">Who's here today?</div>
      <div id="presentList" style="display:flex;flex-wrap:wrap;gap:10px 18px;">
        ${g.members.map((m) => `
          <label style="display:flex;align-items:center;gap:6px;font-weight:400;">
            <input type="checkbox" class="present-check" value="${m.id}" checked> ${escapeHtml([m.first_name, m.last_name].filter(Boolean).join(' '))}
          </label>
        `).join('') || '<span class="empty-note">No one listed on this pass yet — add someone above.</span>'}
      </div>
      <button class="btn-checkin" id="checkinBtn" style="margin-top:8px;">Check In Now</button>
    </div>

    <div class="checkin-history">
      <strong>Recent visits:</strong>
      ${historyRows || '<div>No visits logged yet.</div>'}
    </div>
  `;

  document.getElementById('closeDetail').addEventListener('click', () => {
    box.classList.add('hidden');
    box.innerHTML = '';
  });

  document.getElementById('editDetail').addEventListener('click', () => renderGroupDetail(g, true));

  document.getElementById('addMemberBtn').addEventListener('click', async () => {
    const first_name = document.getElementById('newMemberFirst').value.trim();
    const last_name = document.getElementById('newMemberLast').value.trim();
    const date_of_birth = document.getElementById('newMemberDob').value;
    if (!first_name) return toast('Enter a first name', true);
    try {
      const updated = await api(`/api/groups/${g.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ first_name, last_name, date_of_birth }),
      });
      renderGroupDetail(updated);
      toast('Person added');
    } catch (e) {
      toast(e.message, true);
    }
  });

  box.querySelectorAll('[data-remove-member]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this person from the pass?')) return;
      const updated = await api('/api/members/' + btn.dataset.removeMember, { method: 'DELETE' });
      renderGroupDetail(updated);
    });
  });

  document.getElementById('checkinBtn').addEventListener('click', async () => {
    const member_ids = Array.from(document.querySelectorAll('.present-check:checked')).map((c) => Number(c.value));
    try {
      const updated = await api(`/api/groups/${g.id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ member_ids }),
      });
      renderGroupDetail(updated);
      toast(`Checked in ${g.group_name}!`);
      loadToday();
      runSearch();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

async function loadToday() {
  const rows = await api('/api/checkins/today');
  const box = document.getElementById('todayList');
  if (!rows.length) {
    box.innerHTML = '<div class="empty-note">No check-ins yet today.</div>';
    return;
  }
  box.innerHTML = rows.map((c) => {
    const sub = joinParts([
      [c.contact_first_name, c.contact_last_name].filter(Boolean).join(' '),
      c.member_count ? peopleLabel(c.member_count) : null,
    ]);
    return `
      <div class="result-item" style="cursor:default;">
        <div>
          <div class="result-main">${escapeHtml(c.group_name)}</div>
          <div class="result-sub">${escapeHtml(sub)}</div>
        </div>
        <span class="result-badge today">${fmtDate(c.checked_in_at)}</span>
      </div>
    `;
  }).join('');
}

// ---------- register form ----------

let memberRowCount = 0;
function addMemberRow() {
  memberRowCount++;
  const row = el(`
    <div class="member-row" data-row="${memberRowCount}">
      <div class="mf name"><label>First name</label><input name="m_first" placeholder="First name"></div>
      <div class="mf name"><label>Last name</label><input name="m_last" placeholder="Last name (optional)"></div>
      <div class="mf dob"><label>Date of birth</label><input name="m_dob" type="date"></div>
      <button type="button" class="remove-member" title="Remove">&times;</button>
    </div>
  `);
  row.querySelector('.remove-member').addEventListener('click', () => row.remove());
  document.getElementById('memberRows').appendChild(row);
}
document.getElementById('addMemberRow').addEventListener('click', addMemberRow);
addMemberRow();

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('registerMsg');
  msg.textContent = '';
  msg.className = 'msg';

  const members = [];
  form.querySelectorAll('.member-row').forEach((row) => {
    const first_name = row.querySelector('[name=m_first]').value.trim();
    const last_name = row.querySelector('[name=m_last]').value.trim();
    const date_of_birth = row.querySelector('[name=m_dob]').value;
    if (first_name) members.push({ first_name, last_name, date_of_birth });
  });

  const payload = {
    group_name: form.group_name.value.trim(),
    season: form.season.value.trim(),
    contact_first_name: form.contact_first_name.value.trim(),
    contact_last_name: form.contact_last_name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    notes: form.notes.value.trim(),
    members,
  };

  try {
    await api('/api/groups', { method: 'POST', body: JSON.stringify(payload) });
    msg.textContent = 'Saved!';
    msg.classList.add('ok');
    form.reset();
    form.season.value = state.season;
    document.getElementById('memberRows').innerHTML = '';
    memberRowCount = 0;
    addMemberRow();
    toast(`${payload.group_name} registered`);
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('err');
  }
});

// ---------- stats ----------

async function loadStats() {
  const data = await api('/api/stats?season=' + encodeURIComponent(state.season));
  document.getElementById('statsCards').innerHTML = `
    <div class="stat-card"><div class="num">${data.totalGroups}</div><div class="label">Families / Groups</div></div>
    <div class="stat-card"><div class="num">${data.totalMembers}</div><div class="label">People on Passes</div></div>
    <div class="stat-card"><div class="num">${data.totalCheckins}</div><div class="label">Total Check-Ins</div></div>
    <div class="stat-card"><div class="num">${data.avgVisitsPerGroup}</div><div class="label">Avg Visits / Group</div></div>
    <div class="stat-card"><div class="num">${data.returning.count} (${data.returning.percent}%)</div><div class="label">Returning Families</div></div>
    <div class="stat-card"><div class="num">${data.returning.newCount}</div><div class="label">New Families</div></div>
  `;

  const top = document.getElementById('topGroups');
  top.innerHTML = data.topGroups.filter((g) => g.visits > 0).map((g) => `
    <div class="result-item" style="cursor:default;">
      <div class="result-main">${escapeHtml(g.group_name)}</div>
      <span class="result-badge">${g.visits} visit${g.visits === 1 ? '' : 's'}</span>
    </div>
  `).join('') || '<div class="empty-note">No check-ins logged yet this season.</div>';

  const tbody = document.querySelector('#seasonTable tbody');
  tbody.innerHTML = data.bySeasonSummary.map((s) => `<tr><td>${s.season}</td><td>${s.groups}</td><td>${s.checkins}</td></tr>`).join('');
}

// ---------- init ----------

(async function init() {
  await loadSeasons();
  loadToday();
})();
