if (!requireAuth(['customer'])) throw new Error('auth');
buildNav('/my-bookings.html');

let allBookings = [];
let currentTab  = 'all';
let cancelId    = null;
let rescheduleId= null;
let rsSlots     = [];
let selRsSlot   = null;

async function init() {
  try {
    allBookings = await api('/api/bookings/mine');
    renderBookings();
  } catch(err) {
    document.getElementById('bookings-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function filterTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBookings();
}

function renderBookings() {
  const filtered = currentTab === 'all'
    ? allBookings
    : currentTab === 'confirmed'
      ? allBookings.filter(b => ['confirmed','pending'].includes(b.status))
      : allBookings.filter(b => b.status === currentTab);

  if (!filtered.length) {
    document.getElementById('bookings-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">📅</div><h3>No bookings here</h3><p>Book a service to get started.</p><a href="/providers.html" class="btn btn-primary mt-16">Browse Providers</a></div>`;
    return;
  }

  document.getElementById('bookings-container').innerHTML =
    `<div style="display:flex;flex-direction:column;gap:14px">${filtered.map(bookingCard).join('')}</div>`;
}

function bookingCard(b) {
  const isUpcoming  = ['confirmed','pending'].includes(b.status);
  const isCompleted = b.status === 'completed';
  const statusCls   = `badge-${b.status}`;
  const statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1).replace('_',' ');

  const actions = [];
  if (isUpcoming) {
    actions.push(`<button class="btn btn-ghost btn-sm" onclick="openReschedule(${b.id}, ${b.slot_id||0})">🔄 Reschedule</button>`);
    actions.push(`<button class="btn btn-danger btn-sm" onclick="openCancel(${b.id})">✕ Cancel</button>`);
  }
  if (isCompleted && !b.has_feedback) {
    actions.push(`<a href="/feedback?booking_id=${b.id}" class="btn btn-secondary btn-sm">⭐ Leave Feedback</a>`);
  }
  if (b.status === 'cancelled' && b.cancellation_reason) {
    actions.push(`<button class="btn btn-ghost btn-sm" onclick="viewReason(${b.id})">💬 View Reason</button>`);
  }

  var providerLink = b.organiser_id ? '/provider?id=' + b.organiser_id : '#';

  return '<a href="' + providerLink + '" style="text-decoration:none;color:inherit;display:block">' +
  `<div class="card" style="padding:20px;cursor:pointer;transition:transform 0.2s, box-shadow 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='none';this.style.boxShadow='var(--shadow)'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span class="badge ${statusCls}">${statusLabel}</span>
          ${b.has_feedback ? '<span class="badge badge-confirmed">✅ Reviewed</span>' : ''}
        </div>
        <h4 style="margin-bottom:2px">${b.service_title}</h4>
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:6px">with <strong>${b.organiser_name}</strong></p>
        <div style="font-size:13px;color:var(--gray-600);display:flex;gap:16px;flex-wrap:wrap">
          <span>📅 ${fmtDate(b.slot_start)}</span>
          <span>🕐 ${fmtTime(b.slot_start)} – ${fmtTime(b.slot_end)}</span>
          <span>⏱️ ${b.duration_mins} min</span>
        </div>
        ${b.cancelled_at ? '<p style="font-size:12px;color:var(--danger);margin-top:6px">Cancelled on ' + fmtDate(b.cancelled_at) + '</p>' : ''}
      </div>
      ${actions.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap" onclick="event.preventDefault();event.stopPropagation()">' + actions.join('') + '</div>' : ''}
    </div>
  </div>` + '</a>';
}

function openCancel(id) {
  cancelId = id;
  document.getElementById('cancel-reason').value = '';
  openModal('cancel-modal');
}

async function doCancel() {
  const btn = document.getElementById('cancel-confirm-btn');
  btn.disabled = true; btn.textContent = 'Cancelling…';
  try {
    await api('/api/bookings/' + cancelId + '/cancel', {
      method:'PATCH', body:{ reason: document.getElementById('cancel-reason').value.trim() }
    });
    toast('Booking cancelled.', 'success');
    closeModal('cancel-modal');
    allBookings = await api('/api/bookings/mine');
    renderBookings();
  } catch(err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Cancel Booking';
  }
}

function openReschedule(bookingId, slotId) {
  rescheduleId = bookingId;
  selRsSlot    = null;
  document.getElementById('rs-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('rs-slots-container').innerHTML = '';
  document.getElementById('rs-confirm-btn').disabled = true;
  openModal('reschedule-modal');
  // Fetch provider from existing booking to know organiser_id
  const b = allBookings.find(x => x.id === bookingId);
  if (b) {
    document.getElementById('rs-date').dataset.providerId = b.organiser_id || '';
    document.getElementById('rs-date').dataset.apptId     = b.appt_type_id || '';
    loadRescheduleSlots();
  }
}

async function loadRescheduleSlots() {
  const date  = document.getElementById('rs-date').value;
  const pid   = document.getElementById('rs-date').dataset.providerId;
  if (!date || !pid) return;
  document.getElementById('rs-slots-container').innerHTML = '<div class="spinner" style="margin:12px auto"></div>';
  selRsSlot = null;
  document.getElementById('rs-confirm-btn').disabled = true;
  try {
    rsSlots = await api('/api/slots', { params:{ organiser_id: pid, date } });
    if (!rsSlots.length) {
      document.getElementById('rs-slots-container').innerHTML = '<p class="text-muted text-center" style="padding:12px">No slots on this day.</p>';
      return;
    }
    document.getElementById('rs-slots-container').innerHTML =
      `<div class="slot-grid" style="margin-top:12px">${rsSlots.map(s =>
        `<button class="slot-btn" id="rs-slot-${s.id}" onclick="selectRsSlot(${s.id})">${fmtTime(s.slot_start)}</button>`
      ).join('')}</div>`;
  } catch(err) {
    document.getElementById('rs-slots-container').innerHTML = `<p style="color:var(--danger);font-size:13px">${err.message}</p>`;
  }
}

function selectRsSlot(id) {
  selRsSlot = id;
  document.querySelectorAll('[id^="rs-slot-"]').forEach(b => b.classList.remove('selected'));
  document.getElementById('rs-slot-' + id).classList.add('selected');
  document.getElementById('rs-confirm-btn').disabled = false;
}

async function doReschedule() {
  if (!selRsSlot) return;
  const btn = document.getElementById('rs-confirm-btn');
  btn.disabled = true; btn.textContent = 'Rescheduling…';
  try {
    await api('/api/bookings/' + rescheduleId + '/reschedule', { method:'PATCH', body:{ new_slot_id: selRsSlot } });
    toast('Booking rescheduled!', 'success');
    closeModal('reschedule-modal');
    allBookings = await api('/api/bookings/mine');
    renderBookings();
  } catch(err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Reschedule';
  }
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function viewReason(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  document.getElementById('reason-text').textContent = b.cancellation_reason || 'No reason provided.';
  openModal('reason-modal');
}

init();
