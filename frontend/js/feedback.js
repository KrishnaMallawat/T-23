if (!requireAuth(['customer'])) throw new Error('auth');
buildNav('/my-bookings.html');

const bookingId = new URLSearchParams(location.search).get('booking_id');
if (!bookingId) window.location.href = '/my-bookings.html';

const ratings  = { punctuality_rating: 0, quality_rating: 0, environment_rating: 0 };
let overrun    = false;
let style      = null;

// Build star widgets
['punctuality', 'quality', 'environment'].forEach(key => {
  const container = document.getElementById('stars-' + key);
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement('span');
    span.className = 'star';
    span.textContent = '★';
    span.dataset.val = i;
    span.addEventListener('click', () => setStar(key, i, container));
    span.addEventListener('mouseenter', () => hoverStar(i, container));
    span.addEventListener('mouseleave', () => renderStars(ratings[key + '_rating'], container));
    container.appendChild(span);
  }
});

function setStar(key, val, container) {
  ratings[key + '_rating'] = val;
  renderStars(val, container);
}
function hoverStar(val, container) {
  container.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < val));
}
function renderStars(val, container) {
  container.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < val));
}

function toggleOverrun() {
  overrun = !overrun;
  document.getElementById('overrun-toggle').classList.toggle('on', overrun);
  document.getElementById('delay-group').style.display = overrun ? 'block' : 'none';
}

function setStyle(s, btn) {
  style = s;
  document.querySelectorAll('#style-btns .btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-ghost');
  });
  btn.classList.remove('btn-ghost');
  btn.classList.add('btn-primary');
}

async function submitFeedback() {
  const errEl = document.getElementById('error-msg');
  errEl.classList.add('d-none');

  const body = {
    punctuality_rating:  ratings.punctuality_rating  || null,
    quality_rating:      ratings.quality_rating      || null,
    environment_rating:  ratings.environment_rating  || null,
    session_overran:     overrun,
    avg_delay_mins:      overrun ? parseInt(document.getElementById('avg-delay').value) || 0 : 0,
    provider_style:      style,
    text_review:         document.getElementById('text-review').value.trim() || null,
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api('/api/feedback/' + bookingId, { method:'POST', body });
    toast('Thank you for your feedback! 🎉', 'success');
    setTimeout(() => window.location.href = '/my-bookings.html', 1500);
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.remove('d-none');
    btn.disabled = false; btn.textContent = 'Submit Feedback';
  }
}
