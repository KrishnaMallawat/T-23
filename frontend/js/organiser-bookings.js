if (!requireAuth(['organiser'])) throw new Error('auth');
buildNav('/organiser-bookings.html');

let allBookings = [];

async function loadBookings() {
  const status = document.getElementById('status-filter').value;
  document.getElementById('bookings-container').innerHTML = '<div class="spinner"></div>';
  try {
    allBookings = await api('/api/organiser/bookings', { params: status ? { status } : {} });
    render();
  } catch(err) {
    document.getElementById('bookings-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function render() {
  if (!allBookings.length) {
    document.getElementById('bookings-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">📅</div><h3>No bookings found</h3><p>Bookings will appear here once customers start booking your services.</p></div>`;
    return;
  }

  document.getElementById('bookings-container').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Service</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${allBookings.map(b => `
          <tr>
            <td style="color:var(--gray-400);font-size:13px">#${b.id}</td>
            <td>
              <div style="font-weight:600">${b.customer_name}</div>
              <div style="font-size:12px;color:var(--gray-400)">${b.customer_email}</div>
            </td>
            <td>${b.service_title}</td>
            <td>
              <div style="font-size:14px">${fmtDate(b.slot_start)}</div>
              <div style="font-size:12px;color:var(--gray-600)">${fmtTime(b.slot_start)} – ${fmtTime(b.slot_end)}</div>
            </td>
            <td><span class="badge badge-${b.status}">${b.status.replace('_',' ')}</span></td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${b.status === 'pending'   ? `<button class="btn btn-primary btn-sm" onclick="confirmBooking(${b.id})">✅ Confirm</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn-ghost btn-sm" onclick="markNoShow(${b.id})">👻 No-show</button>` : ''}
                ${['pending','confirmed'].includes(b.status) ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">✕ Cancel</button>` : ''}
                ${b.status === 'cancelled' && b.cancellation_reason ? `<button class="btn btn-ghost btn-sm" onclick="viewReason(${b.id})">💬 View Reason</button>` : ''}
                ${b.status === 'completed' && b.punctuality_rating ? `<button class="btn btn-secondary btn-sm" onclick="viewFeedback(${b.id})">⭐ View Feedback</button>` : ''}
                ${b.answers && b.answers.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="viewForm(${b.id})">📝 View Form</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function confirmBooking(id) {
  if (!confirm('Confirm this booking?')) return;
  try {
    await api('/api/bookings/' + id + '/confirm', { method:'PATCH' });
    toast('Booking confirmed!', 'success');
    loadBookings();
  } catch(err) { toast(err.message, 'error'); }
}

async function markNoShow(id) {
  if (!confirm('Mark this booking as no-show?')) return;
  try {
    await api('/api/bookings/' + id + '/no-show', { method:'PATCH' });
    toast('Marked as no-show.', 'success');
    loadBookings();
  } catch(err) { toast(err.message, 'error'); }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  try {
    await api('/api/bookings/' + id + '/cancel', { method:'PATCH', body:{ reason:'Cancelled by organiser.' } });
    toast('Booking cancelled.', 'success');
    loadBookings();
  } catch(err) { toast(err.message, 'error'); }
}

function viewReason(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  document.getElementById('reason-text').textContent = b.cancellation_reason || 'No reason provided.';
  openModal('reason-modal');
}

function viewFeedback(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;

  const overrunBadge = b.session_overran
    ? `<span class="badge badge-danger" style="margin-left:8px">⚠️ Session Overran</span>`
    : `<span class="badge badge-confirmed" style="margin-left:8px">⏱️ On Time</span>`;

  const styleBadge = b.provider_style
    ? `<span class="badge badge-purple" style="margin-left:8px">Style: ${b.provider_style}</span>`
    : '';

  document.getElementById('feedback-content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Punctuality:</strong>
        <span style="color:var(--yellow);font-size:16px">${'★'.repeat(b.punctuality_rating || 0)}${'☆'.repeat(5-(b.punctuality_rating || 0))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Quality:</strong>
        <span style="color:var(--yellow);font-size:16px">${'★'.repeat(b.quality_rating || 0)}${'☆'.repeat(5-(b.quality_rating || 0))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Environment:</strong>
        <span style="color:var(--yellow);font-size:16px">${'★'.repeat(b.environment_rating || 0)}${'☆'.repeat(5-(b.environment_rating || 0))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>🅿️ Parking:</strong>
        <span style="color:var(--yellow);font-size:16px">${b.parking_rating ? '★'.repeat(b.parking_rating) + '☆'.repeat(5-b.parking_rating) : '<span style="color:var(--gray-400);font-size:13px">Not rated</span>'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>♿ Accessibility:</strong>
        <span style="color:var(--yellow);font-size:16px">${b.accessibility_rating ? '★'.repeat(b.accessibility_rating) + '☆'.repeat(5-b.accessibility_rating) : '<span style="color:var(--gray-400);font-size:13px">Not rated</span>'}</span>
      </div>
      <div style="margin-top:8px">
        ${overrunBadge}
        ${styleBadge}
      </div>
      ${b.text_review ? `
        <div style="margin-top:16px">
          <strong>Review:</strong>
          <p style="margin-top:8px;padding:12px;background:var(--gray-50);border-radius:6px;border:1px solid var(--gray-200);color:var(--gray-700)">
            ${b.text_review.replace(/</g, '&lt;')}
          </p>
        </div>
      ` : ''}
    </div>
  `;
  openModal('feedback-modal');
}

function viewForm(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b || !b.answers) return;
  document.getElementById('form-content').innerHTML = b.answers.map(a => `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--gray-700)">${a.question}</div>
      <div style="margin-top:4px;padding:12px;background:var(--gray-50);border-radius:6px;border:1px solid var(--gray-200);color:var(--gray-800)">
        ${a.answer.replace(/</g, '&lt;')}
      </div>
    </div>
  `).join('');
  openModal('form-modal');
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

loadBookings();
