if (!requireAuth(['customer','organiser','admin'])) throw new Error('auth');
buildNav('/providers.html');

const providerId = new URLSearchParams(location.search).get('id');
if (!providerId) { window.location.href = '/providers'; throw new Error('no provider id'); }

async function init() {
  try {
    const p = await api('/api/providers/' + providerId);
    render(p);
  } catch(err) {
    document.getElementById('provider-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Provider error</h3><p>' + err.message + '</p></div>';
  }
}

function scoreBar(label, score, max) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  return `
  <div class="score-bar-wrap">
    <div class="score-bar-label">
      <span>${label}</span>
      <span style="font-weight:700;color:var(--purple-700)">${(score !== null && score !== undefined && score !== '') ? parseFloat(score).toFixed(1) : '—'} / ${max}</span>
    </div>
    <div class="score-bar-track">
      <div class="score-bar-fill" style="width:${pct}%"></div>
    </div>
  </div>`;
}

function render(p) {
  const services = p.services || [];
  const initial  = (p.full_name || '?')[0].toUpperCase();
  const amenities = [
    p.has_parking              ? '🅿️ Parking available'      : '🚫 No parking',
    p.is_wheelchair_accessible ? '♿ Wheelchair accessible'  : '',
    p.noise_level === 'quiet'  ? '🤫 Quiet environment' : p.noise_level === 'loud' ? '📢 Loud environment' : '💬 Moderate noise',
  ].filter(Boolean);

  const payLabel = { none:'Free', optional_advance:'Optional advance', mandatory_advance:'Advance required' };

  const servicesHtml = services.length
    ? services.map(s => `
      <div class="card" style="padding:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${s.title}</div>
          <div style="font-size:13px;color:var(--gray-600)">${s.description || ''}</div>
          <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
            <span class="badge badge-purple">⏱️ ${s.duration_mins} min</span>
            <span class="badge badge-purple">👥 Capacity: ${s.max_capacity}</span>
            ${s.payment_amount > 0 ? `<span class="badge badge-purple">💳 ₹${s.payment_amount} — ${payLabel[s.payment_requirement]||''}</span>` : ''}
          </div>
        </div>
        <a href="/booking?provider_id=${p.id}&appt_id=${s.id}" class="btn btn-primary">Book Now →</a>
      </div>`).join('')
    : `<div class="empty-state" style="padding:32px"><div class="empty-icon">📭</div><p>No published services yet.</p></div>`;

  document.getElementById('provider-container').innerHTML = `
    <div style="display:grid;grid-template-columns:320px 1fr;gap:28px;align-items:start" id="pv-layout">
      <!-- Left col: profile card -->
      <div>
        <div class="card card-elevated" style="padding:28px;text-align:center;margin-bottom:16px">
          <div class="provider-avatar" style="width:72px;height:72px;font-size:2rem;margin:0 auto 16px">${initial}</div>
          <h2 style="font-size:1.3rem;margin-bottom:4px">${p.full_name}</h2>
          <p style="font-size:13px;color:var(--gray-600);margin-bottom:16px">${p.bio || 'No bio provided.'}</p>
          <div style="display:flex;flex-direction:column;gap:6px;text-align:left">
            ${amenities.map(a => `<span style="font-size:13px;color:var(--gray-700)">${a}</span>`).join('')}
          </div>
          ${p.member_since ? `<div class="text-muted mt-16" style="font-size:12px">Member since ${fmtDate(p.member_since)}</div>` : ''}
        </div>

        <!-- Scores -->
        <div class="card" style="padding:20px">
          <h4 style="margin-bottom:14px">Behavioural Scores</h4>
          ${scoreBar('⏱️ Punctuality', p.punctuality_score, 5)}
          ${scoreBar('⭐ Quality', p.quality_score, 5)}
          ${scoreBar('🌿 Environment', p.environment_score, 5)}
          <div style="display:flex;gap:16px;margin-top:14px;font-size:13px;color:var(--gray-600);flex-wrap:wrap">
            ${p.avg_delay_mins ? `<span>Avg delay: <strong>${p.avg_delay_mins} min</strong></span>` : ''}
            ${p.overrun_rate   ? `<span>Overrun: <strong>${(p.overrun_rate*100).toFixed(0)}%</strong></span>` : ''}
            <span>📝 <strong>${p.total_reviews || 0}</strong> reviews</span>
          </div>
        </div>
      </div>

      <!-- Right col: services -->
      <div>
        <h3 style="margin-bottom:16px">Available Services</h3>
        <div style="display:flex;flex-direction:column;gap:12px">${servicesHtml}</div>
      </div>
    </div>`;

  // Animate score bars
  setTimeout(() => {
    document.querySelectorAll('.score-bar-fill').forEach(el => {
      el.style.width = el.style.width; // trigger reflow already set
    });
  }, 100);

  // Responsive layout
  if (window.innerWidth < 900) {
    document.getElementById('pv-layout').style.gridTemplateColumns = '1fr';
  }
}

init();
