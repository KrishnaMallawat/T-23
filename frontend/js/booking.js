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
    <div class="card card-elevated" style="padding:28px;margin-bottom:24px">
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
      <div id="questions-form">${questions.map(q => `
        <div class="form-group">
          <label class="form-label" for="q-${q.id}">${q.question_text}${q.is_required ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
          <textarea class="form-control" id="q-${q.id}" rows="2" ${q.is_required ? 'required' : ''}></textarea>
        </div>`).join('')}
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

  const answers = questions.map(q => {
    const el = document.getElementById('q-' + q.id);
    return { question_id: q.id, answer_text: el ? el.value.trim() : '' };
  }).filter(a => a.answer_text);

  // Check required
  for (const q of questions.filter(q => q.is_required)) {
    const el = document.getElementById('q-' + q.id);
    if (!el || !el.value.trim()) { toast('Please answer all required questions.', 'error'); el?.focus(); return; }
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
