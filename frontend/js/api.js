const BASE = 'http://127.0.0.1:5000';

function getToken() { return localStorage.getItem('cs_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('cs_user')); } catch(e) { return null; } }
function getRole()  { const u = getUser(); return u ? u.role : null; }

function setSession(token, user) {
  localStorage.setItem('cs_token', token);
  localStorage.setItem('cs_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('cs_token');
  localStorage.removeItem('cs_user');
}

async function api(path, { method = 'GET', body, noAuth = false, params } = {}) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') qs.set(k, v); });
    const s = qs.toString();
    if (s) url += '?' + s;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (!noAuth) {
    const tok = getToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
  }

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !noAuth) {
    clearSession();
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'Request failed'), { status: res.status, data });
  return data.data !== undefined ? data.data : data;
}

// ── Guard helpers ────────────────────────────────────────────
function requireAuth(allowedRoles) {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { window.location.href = '/login.html'; return false; }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert('Access denied.');
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  const user = getUser();
  if (!user) return;
  if (user.role === 'organiser') window.location.href = '/dashboard.html';
  else if (user.role === 'admin')    window.location.href = '/admin.html';
  else                               window.location.href = '/providers.html';
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.default}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Nav builder ──────────────────────────────────────────────
function buildNav(activePage) {
  const user = getUser();
  const role = user ? user.role : null;

  const customerLinks = [
    { href: '/providers.html',   label: 'Browse Providers' },
    { href: '/my-bookings.html', label: 'My Bookings' },
  ];
  const organiserLinks = [
    { href: '/dashboard.html',         label: 'Dashboard' },
    { href: '/appointments.html',      label: 'Services' },
    { href: '/working-hours.html',     label: 'Schedule' },
    { href: '/organiser-bookings.html',label: 'Bookings' },
  ];
  const adminLinks = [
    { href: '/admin.html', label: 'Admin Panel' },
  ];

  let links = [];
  if (role === 'customer')  links = customerLinks;
  if (role === 'organiser') links = organiserLinks;
  if (role === 'admin')     links = adminLinks;

  const linksHtml = links.map(l =>
    `<a href="${l.href}" class="nav-link${activePage === l.href ? ' active' : ''}">${l.label}</a>`
  ).join('');

  const actionsHtml = user
    ? `<span class="text-muted" style="font-size:13px;margin-right:4px">${user.full_name}</span>
       <button class="btn btn-ghost btn-sm" onclick="logout()">Log out</button>`
    : `<a href="/login.html" class="btn btn-ghost btn-sm">Log in</a>
       <a href="/signup.html" class="btn btn-primary btn-sm">Sign up</a>`;

  document.getElementById('app-nav').innerHTML = `
    <div class="nav-inner">
      <a href="${role ? (role==='organiser'?'/dashboard.html':role==='admin'?'/admin.html':'/providers.html') : '/'}" class="nav-brand">CuratedSlot</a>
      <div class="nav-links">${linksHtml}</div>
      <div class="nav-actions">${actionsHtml}</div>
    </div>`;
}

function logout() {
  clearSession();
  window.location.href = '/login.html';
}

// ── Match % calculator ───────────────────────────────────────
function calcMatch(provider, weights) {
  const pw = weights.punctuality_weight || 0;
  const qw = weights.quality_weight     || 0;
  const ew = weights.environment_weight || 0;
  const pkw = weights.parking_weight    || 0;
  const aw  = weights.accessibility_weight || 0;

  const total = pw + qw + ew + pkw + aw;
  if (total === 0) return null;

  // scores are 1-5 scale → convert to 0-100
  const pScore = ((provider.punctuality_score  || 0) / 5) * 100;
  const qScore = ((provider.quality_score      || 0) / 5) * 100;
  const eScore = ((provider.environment_score  || 0) / 5) * 100;
  const pkScore = provider.has_parking             ? 100 : 0;
  const aScore  = provider.is_wheelchair_accessible ? 100 : 0;

  const weighted = (pScore*pw + qScore*qw + eScore*ew + pkScore*pkw + aScore*aw) / total;
  return Math.round(weighted);
}

function matchClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 45) return 'mid';
  return '';
}

// ── Date/Time helpers ────────────────────────────────────────
function fmtDate(dt)  { return new Date(dt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
function fmtTime(dt)  { return new Date(dt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }); }
function fmtDateTime(dt) { return fmtDate(dt) + ' · ' + fmtTime(dt); }
