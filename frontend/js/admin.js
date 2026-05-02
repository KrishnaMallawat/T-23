if (!requireAuth(['admin'])) throw new Error('auth');
buildNav('/admin.html');

let usersData     = [];
let providersData = [];
let currentTab    = 'providers';

async function init() {
  await Promise.all([loadStats(), loadProviders(), loadUsers()]);
}

// ── Stats ────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await api('/api/admin/stats');
    renderStats(data);
  } catch(err) {
    document.getElementById('stats-container').innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

function renderStats(data) {
  const s = data.summary || {};
  const daily = data.daily_bookings || [];
  const top   = data.top_providers  || [];

  // Sparkline (simple inline bar chart)
  const maxDay = daily.length ? Math.max(...daily.map(d => d.bookings)) : 1;
  const sparkline = daily.map(d => {
    const pct = Math.round((d.bookings / maxDay) * 56);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
      <span style="font-size:10px;color:var(--gray-600)">${d.bookings}</span>
      <div style="width:20px;height:${pct}px;background:var(--purple-500);border-radius:3px 3px 0 0;min-height:4px"></div>
      <span style="font-size:9px;color:var(--gray-400)">${new Date(d.day).toLocaleDateString('en',{weekday:'short'})}</span>
    </div>`;
  }).join('');

  document.getElementById('stats-container').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_users ?? '—'}</div><div class="stat-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_customers ?? '—'}</div><div class="stat-label">Customers</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_providers ?? '—'}</div><div class="stat-label">Providers</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_bookings ?? '—'}</div><div class="stat-label">Total Bookings</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${s.completed_bookings ?? '—'}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${s.cancelled_bookings ?? '—'}</div><div class="stat-label">Cancelled</div></div>
      <div class="stat-card"><div class="stat-value">${s.published_services ?? '—'}</div><div class="stat-label">Live Services</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_reviews ?? '—'}</div><div class="stat-label">Total Reviews</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
      <!-- Daily bookings chart -->
      <div class="card" style="padding:24px">
        <h4 style="margin-bottom:16px">📈 Bookings (Last 7 Days)</h4>
        ${daily.length
          ? `<div style="display:flex;gap:6px;align-items:flex-end;height:80px">${sparkline}</div>`
          : '<p class="text-muted">No data yet.</p>'}
      </div>

      <!-- Top providers -->
      <div class="card" style="padding:24px">
        <h4 style="margin-bottom:16px">🏆 Top Providers by Reviews</h4>
        ${top.length
          ? `<div style="display:flex;flex-direction:column;gap:8px">
              ${top.map((p, i) => `
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px">
                <span style="color:var(--gray-400);margin-right:8px">#${i+1}</span>
                <span style="flex:1;font-weight:600">${p.full_name}</span>
                <span class="badge badge-purple">${p.total_reviews} reviews</span>
                <span style="margin-left:8px;font-size:12px;color:var(--gray-600)">${p.punctuality_score ?? '—'}/5</span>
              </div>`).join('')}
            </div>`
          : '<p class="text-muted">No review data yet.</p>'}
      </div>
    </div>`;
}

// ── Providers Tab ────────────────────────────────────────────
async function loadProviders() {
  try {
    providersData = await api('/api/admin/providers');
    renderProviders();
  } catch(err) {
    document.getElementById('tab-providers').innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

function renderProviders() {
  if (!providersData.length) {
    document.getElementById('tab-providers').innerHTML =
      `<div class="empty-state"><div class="empty-icon">🏢</div><h3>No providers yet</h3></div>`;
    return;
  }
  document.getElementById('tab-providers').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>Email</th><th>Services</th>
          <th>Reviews</th><th>Punctuality</th><th>Quality</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${providersData.map(p => `
          <tr>
            <td><strong>${p.full_name}</strong></td>
            <td style="font-size:13px;color:var(--gray-600)">${p.email}</td>
            <td>${p.published_services} / ${p.total_services} published</td>
            <td>${p.total_reviews ?? 0}</td>
            <td>${p.punctuality_score ? p.punctuality_score + '/5' : '—'}</td>
            <td>${p.quality_score     ? p.quality_score     + '/5' : '—'}</td>
            <td><span class="badge ${p.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="toggleActive(${p.id},${p.is_active})">
                ${p.is_active ? '🔴 Deactivate' : '🟢 Activate'}
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Users Tab ────────────────────────────────────────────────
async function loadUsers() {
  try {
    usersData = await api('/api/admin/users');
    renderUsers();
  } catch(err) {
    document.getElementById('tab-users').innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

function renderUsers() {
  if (!usersData.length) {
    document.getElementById('tab-users').innerHTML =
      `<div class="empty-state"><div class="empty-icon">👤</div><h3>No users yet</h3></div>`;
    return;
  }
  document.getElementById('tab-users').innerHTML = `
    <div style="margin-bottom:12px">
      <input class="form-control" id="user-search" style="max-width:300px" placeholder="Search by name or email…" oninput="filterUsers()">
    </div>
    <div class="table-wrap">
      <table id="users-table">
        <thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${renderUserRows(usersData)}</tbody>
      </table>
    </div>`;
}

function renderUserRows(list) {
  return list.map(u => `
    <tr>
      <td><strong>${u.full_name}</strong></td>
      <td style="font-size:13px;color:var(--gray-600)">${u.email}</td>
      <td><span class="badge badge-purple">${u.role}</span></td>
      <td>${u.is_verified ? '✅' : '⏳'}</td>
      <td style="font-size:13px;color:var(--gray-600)">${fmtDate(u.created_at)}</td>
      <td><span class="badge ${u.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="toggleActive(${u.id},${u.is_active})">
            ${u.is_active ? '🔴 Deactivate' : '🟢 Activate'}
          </button>
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:12px" onchange="changeRole(${u.id},this.value)" title="Change role">
            <option value="">Change role…</option>
            <option value="customer" ${u.role==='customer'?'selected':''}>Customer</option>
            <option value="organiser" ${u.role==='organiser'?'selected':''}>Organiser</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          </select>
        </div>
      </td>
    </tr>`).join('');
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  const filtered = usersData.filter(u =>
    u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  document.querySelector('#users-table tbody').innerHTML = renderUserRows(filtered);
}

// ── Actions ──────────────────────────────────────────────────
async function toggleActive(userId, isActive) {
  const action = isActive ? 'deactivate' : 'activate';
  if (!confirm(`${action.charAt(0).toUpperCase()+action.slice(1)} this user?`)) return;
  try {
    await api('/api/admin/users/' + userId + '/toggle-active', { method:'PATCH' });
    toast('User ' + action + 'd.', 'success');
    await Promise.all([loadProviders(), loadUsers()]);
  } catch(err) { toast(err.message, 'error'); }
}

async function changeRole(userId, newRole) {
  if (!newRole) return;
  if (!confirm(`Change this user's role to "${newRole}"?`)) return;
  try {
    await api('/api/admin/users/' + userId + '/role', { method:'PATCH', body:{ role: newRole } });
    toast('Role updated to ' + newRole + '.', 'success');
    await Promise.all([loadProviders(), loadUsers()]);
  } catch(err) { toast(err.message, 'error'); }
}

// ── Tabs ─────────────────────────────────────────────────────
function showTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-providers').classList.toggle('d-none', tab !== 'providers');
  document.getElementById('tab-users').classList.toggle('d-none', tab !== 'users');
}

init();
