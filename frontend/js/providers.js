if (!requireAuth(['customer'])) throw new Error('auth');
buildNav('/providers.html');

let allProviders = [];
let weights = { punctuality_weight:50, quality_weight:50, environment_weight:50, parking_weight:50, accessibility_weight:50 };
let filters  = { noise:'', parking:false, wheelchair:false };

const sliderMap = { p:'punctuality_weight', q:'quality_weight', e:'environment_weight', pk:'parking_weight', a:'accessibility_weight' };

async function init() {
  // Load saved preferences
  try {
    const prefs = await api('/api/users/me/preferences');
    ['punctuality_weight','quality_weight','environment_weight','parking_weight','accessibility_weight'].forEach(k => {
      if (prefs[k] !== undefined) weights[k] = prefs[k];
    });
    syncSliders();
  } catch(_) {}
  await loadProviders();
}

function syncSliders() {
  const map2 = { p:'punctuality_weight', q:'quality_weight', e:'environment_weight', pk:'parking_weight', a:'accessibility_weight' };
  Object.entries(map2).forEach(([key, wk]) => {
    const sl = document.getElementById('sl-' + key);
    const vl = document.getElementById('val-' + key);
    if (sl) { sl.value = weights[wk]; vl.textContent = weights[wk]; updateSliderBg(sl); }
  });
}

function updateSliderBg(el) {
  el.style.setProperty('--val', el.value + '%');
}

function onSlider(key, val) {
  const wk = sliderMap[key];
  weights[wk] = +val;
  document.getElementById('val-' + key).textContent = val;
  updateSliderBg(document.getElementById('sl-' + key));
  renderProviders();
}

function resetSliders() {
  Object.keys(weights).forEach(k => weights[k] = 50);
  syncSliders();
  renderProviders();
}

async function savePreferences() {
  try {
    await api('/api/users/me/preferences', { method:'PUT', body: weights });
    toast('Preferences saved!', 'success');
  } catch(err) { toast(err.message, 'error'); }
}

function toggleFilter(type) {
  if (type === 'parking') {
    filters.parking = !filters.parking;
    document.getElementById('parking-toggle').classList.toggle('on', filters.parking);
  } else {
    filters.wheelchair = !filters.wheelchair;
    document.getElementById('wheelchair-toggle').classList.toggle('on', filters.wheelchair);
  }
  renderProviders();
}

function applyFilters() {
  filters.noise = document.getElementById('f-noise').value;
  renderProviders();
}

async function loadProviders() {
  try {
    allProviders = await api('/api/providers');
    renderProviders();
  } catch(err) {
    document.getElementById('providers-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load providers</h3><p>' + err.message + '</p></div>';
  }
}

function renderProviders() {
  var list = allProviders.filter(function(p) {
    if (filters.parking && !p.has_parking) return false;
    if (filters.wheelchair && !p.is_wheelchair_accessible) return false;
    if (filters.noise && p.noise_level !== filters.noise) return false;
    return true;
  });

  // Compute match and sort
  list = list.map(function(p) { return Object.assign({}, p, { match: calcMatch(p, weights) }); })
             .sort(function(a, b) { return (b.match || 0) - (a.match || 0); });

  document.getElementById('results-count').textContent = list.length + ' provider' + (list.length !== 1 ? 's' : '');

  if (!list.length) {
    document.getElementById('providers-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No providers match your filters</h3><p>Try adjusting your filters.</p></div>';
    return;
  }

  document.getElementById('providers-container').innerHTML =
    '<div class="provider-grid">' + list.map(providerCard).join('') + '</div>';
}

function providerCard(p) {
  var initial = (p.full_name || '?')[0].toUpperCase();
  var match = p.match;
  var matchHtml = match !== null
    ? '<div class="match-badge ' + matchClass(match) + '" style="margin-bottom:12px">🎯 ' + match + '% Match</div>'
    : '';
  var amenities = [
    p.has_parking              ? '🅿️ Parking' : null,
    p.is_wheelchair_accessible ? '♿ Accessible' : null,
    p.noise_level ? (p.noise_level === 'quiet' ? '🤫 Quiet' : p.noise_level === 'loud' ? '📢 Loud' : '💬 Moderate') : null,
  ].filter(Boolean).map(function(a) { return '<span class="amenity-chip">' + a + '</span>'; }).join('');

  var pScore = p.punctuality_score  ? ((p.punctuality_score/5)*100).toFixed(0)  + '%' : '—';
  var qScore = p.quality_score      ? ((p.quality_score/5)*100).toFixed(0)      + '%' : '—';
  var reviews = p.total_reviews || 0;

  var href = '/provider?id=' + p.id;

  return '<a href="' + href + '" style="text-decoration:none;color:inherit;display:block">' +
    '<div class="provider-card">' +
      '<div class="provider-avatar">' + initial + '</div>' +
      matchHtml +
      '<div class="provider-name">' + p.full_name + '</div>' +
      '<div class="provider-bio">' + (p.bio || 'No bio provided.') + '</div>' +
      '<div class="provider-amenities">' + amenities + '</div>' +
      '<div style="display:flex;gap:16px;font-size:13px;color:var(--gray-600)">' +
        '<span>⏱️ Punct. <strong style="color:var(--gray-900)">' + pScore + '</strong></span>' +
        '<span>⭐ Quality <strong style="color:var(--gray-900)">' + qScore + '</strong></span>' +
        '<span>📝 <strong style="color:var(--gray-900)">' + reviews + '</strong> reviews</span>' +
      '</div>' +
      '<div style="margin-top:14px">' +
        '<span class="btn btn-primary btn-sm w-full">View &amp; Book →</span>' +
      '</div>' +
    '</div>' +
  '</a>';
}

init();
