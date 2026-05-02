if (!requireAuth(['organiser'])) throw new Error('auth');
buildNav('/dashboard.html');

const user = getUser();
document.getElementById('welcome-title').textContent = 'Welcome, ' + (user?.full_name || 'Organiser');

async function init() {
  try {
    const stats = await api('/api/organiser/stats');
    render(stats);
  } catch(err) {
    document.getElementById('dashboard-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function render(data) {
  const s = data.summary || {};
  const peak = data.peak_hours || [];

  const peakBarMax = peak.length ? Math.max(...peak.map(p => p.booking_count)) : 1;
  const peakBars = peak.map(p => {
    const pct = Math.round((p.booking_count / peakBarMax) * 100);
    const h = p.hour;
    const label = (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
      <span style="font-size:11px;color:var(--gray-600);font-weight:600">${p.booking_count}</span>
      <div style="width:100%;background:var(--gray-200);border-radius:4px;height:80px;display:flex;align-items:flex-end;overflow:hidden">
        <div style="width:100%;height:${pct}%;background:linear-gradient(180deg,var(--purple-500),var(--purple-700));border-radius:4px 4px 0 0;transition:height .6s"></div>
      </div>
      <span style="font-size:11px;color:var(--gray-600)">${label}</span>
    </div>`;
  }).join('');

  document.getElementById('dashboard-container').innerHTML = `
    <!-- Stats grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${s.total_bookings ?? '—'}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--success)">${s.completed ?? '—'}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--danger)">${s.cancelled ?? '—'}</div>
        <div class="stat-label">Cancelled</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.unique_customers ?? '—'}</div>
        <div class="stat-label">Unique Customers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.avg_punctuality ? s.avg_punctuality + '/5' : '—'}</div>
        <div class="stat-label">Avg Punctuality</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.avg_quality ? s.avg_quality + '/5' : '—'}</div>
        <div class="stat-label">Avg Quality</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.total_reviews ?? '—'}</div>
        <div class="stat-label">Total Reviews</div>
      </div>
    </div>

    <!-- Two col layout -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex-wrap:wrap">
      <!-- Peak hours chart -->
      <div class="card" style="padding:24px">
        <h3 style="margin-bottom:20px">📊 Peak Booking Hours</h3>
        ${peak.length
          ? `<div style="display:flex;gap:8px;align-items:flex-end;height:120px">${peakBars}</div>`
          : `<p class="text-muted">No booking data yet.</p>`}
      </div>

      <!-- Quick links -->
      <div class="card" style="padding:24px">
        <h3 style="margin-bottom:16px">🚀 Quick Actions</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          <a href="/appointments.html" class="btn btn-secondary" style="justify-content:flex-start">📋 Manage Services</a>
          <a href="/working-hours.html" class="btn btn-secondary" style="justify-content:flex-start">🗓️ Set Working Hours</a>
          <a href="/working-hours.html#generate" class="btn btn-secondary" style="justify-content:flex-start">⚡ Generate Slots</a>
          <a href="/organiser-bookings.html" class="btn btn-secondary" style="justify-content:flex-start">📅 View Incoming Bookings</a>
        </div>
      </div>
    </div>`;
}

init();
