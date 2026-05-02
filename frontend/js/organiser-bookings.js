if (!requireAuth(['organiser'])) throw new Error('auth');
buildNav('/organiser-bookings.html');

async function loadBookings() {
  const status = document.getElementById('status-filter').value;
  document.getElementById('bookings-container').innerHTML = '<div class="spinner"></div>';
  try {
    const bookings = await api('/api/organiser/bookings', { params: status ? { status } : {} });
    render(bookings);
  } catch(err) {
    document.getElementById('bookings-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function render(bookings) {
  if (!bookings.length) {
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
          ${bookings.map(b => `
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

loadBookings();
