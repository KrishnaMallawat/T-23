if (!requireAuth(['customer'])) throw new Error('auth');
buildNav('/providers.html');

const params     = new URLSearchParams(location.search);
const providerId = params.get('provider_id');
const apptId     = params.get('appt_id');
if (!providerId || !apptId) window.location.href = '/providers.html';

let appt      = null;
let questions = [];
let slots     = [];
let selSlot   = null;

async function init() {
  try {
    [appt, questions] = await Promise.all([
      api('/api/appointments/' + apptId + '/preview'),
      api('/api/appointments/' + apptId + '/questions')
    ]);
    renderStep1();
  } catch(err) {
    document.getElementById('booking-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function renderStep1() {
  const payLabel = { none:'Free', optional_advance:'Optional advance payment', mandatory_advance:'Advance payment required' };
  document.getElementById('booking-container').innerHTML = `
    ${appt.image_url ? `<img src="${appt.image_url}" style="width:100%;height:200px;object-fit:cover;border-radius:12px 12px 0 0;margin-bottom:-16px;position:relative;z-index:1" alt="Service Image">` : ''}
    <div class="card card-elevated" style="padding:28px;margin-bottom:24px;position:relative;z-index:2">
      <h2 style="margin-bottom:4px">${appt.title}</h2>
      <p style="color:var(--gray-600);margin-bottom:16px">${appt.description || ''}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="badge badge-purple">⏱️ ${appt.duration_mins} min</span>
        <span class="badge badge-purple">👥 Capacity: ${appt.max_capacity}</span>
        <span class="badge badge-purple">💳 ${payLabel[appt.payment_requirement] || 'Free'}</span>
        ${appt.payment_amount > 0 ? `<span class="badge badge-purple">₹${appt.payment_amount}</span>` : ''}
        ${appt.allow_cancellation ? `<span class="badge badge-confirmed">✅ Cancellable (${appt.cancellation_cutoff_hours}h cutoff)</span>` : `<span class="badge badge-cancelled">⚠️ No cancellation</span>`}
        ${appt.allow_rescheduling ? `<span class="badge badge-confirmed">🔄 Reschedulable</span>` : ''}
      </div>
      
      <!-- Amenities and Behavioral Scores -->
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--gray-200);display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <h4 style="margin-bottom:12px;font-size:14px;color:var(--gray-800)">🏢 Service Environment</h4>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${appt.has_parking ? `<span class="badge" style="background:var(--gray-100);color:var(--gray-800)">🅿️ Parking Available</span>` : ''}
            ${appt.is_wheelchair_accessible ? `<span class="badge" style="background:var(--gray-100);color:var(--gray-800)">♿ Wheelchair Accessible</span>` : ''}
            ${appt.noise_level ? `<span class="badge" style="background:var(--gray-100);color:var(--gray-800)">🔊 Noise: ${appt.noise_level}</span>` : ''}
            ${!appt.has_parking && !appt.is_wheelchair_accessible && !appt.noise_level ? '<span style="font-size:13px;color:var(--gray-500)">No specific amenities listed.</span>' : ''}
          </div>
        </div>
        <div>
          <h4 style="margin-bottom:12px;font-size:14px;color:var(--gray-800)">⭐ Provider Ratings</h4>
          ${appt.total_reviews ? `
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--gray-700)">
              <div style="display:flex;justify-content:space-between"><span>Punctuality</span><strong>${appt.punctuality_score}/5</strong></div>
              <div style="display:flex;justify-content:space-between"><span>Quality</span><strong>${appt.quality_score}/5</strong></div>
              <div style="display:flex;justify-content:space-between"><span>Avg Delay</span><strong>${appt.avg_delay_mins} min</strong></div>
              <div style="font-size:12px;color:var(--gray-500);margin-top:4px">Based on ${appt.total_reviews} reviews</div>
            </div>
          ` : '<span style="font-size:13px;color:var(--gray-500)">No reviews yet.</span>'}
        </div>
      </div>
    </div>

    <div class="card" style="padding:24px;margin-bottom:24px">
      <h3 style="margin-bottom:16px">1. Pick a date</h3>
      <input type="date" class="form-control" id="date-picker" style="max-width:200px"
        min="${new Date().toISOString().slice(0,10)}" onchange="loadSlots(this.value)">
    </div>

    <div id="slots-section" class="d-none">
      <div class="card" style="padding:24px;margin-bottom:24px">
        <h3 style="margin-bottom:4px">2. Pick a time slot</h3>
        <p class="text-muted mb-16">All times shown in your local timezone</p>
        <div id="slots-grid"></div>
      </div>
    </div>

    ${questions.length ? `
    <div id="questions-section" class="card d-none" style="padding:24px;margin-bottom:24px">
      <h3 style="margin-bottom:16px">3. Answer a few questions</h3>
      <div id="questions-form">${questions.map(q => {
        const reqStr = q.is_required ? ' <span style="color:var(--danger)">*</span>' : '';
        let inputHtml = '';
        if (q.question_type === 'mcq' && q.options) {
          let opts = [];
          try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch(e){}
          if (opts.length) {
            inputHtml = `<select class="form-control" id="q-${q.id}" ${q.is_required ? 'required' : ''}>
              <option value="" disabled selected>Select an option</option>
              ${opts.map(o => `<option value="${o.replace(/"/g,'&quot;')}">${o}</option>`).join('')}
            </select>`;
          } else {
            inputHtml = `<textarea class="form-control" id="q-${q.id}" rows="2" ${q.is_required ? 'required' : ''}></textarea>`;
          }
        } else {
          inputHtml = `<textarea class="form-control" id="q-${q.id}" rows="2" ${q.is_required ? 'required' : ''}></textarea>`;
        }
        return `
        <div class="form-group">
          <label class="form-label" for="q-${q.id}">${q.question_text}${reqStr}</label>
          ${inputHtml}
        </div>`;
      }).join('')}
      </div>
    </div>` : ''}

    <div id="confirm-section" class="d-none" style="text-align:right">
      <button class="btn btn-primary btn-lg" id="confirm-btn" onclick="confirmBooking()">Confirm Booking →</button>
    </div>`;

  // Set today's date by default
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('date-picker').value = today;
  loadSlots(today);
}

async function loadSlots(date) {
  selSlot = null;
  document.getElementById('slots-section').classList.remove('d-none');
  document.getElementById('slots-grid').innerHTML = '<div class="spinner" style="margin:16px auto"></div>';
  document.getElementById('confirm-section')?.classList.add('d-none');
  document.getElementById('questions-section')?.classList.add('d-none');

  try {
    slots = await api('/api/slots', { params: { organiser_id: providerId, date, appointment_type_id: apptId } });
    if (!slots.length) {
      document.getElementById('slots-grid').innerHTML = `<div class="text-center" style="padding:24px;color:var(--gray-400)">No available slots on this date. Try another day.</div>`;
      return;
    }
    document.getElementById('slots-grid').innerHTML = `<div class="slot-grid">${slots.map(s => `
      <button class="slot-btn" id="slot-${s.id}" onclick="selectSlot(${s.id})">
        ${fmtTime(s.slot_start)}<br>
        <span style="font-size:11px;opacity:.7">${s.seats_left} left</span>
      </button>`).join('')}</div>`;
  } catch(err) {
    document.getElementById('slots-grid').innerHTML = `<p class="text-center" style="color:var(--danger)">${err.message}</p>`;
  }
}

function selectSlot(id) {
  selSlot = slots.find(s => s.id === id);
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('slot-' + id).classList.add('selected');
  if (questions.length) document.getElementById('questions-section')?.classList.remove('d-none');
  document.getElementById('confirm-section')?.classList.remove('d-none');
}

async function confirmBooking() {
  if (!selSlot) { toast('Please select a time slot.', 'error'); return; }

  const answers = {};
  for (const q of questions) {
    const el = document.getElementById('q-' + q.id);
    const val = el ? el.value.trim() : '';
    if (q.is_required && !val) {
      toast('Please answer all required questions.', 'error');
      el?.focus();
      return;
    }
    if (val) answers[q.id] = val;
  }

  const btn = document.getElementById('confirm-btn');
  btn.disabled = true; btn.textContent = 'Booking…';
  try {
    const res = await api('/api/bookings', { method:'POST', body:{ slot_id: selSlot.id, answers } });
    toast(res.message || 'Booking confirmed!', 'success');
    setTimeout(() => window.location.href = '/my-bookings.html', 1500);
  } catch(err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Confirm Booking →';
  }
}

init();
