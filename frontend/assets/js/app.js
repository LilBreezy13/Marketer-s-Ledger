// -----------------------------------------------------------------------
// App state
// -----------------------------------------------------------------------
let STATE = {
  sources: [], statuses: [], marketers: [],
  sessionCount: 0
};

const $ = (id) => document.getElementById(id);

function showBanner(el, msg, type) {
  el.textContent = msg;
  el.className = 'text-sm rounded-lg px-3.5 py-2.5 ' +
    (type === 'error' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success');
}
function hideBanner(el) { el.className = 'hidden'; }

// -----------------------------------------------------------------------
// Reusable searchable dropdown (mirrors the original Apps Script dialog UX)
// -----------------------------------------------------------------------
function setupDropdown(inputEl, listEl, getItems, opts = {}) {
  function render(filterText) {
    const items = getItems() || [];
    const q = (filterText || '').toLowerCase();
    const filtered = q ? items.filter(v => v.toLowerCase().includes(q)) : items;

    listEl.innerHTML = '';
    if (items.length === 0) { listEl.classList.remove('open'); return; }

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dropdown-empty';
      empty.textContent = 'No matches';
      listEl.appendChild(empty);
      listEl.classList.add('open');
      return;
    }
    filtered.forEach(v => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = v;
      item.onmousedown = (e) => {
        e.preventDefault();
        inputEl.value = v;
        listEl.classList.remove('open');
        if (opts.onSelect) opts.onSelect(v);
      };
      listEl.appendChild(item);
    });
    listEl.classList.add('open');
  }

  inputEl.addEventListener('input', () => render(inputEl.value));
  inputEl.addEventListener('focus', () => render(inputEl.value));
  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      listEl.classList.remove('open');
      const items = getItems() || [];
      const exact = items.find(v => v.toLowerCase() === inputEl.value.trim().toLowerCase());
      if (exact && opts.onSelect) opts.onSelect(exact);
    }, 120);
  });
}

// -----------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('loginBanner');
  hideBanner(banner);
  const btn = $('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in...';

  try {
    const res = await Api.call('login', {
      username: $('loginUsername').value.trim(),
      password: $('loginPassword').value
    });
    if (res.ok) {
      Api.setSession(res);
      enterApp();
    } else {
      showBanner(banner, res.error || 'Could not sign in.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

window.addEventListener('mlw:session-expired', () => {
  showLogin('Your session expired. Please sign in again.');
});

function showLogin(message) {
  $('view-app').classList.add('hidden');
  $('view-login').classList.remove('hidden');
  if (message) showBanner($('loginBanner'), message, 'error'); else hideBanner($('loginBanner'));
}

$('logoutBtn').addEventListener('click', async () => {
  try { await Api.call('logout'); } catch (e) {}
  Api.clearSession();
  showLogin();
});

// -----------------------------------------------------------------------
// Change my own password
// -----------------------------------------------------------------------
$('changePwBtn').addEventListener('click', () => {
  $('pwForm').reset();
  hideBanner($('pwBanner'));
  $('pwModal').classList.remove('hidden');
});
$('pwCloseBtn').addEventListener('click', () => $('pwModal').classList.add('hidden'));

$('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('pwBanner');
  hideBanner(banner);
  const oldPassword = $('pw_old').value;
  const newPassword = $('pw_new').value;
  if (!oldPassword || newPassword.length < 8) {
    showBanner(banner, 'Enter your current password and a new one (8+ characters).', 'error');
    return;
  }
  try {
    const res = await Api.call('changePassword', { oldPassword, newPassword });
    if (res.ok) {
      showBanner(banner, 'Password updated.', 'success');
      setTimeout(() => $('pwModal').classList.add('hidden'), 900);
    } else {
      showBanner(banner, res.error || 'Could not update password.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

// -----------------------------------------------------------------------
// App shell / tabs
// -----------------------------------------------------------------------
function setActiveTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  $('panel-' + tab).classList.remove('hidden');

  document.querySelectorAll('.navbtn').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('bg-brand-50', active);
    b.classList.toggle('text-brand', active);
    b.classList.toggle('text-muted', !active);
  });
  document.querySelectorAll('.navbtn-mobile').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('text-brand', active);
    b.classList.toggle('text-muted', !active);
  });

  if (tab === 'history') loadHistory();
  if (tab === 'admin') loadSecretaries();
}
document.querySelectorAll('.navbtn, .navbtn-mobile').forEach(b => {
  b.addEventListener('click', () => setActiveTab(b.dataset.tab));
});

async function enterApp() {
  const user = Api.currentUser();
  if (!user) { showLogin(); return; }

  $('view-login').classList.add('hidden');
  $('view-app').classList.remove('hidden');
  $('view-app').classList.add('rise-in');
  $('topbarName').textContent = user.fullName;
  $('topbarRole').textContent = user.role;
  $('entryAgentName').textContent = user.fullName;

  const isAdmin = user.role === 'admin';
  $('navAdmin').classList.toggle('hidden', !isAdmin);
  $('navAdminMobile').classList.toggle('hidden', !isAdmin);

  await loadInitData();
  setActiveTab('entry');
}

// -----------------------------------------------------------------------
// New entry panel
// -----------------------------------------------------------------------
async function loadInitData() {
  try {
    const res = await Api.call('initData');
    if (!res.ok) { showBanner($('entryBanner'), res.error, 'error'); return; }
    STATE.sources = res.sources || [];
    STATE.statuses = res.statuses || [];
    STATE.marketers = res.marketers || [];
    $('f_date').value = res.todayISO;
  } catch (err) {
    showBanner($('entryBanner'), err.message, 'error');
  }
}

let SCHOOLS = [];
async function loadSchoolsForMarketer(marketer) {
  const schoolInput = $('f_school');
  if (!marketer) { SCHOOLS = []; schoolInput.placeholder = 'Select a marketer first...'; return; }
  schoolInput.placeholder = 'Loading schools...';
  try {
    const res = await Api.call('schools', { marketer });
    SCHOOLS = res.ok ? (res.schools || []) : [];
  } catch (err) {
    SCHOOLS = [];
  }
  schoolInput.placeholder = 'Select or type a school name...';
}

setupDropdown($('f_source'), $('f_source_list'), () => STATE.sources);
setupDropdown($('f_status'), $('f_status_list'), () => STATE.statuses);
setupDropdown($('f_school'), $('f_school_list'), () => SCHOOLS);
setupDropdown($('f_marketer'), $('f_marketer_list'), () => STATE.marketers, {
  onSelect: (v) => { $('f_school').value = ''; loadSchoolsForMarketer(v); }
});

function resetPerEntryFields() {
  $('f_school').value = '';
  $('f_sender').value = '';
  $('f_amount').value = '';
  $('f_status').value = '';
  $('f_sender').focus();
}
$('entryResetBtn').addEventListener('click', () => {
  $('f_school').value = ''; $('f_sender').value = ''; $('f_amount').value = '';
  $('f_status').value = ''; $('f_marketer').value = '';
});

$('entryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('entryBanner');
  hideBanner(banner);

  const payload = {
    date: $('f_date').value,
    source: $('f_source').value.trim(),
    marketer: $('f_marketer').value.trim(),
    school: $('f_school').value.trim(),
    sender: $('f_sender').value.trim(),
    amount: $('f_amount').value,
    status: $('f_status').value.trim()
  };

  const missing = [];
  if (!payload.date) missing.push('Date');
  if (!payload.source) missing.push('Source');
  if (!payload.marketer) missing.push("Marketer's Name");
  if (!payload.school) missing.push('School Name');
  if (!payload.sender) missing.push('Sender/Merchant');
  if (!payload.amount || Number(payload.amount) <= 0) missing.push('Amount');
  if (missing.length) { showBanner(banner, 'Missing required field(s): ' + missing.join(', '), 'error'); return; }

  const btn = $('entrySubmitBtn');
  btn.disabled = true; btn.textContent = 'Submitting...';
  try {
    const res = await Api.call('submitEntry', payload);
    if (res.ok) {
      STATE.sessionCount++;
      $('entrySessionCount').textContent = STATE.sessionCount + ' record' + (STATE.sessionCount === 1 ? '' : 's') + ' submitted this session';
      showBanner(banner, res.warning || ('Saved to ' + payload.marketer + '\u2019s sheet.'), res.warning ? 'error' : 'success');
      resetPerEntryFields();
    } else {
      showBanner(banner, res.error || 'Something went wrong.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit entry';
  }
});

// -----------------------------------------------------------------------
// History panel
// -----------------------------------------------------------------------
setupDropdown($('h_marketer'), $('h_marketer_list'), () => ['ALL', ...STATE.marketers]);

$('h_search').addEventListener('click', loadHistory);

const statusPill = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('wrong')) return 'bg-danger-bg text-danger';
  if (!s) return 'bg-gray-100 text-muted';
  return 'bg-success-bg text-success';
};

async function loadHistory() {
  const list = $('historyList');
  list.innerHTML = '<p class="text-sm text-muted py-6 text-center">Loading...</p>';
  $('historyEmpty').classList.add('hidden');

  try {
    const res = await Api.call('history', {
      marketer: $('h_marketer').value.trim(),
      dateFrom: $('h_from').value,
      dateTo: $('h_to').value
    });
    if (!res.ok) { list.innerHTML = ''; showBanner($('historyEmpty'), res.error, 'error'); return; }

    const rows = res.rows || [];
    list.innerHTML = '';
    if (rows.length === 0) { $('historyEmpty').classList.remove('hidden'); return; }

    rows.forEach(r => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-border rounded-xl p-4 flex items-start justify-between gap-3';
      card.innerHTML = `
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm">${escapeHtml(r.marketer)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${statusPill(r.status)}">${escapeHtml(r.status || 'Recorded')}</span>
          </div>
          <div class="text-sm text-muted mt-0.5 truncate">${escapeHtml(r.school)} · ${escapeHtml(r.sender)}</div>
          <div class="text-xs text-muted mt-1">${escapeHtml(r.date)} &middot; logged by ${escapeHtml(r.agent)} &middot; ${escapeHtml(r.source || '')}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-display font-semibold tnum">GHS ${Number(r.amount || 0).toFixed(2)}</div>
          ${r.canEdit ? `<button class="text-xs font-semibold text-brand hover:text-brand-light mt-1.5 edit-btn">Edit</button>` : ''}
        </div>`;
      if (r.canEdit) {
        card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(r));
      }
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = '';
    $('historyEmpty').classList.remove('hidden');
    $('historyEmpty').textContent = err.message;
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// -----------------------------------------------------------------------
// Edit modal
// -----------------------------------------------------------------------
function openEditModal(r) {
  $('e_marketer').value = r.marketer;
  $('e_rowRef').value = r.rowRef;
  $('e_date').value = r.date;
  $('e_source').value = r.source || '';
  $('e_school').value = r.school || '';
  $('e_sender').value = r.sender || '';
  $('e_amount').value = r.amount || '';
  $('e_status').value = r.status || '';
  hideBanner($('editBanner'));
  $('editModal').classList.remove('hidden');
}
function closeEditModal() { $('editModal').classList.add('hidden'); }
$('editCloseBtn').addEventListener('click', closeEditModal);
$('editCancelBtn').addEventListener('click', closeEditModal);

$('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('editBanner');
  hideBanner(banner);

  const payload = {
    marketer: $('e_marketer').value,
    rowRef: $('e_rowRef').value,
    date: $('e_date').value,
    source: $('e_source').value.trim(),
    school: $('e_school').value.trim(),
    sender: $('e_sender').value.trim(),
    amount: $('e_amount').value,
    status: $('e_status').value.trim()
  };

  try {
    const res = await Api.call('editEntry', payload);
    if (res.ok) {
      closeEditModal();
      loadHistory();
    } else {
      showBanner(banner, res.error || 'Could not save changes.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

// -----------------------------------------------------------------------
// Admin panel — secretaries
// -----------------------------------------------------------------------
async function loadSecretaries() {
  const list = $('secretariesList');
  list.innerHTML = '<p class="text-sm text-muted py-6 text-center">Loading...</p>';
  try {
    const res = await Api.call('listSecretaries');
    if (!res.ok) { list.innerHTML = `<p class="text-sm text-danger py-4">${escapeHtml(res.error)}</p>`; return; }

    list.innerHTML = '';
    (res.secretaries || []).forEach(s => {
      const row = document.createElement('div');
      row.className = 'bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm">${escapeHtml(s.fullName)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand capitalize">${escapeHtml(s.role)}</span>
            ${s.active ? '' : '<span class="text-xs px-2 py-0.5 rounded-full bg-danger-bg text-danger">Deactivated</span>'}
          </div>
          <div class="text-xs text-muted mt-1">@${escapeHtml(s.username)} &middot; added ${escapeHtml(s.createdAt)}</div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button class="reset-btn text-xs font-semibold text-brand hover:text-brand-light">Reset password</button>
          <button class="toggle-btn text-xs font-semibold ${s.active ? 'text-danger' : 'text-success'}">
            ${s.active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>`;
      row.querySelector('.reset-btn').addEventListener('click', () => openResetPwModal(s));
      row.querySelector('.toggle-btn').addEventListener('click', async () => {
        await Api.call(s.active ? 'deactivateSecretary' : 'reactivateSecretary', { username: s.username });
        loadSecretaries();
      });
      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-danger py-4">${escapeHtml(err.message)}</p>`;
  }
}

function openResetPwModal(s) {
  $('rp_username').value = s.username;
  $('rp_fullname').textContent = s.fullName;
  $('rp_new').value = '';
  hideBanner($('resetPwBanner'));
  $('resetPwModal').classList.remove('hidden');
}
$('resetPwCloseBtn').addEventListener('click', () => $('resetPwModal').classList.add('hidden'));

$('resetPwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('resetPwBanner');
  hideBanner(banner);
  const newPassword = $('rp_new').value;
  if (newPassword.length < 8) { showBanner(banner, 'Password must be at least 8 characters.', 'error'); return; }

  try {
    const res = await Api.call('resetSecretaryPassword', {
      username: $('rp_username').value,
      newPassword
    });
    if (res.ok) {
      showBanner(banner, 'Password reset. Share it with them securely.', 'success');
      loadSecretaries();
      setTimeout(() => $('resetPwModal').classList.add('hidden'), 1000);
    } else {
      showBanner(banner, res.error || 'Could not reset password.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

$('addSecForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const banner = $('adminBanner');
  hideBanner(banner);

  const payload = {
    newUsername: $('s_username').value.trim(),
    newFullName: $('s_fullname').value.trim(),
    newPassword: $('s_password').value,
    newRole: $('s_role').value
  };
  try {
    const res = await Api.call('addSecretary', payload);
    if (res.ok) {
      showBanner(banner, 'Account created — share the temporary password securely.', 'success');
      $('addSecForm').reset();
      loadSecretaries();
    } else {
      showBanner(banner, res.error || 'Could not create account.', 'error');
    }
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

// -----------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------
(function boot() {
  if (Api.currentUser()) enterApp(); else showLogin();
})();
