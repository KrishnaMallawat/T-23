if (!requireAuth(['organiser'])) throw new Error('auth');
buildNav('/working-hours.html');

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let whData = {}; // day_of_week → row

async function init() {
  // Set default dates
  const today = new Date();
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  document.getElementById('gen-start').value = today.toISOString().slice(0,10);
  document.getElementById('gen-end').value   = nextWeek.toISOString().slice(0,10);

  await Promise.all([loadWH(), loadAppts()]);

  // Scroll to generate if hash
  if (location.hash === '#generate') document.getElementById('generate').scrollIntoView({ behavior:'smooth' });
}

async function loadWH() {
  try {
    const rows = await api('/api/organiser/working-hours');
    rows.forEach(r => whData[r.day_of_week] = r);
    renderWH();
  } catch(err) {
    document.getElementById('wh-table').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

function renderWH() {
  // Header
  const headerHtml = `
    <div class="wh-row" style="font-weight:700;font-size:13px;color:var(--purple-700);border-bottom:2px solid var(--purple-200);margin-bottom:4px">
      <div>Day</div><div>Start</div><div>End</div><div>Active</div>
    </div>`;

  const rowsHtml = DAYS.map((day, dow) => {
    const r = whData[dow] || null;
    const isActive = r?.is_active ?? false;
    const startVal = r?.start_time ? r.start_time.slice(0,5) : '09:00';
    const endVal   = r?.end_time   ? r.end_time.slice(0,5)   : '17:00';
    return `
    <div class="wh-row" id="wh-row-${dow}">
      <div class="wh-day">${day}</div>
      <input type="time" class="form-control" id="wh-start-${dow}" value="${startVal}" onchange="saveRow(${dow})">
      <input type="time" class="form-control" id="wh-end-${dow}"   value="${endVal}"   onchange="saveRow(${dow})">
      <label class="toggle-wrap">
        <span class="toggle ${isActive ? 'on' : ''}" id="wh-tog-${dow}" onclick="toggleDay(${dow})"></span>
      </label>
    </div>`;
  }).join('');

  document.getElementById('wh-table').innerHTML = headerHtml + rowsHtml;
}

function toggleDay(dow) {
  const t = document.getElementById('wh-tog-' + dow);
  const on = !t.classList.contains('on');
  t.classList.toggle('on', on);
  saveRow(dow, on);
}

async function saveRow(dow, activeOverride) {
  const start    = document.getElementById('wh-start-' + dow).value;
  const end      = document.getElementById('wh-end-'   + dow).value;
  const toggle   = document.getElementById('wh-tog-'   + dow);
  const isActive = activeOverride !== undefined ? activeOverride : toggle.classList.contains('on');

  if (!start || !end) return;
  if (end <= start) { toast('End time must be after start time.', 'error'); return; }

  try {
    const res = await api('/api/organiser/working-hours', {
      method:'POST',
      body: { day_of_week: dow, start_time: start, end_time: end, is_active: isActive }
    });
    whData[dow] = res;
    toast(DAYS[dow] + ' saved!', 'success');
  } catch(err) { toast(err.message, 'error'); }
}

async function loadAppts() {
  try {
    const appts = await api('/api/appointments');
    const sel = document.getElementById('gen-appt');
    appts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id; opt.textContent = a.title + ' (' + a.duration_mins + ' min)';
      sel.appendChild(opt);
    });
  } catch(_) {}
}

async function generateSlots() {
  const apptId = document.getElementById('gen-appt').value;
  const start  = document.getElementById('gen-start').value;
  const end    = document.getElementById('gen-end').value;

  if (!apptId) { toast('Please select a service.', 'error'); return; }
  if (!start || !end) { toast('Please select a date range.', 'error'); return; }
  if (end < start) { toast('End date must be on or after start date.', 'error'); return; }

  const btn = document.getElementById('gen-btn');
  btn.disabled = true; btn.textContent = 'Generating…';
  document.getElementById('gen-result').classList.add('d-none');

  try {
    const res = await api('/api/slots/generate', {
      method:'POST',
      body: { appointment_type_id: parseInt(apptId), start_date: start, end_date: end }
    });
    const resultEl = document.getElementById('gen-result');
    resultEl.textContent = `✅ ${res.message || res.slots_created + ' slots generated!'}`;
    resultEl.classList.remove('d-none');
    toast(res.message || 'Slots generated!', 'success');
  } catch(err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Generate Slots →';
  }
}

async function loadMySlots() {
  const date = document.getElementById('view-slots-date').value;
  if (!date) return;
  const user = getUser();
  if (!user) return;
  
  const container = document.getElementById('my-slots-container');
  container.innerHTML = '<div class="spinner"></div>';
  
  try {
    const slots = await api('/api/slots', { params: { organiser_id: user.id, date: date } });
    if (!slots.length) {
      container.innerHTML = '<p class="text-muted">No slots available on this date.</p>';
      return;
    }
    container.innerHTML = `<div class="slot-grid">${slots.map(s => `
      <div class="slot-btn" style="display:flex;flex-direction:column;gap:4px" onclick="deleteSlot(${s.id})" title="Click to delete this slot">
        <span style="font-size:14px">${fmtTime(s.slot_start)}</span>
        <span style="font-size:11px;color:var(--gray-600)">${s.service_title}</span>
      </div>`).join('')}</div>`;
  } catch(err) {
    container.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

async function deleteSlot(id) {
  if (!confirm('Are you sure you want to delete this available slot?')) return;
  try {
    await api('/api/slots/' + id, { method: 'DELETE' });
    toast('Slot deleted', 'success');
    loadMySlots(); // refresh the list
  } catch(err) {
    toast(err.message, 'error');
  }
}

init();
