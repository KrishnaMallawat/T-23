if (!requireAuth(['organiser'])) throw new Error('auth');
buildNav('/appointments.html');

let appts = [];
let currentQApptId = null;

// ── Toggle helpers ───────────────────────────────────────────
function toggleField(toggleId, hiddenId) {
  const t  = document.getElementById(toggleId);
  const h  = document.getElementById(hiddenId);
  const on = !t.classList.contains('on');
  t.classList.toggle('on', on);
  h.value = String(on);
  const lbl = document.getElementById(toggleId.replace('-toggle','-label'));
  if (lbl) {
    if (hiddenId === 'manual_confirmation') lbl.textContent = on ? 'Manual confirm' : 'Auto-confirm';
    else lbl.textContent = on ? 'Allowed' : 'Disabled';
  }
}
function togglePayAmt() {
  const v = document.getElementById('f-payment').value;
  document.getElementById('pay-amt-group').style.opacity = v === 'none' ? '.4' : '1';
  document.getElementById('f-pay-amt').disabled = v === 'none';
}
function toggleNewQReq() {
  const t = document.getElementById('new-q-req-toggle');
  const on = !t.classList.contains('on');
  t.classList.toggle('on', on);
  document.getElementById('new-q-required').value = String(on);
}

// ── Load & Render ────────────────────────────────────────────
async function init() {
  try {
    appts = await api('/api/appointments');
    render();
  } catch(err) {
    document.getElementById('appts-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function render() {
  if (!appts.length) {
    document.getElementById('appts-container').innerHTML =
      `<div class="empty-state"><div class="empty-icon">📋</div><h3>No services yet</h3><p>Create your first appointment type to get started.</p><button class="btn btn-primary mt-16" onclick="openCreateModal()">+ New Service</button></div>`;
    return;
  }
  document.getElementById('appts-container').innerHTML =
    `<div style="display:flex;flex-direction:column;gap:14px">${appts.map(apptCard).join('')}</div>`;
}

function apptCard(a) {
  const payLabel = { none:'Free', optional_advance:'Optional advance', mandatory_advance:'Mandatory advance' };
  return `
  <div class="card" style="padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span class="badge ${a.is_published ? 'badge-confirmed' : 'badge-draft'}">${a.is_published ? '✅ Published' : '⏸ Draft'}</span>
          ${a.manual_confirmation ? '<span class="badge badge-purple">Manual confirm</span>' : ''}
        </div>
        <h4 style="margin-bottom:4px">${a.title}</h4>
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:8px">${a.description || 'No description.'}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--gray-600)">
          <span>⏱️ ${a.duration_mins} min</span>
          <span>👥 Cap: ${a.max_capacity}</span>
          <span>💳 ${payLabel[a.payment_requirement]||'Free'}</span>
          ${a.payment_amount > 0 ? `<span>₹${a.payment_amount}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="openQuestionsModal(${a.id})">📝 Questions</button>
        <button class="btn btn-ghost btn-sm" onclick="copyShareLink(${a.id})">🔗 Share</button>
        ${a.is_published
          ? `<button class="btn btn-ghost btn-sm" onclick="togglePublish(${a.id},false)">⏸ Unpublish</button>`
          : `<button class="btn btn-primary btn-sm" onclick="togglePublish(${a.id},true)">▶ Publish</button>`}
      </div>
    </div>
  </div>`;
}

// ── Create Modal ─────────────────────────────────────────────
function openCreateModal() {
  document.getElementById('modal-title').textContent = 'New Service';
  document.getElementById('save-service-btn').textContent = 'Create Service';
  ['f-title','f-desc','f-duration'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-capacity').value = '1';
  document.getElementById('f-payment').value  = 'none';
  document.getElementById('f-pay-amt').value  = '0';
  document.getElementById('f-cutoff').value   = '24';
  document.getElementById('f-refund-before').value = '100';
  document.getElementById('f-refund-after').value  = '0';
  document.getElementById('error-msg').classList.add('d-none');
  togglePayAmt();
  openModal('service-modal');
}

async function saveService() {
  const title    = document.getElementById('f-title').value.trim();
  const duration = parseInt(document.getElementById('f-duration').value);
  const errEl    = document.getElementById('error-msg');
  errEl.classList.add('d-none');

  if (!title) { errEl.textContent = 'Title is required.'; errEl.classList.remove('d-none'); return; }
  if (!duration || duration <= 0) { errEl.textContent = 'Duration must be a positive number.'; errEl.classList.remove('d-none'); return; }

  const btn = document.getElementById('save-service-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const body = {
      title, duration_mins: duration,
      description:           document.getElementById('f-desc').value.trim(),
      max_capacity:          parseInt(document.getElementById('f-capacity').value) || 1,
      payment_requirement:   document.getElementById('f-payment').value,
      payment_amount:        parseFloat(document.getElementById('f-pay-amt').value) || 0,
      allow_cancellation:    document.getElementById('allow_cancellation').value === 'true',
      allow_rescheduling:    document.getElementById('allow_rescheduling').value === 'true',
      cancellation_cutoff_hours:    parseInt(document.getElementById('f-cutoff').value) || 24,
      refund_percent_before_cutoff: parseInt(document.getElementById('f-refund-before').value) || 100,
      refund_percent_after_cutoff:  parseInt(document.getElementById('f-refund-after').value) || 0,
      manual_confirmation:   document.getElementById('manual_confirmation').value === 'true',
    };
    await api('/api/appointments', { method:'POST', body });
    toast('Service created!', 'success');
    closeModal('service-modal');
    appts = await api('/api/appointments');
    render();
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.remove('d-none');
    btn.disabled = false; btn.textContent = 'Create Service';
  }
}

async function togglePublish(id, publish) {
  try {
    await api(`/api/appointments/${id}/${publish ? 'publish' : 'unpublish'}`, { method:'PATCH' });
    toast(publish ? 'Service published!' : 'Service unpublished.', 'success');
    appts = await api('/api/appointments');
    render();
  } catch(err) { toast(err.message, 'error'); }
}

async function copyShareLink(id) {
  try {
    const res = await api(`/api/organiser/appointments/${id}/share-link`);
    await navigator.clipboard.writeText(res.share_url);
    toast('Share link copied to clipboard!', 'success');
  } catch(err) { toast(err.message, 'error'); }
}

// ── Questions Modal ──────────────────────────────────────────
async function openQuestionsModal(apptId) {
  currentQApptId = apptId;
  document.getElementById('new-q-text').value = '';
  openModal('questions-modal');
  await loadQuestions();
}

async function loadQuestions() {
  document.getElementById('questions-list').innerHTML = '<div class="spinner" style="margin:12px auto"></div>';
  try {
    const qs = await api('/api/appointments/' + currentQApptId + '/questions');
    if (!qs.length) {
      document.getElementById('questions-list').innerHTML = '<p class="text-muted">No questions yet.</p>';
      return;
    }
    document.getElementById('questions-list').innerHTML = qs.map(q => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100)">
        <div>
          <span style="font-size:14px">${q.question_text}</span>
          ${q.is_required ? ' <span class="badge badge-purple" style="font-size:10px">Required</span>' : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">✕</button>
      </div>`).join('');
  } catch(err) {
    document.getElementById('questions-list').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

async function addQuestion() {
  const text = document.getElementById('new-q-text').value.trim();
  if (!text) { toast('Question text is required.', 'error'); return; }
  try {
    await api('/api/appointments/' + currentQApptId + '/questions', {
      method:'POST',
      body: { question_text: text, is_required: document.getElementById('new-q-required').value === 'true', order_index: 0 }
    });
    document.getElementById('new-q-text').value = '';
    toast('Question added!', 'success');
    await loadQuestions();
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteQuestion(qid) {
  if (!confirm('Delete this question?')) return;
  try {
    await api(`/api/appointments/${currentQApptId}/questions/${qid}`, { method:'DELETE' });
    await loadQuestions();
  } catch(err) { toast(err.message, 'error'); }
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

init();
