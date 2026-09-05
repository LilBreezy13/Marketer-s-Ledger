
const SEC_SHEET = 'SECRETARIES';
const SEC_HEADERS = ['Username', 'Full Name', 'Password Hash', 'Salt', 'Role', 'Active', 'Created At'];
const SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 hour login session


// ---------- sheet + hashing helpers ----------

function ensureSecretariesSheet_() {
  let sheet = LEDGER_SS.getSheetByName(SEC_SHEET);
  if (!sheet) {
    sheet = LEDGER_SS.insertSheet(SEC_SHEET);
    sheet.getRange(1, 1, 1, SEC_HEADERS.length).setValues([SEC_HEADERS]);
    sheet.getRange(1, 1, 1, SEC_HEADERS.length).setFontWeight('bold').setBackground('#20124D').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, SEC_HEADERS.length, 150);
    sheet.hideColumns(3, 2); // hide password hash + salt columns from casual view
  }
  return sheet;
}

function sha256Hex_(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function makeSalt_() {
  return Utilities.getUuid();
}

function hashPassword_(password, salt) {
  return sha256Hex_(salt + ':' + password);
}

function makeToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}


// ---------- one-time bootstrap ----------

function bootstrapFirstAdmin() {
  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const already = existing.some(function (r) { return String(r[0]).toLowerCase() === 'admin'; });
    if (already) {
      LEDGER_SS.toast('An "admin" account already exists. Nothing changed.');
      return;
    }
  }
  const salt = makeSalt_();
  const hash = hashPassword_('ChangeMe123!', salt);
  sheet.appendRow(['admin', 'System Admin', hash, salt, 'admin', true, new Date()]);
  LEDGER_SS.toast('Admin account created. Username: admin  Password: ChangeMe123!  (change this immediately)');
}


// ---------- session cache ----------

function saveSession_(token, sessionObj) {
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify(sessionObj), SESSION_TTL_SECONDS);
}

function readSession_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('sess_' + token);
  return raw ? JSON.parse(raw) : null;
}

function destroySession_(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
}

function requireSession_(body) {
  const session = readSession_(body && body.token);
  if (!session) {
    const err = new Error('Your session has expired. Please log in again.');
    err.code = 'SESSION_EXPIRED';
    throw err;
  }
  return session;
}

function requireAdmin_(session) {
  if (session.role !== 'admin') {
    const err = new Error('This action requires an admin login.');
    err.code = 'FORBIDDEN';
    throw err;
  }
}


// ---------- HTTP entry points ----------

function doGet(e) {
  return handleApi_(e);
}

function doPost(e) {
  return handleApi_(e);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleApi_(e) {
  let body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action;
    let result;
    switch (action) {
      case 'ping':                result = { ok: true, message: 'pong' }; break;
      case 'login':                result = apiLogin_(body); break;
      case 'logout':               result = apiLogout_(body); break;
      case 'initData':             result = apiInitData_(body); break;
      case 'schools':              result = apiSchools_(body); break;
      case 'submitEntry':          result = apiSubmitEntry_(body); break;
      case 'history':              result = apiHistory_(body); break;
      case 'editEntry':            result = apiEditEntry_(body); break;
      case 'listSecretaries':      result = apiListSecretaries_(body); break;
      case 'addSecretary':         result = apiAddSecretary_(body); break;
      case 'deactivateSecretary':  result = apiSetSecretaryActive_(body, false); break;
      case 'reactivateSecretary':  result = apiSetSecretaryActive_(body, true); break;
      case 'resetSecretaryPassword': result = apiResetSecretaryPassword_(body); break;
      case 'changePassword':       result = apiChangePassword_(body); break;
      default:                     result = { ok: false, error: 'Unknown action: ' + action };
    }
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ ok: false, code: err.code || 'ERROR', error: String((err && err.message) || err) });
  }
}


// ---------- API implementations ----------

function apiLogin_(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return { ok: false, error: 'Enter a username and password.' };

  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'No secretary accounts exist yet. Run bootstrapFirstAdmin() first.' };

  const rows = sheet.getRange(2, 1, lastRow - 1, SEC_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).toLowerCase() === username) {
      if (r[5] !== true) return { ok: false, error: 'This account has been deactivated.' };
      const candidateHash = hashPassword_(password, String(r[3]));
      if (candidateHash !== r[2]) return { ok: false, error: 'Incorrect username or password.' };

      const token = makeToken_();
      const session = { username: username, fullName: r[1], role: r[4] };
      saveSession_(token, session);
      return { ok: true, token: token, fullName: r[1], role: r[4] };
    }
  }
  return { ok: false, error: 'Incorrect username or password.' };
}

function apiLogout_(body) {
  destroySession_(body.token);
  return { ok: true };
}

function apiInitData_(body) {
  const session = requireSession_(body);
  const data = getDialogInitData(); // reuses existing function
  return {
    ok: true,
    fullName: session.fullName,
    role: session.role,
    sources: data.sources,
    statuses: data.statuses,
    marketers: data.marketers,
    todayISO: data.todayISO
  };
}

function apiSchools_(body) {
  requireSession_(body);
  const marketer = String(body.marketer || '').trim();
  return { ok: true, schools: getSchoolsForRep(marketer) }; // reuses existing function
}

function apiSubmitEntry_(body) {
  const session = requireSession_(body);
  const payload = {
    date: body.date,
    school: body.school,
    sender: body.sender,
    amount: body.amount,
    status: body.status,
    source: body.source,
    marketer: body.marketer,
    agent: session.fullName // agent is always the logged-in secretary, never client-supplied
  };
  const res = submitLedgerEntry(payload); // reuses existing function
  return Object.assign({}, res);
}

function apiHistory_(body) {
  const session = requireSession_(body);
  const sheet = LEDGER_SS.getSheetByName(PHIST_SHEET);
  if (!sheet) return { ok: true, rows: [] };

  const lastLogRow = getNextPaymentHistLogRow() - 1;
  if (lastLogRow < PHIST_LOG_START_ROW) return { ok: true, rows: [] };

  const numRows = lastLogRow - PHIST_LOG_START_ROW + 1;
  const log = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, numRows, PHIST_LOG_WIDTH).getValues();

  const marketerFilter = String(body.marketer || '').trim();
  const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
  const dateTo = body.dateTo ? new Date(body.dateTo) : null;

  const rows = [];
  log.forEach(function (r) {
    const marketer = r[0], date = r[1], school = r[2], sender = r[3], amount = r[4],
      status = r[5], source = r[6], agent = r[7], loggedAt = r[8], rowRef = r[9];

    if (session.role !== 'admin' && agent !== session.fullName) return; // secretaries only see their own entries
    if (marketerFilter && marketerFilter !== 'ALL' && marketer !== marketerFilter) return;
    if (dateFrom && date instanceof Date && date < dateFrom) return;
    if (dateTo && date instanceof Date && date > dateTo) return;

    rows.push({
      marketer: marketer,
      date: date instanceof Date ? Utilities.formatDate(date, 'Africa/Accra', 'yyyy-MM-dd') : '',
      school: school,
      sender: sender,
      amount: amount,
      status: status,
      source: source,
      agent: agent,
      loggedAt: loggedAt instanceof Date ? Utilities.formatDate(loggedAt, 'Africa/Accra', "yyyy-MM-dd HH:mm") : '',
      rowRef: rowRef,
      canEdit: session.role === 'admin' || agent === session.fullName
    });
  });

  rows.sort(function (a, b) { return (b.loggedAt || '').localeCompare(a.loggedAt || ''); });
  return { ok: true, rows: rows };
}

function apiEditEntry_(body) {
  const session = requireSession_(body);
  const marketer = String(body.marketer || '').trim();
  const rowRef = Number(body.rowRef);
  if (!marketer || !rowRef) return { ok: false, error: 'Missing entry reference.' };

  const sheet = LEDGER_SS.getSheetByName(marketer);
  if (!sheet) return { ok: false, error: 'Unknown marketer sheet: ' + marketer };

  const existing = sheet.getRange(rowRef, COL_DATE, 1, COL_AGENT - COL_DATE + 1).getValues()[0];
  const existingAgent = existing[6];

  if (session.role !== 'admin' && existingAgent !== session.fullName) {
    return { ok: false, error: 'You can only edit entries you originally submitted.' };
  }

  const school = String(body.school || '').trim();
  const sender = String(body.sender || '').trim();
  const amount = Number(body.amount);
  const status = String(body.status || '').trim();
  const source = String(body.source || '').trim();
  const dateStr = String(body.date || '').trim();

  const missing = [];
  if (!dateStr) missing.push('Date');
  if (!school) missing.push('School Name');
  if (!sender) missing.push('Sender/Merchant');
  if (!body.amount || isNaN(amount) || amount <= 0) missing.push('Amount');
  if (missing.length) return { ok: false, error: 'Missing required field(s): ' + missing.join(', ') };

  const entryDate = parseIncomingDate_(dateStr);
  if (!entryDate) return { ok: false, error: 'Could not understand the date: ' + dateStr };

  // keep the original agent on record -- editing does not reassign ownership
  sheet.getRange(rowRef, COL_DATE, 1, 7).setValues([[entryDate, school, sender, amount, status, source, existingAgent]]);

  let warning = null;
  try {
    processLedgerRowChange(sheet, marketer, rowRef, true);
  } catch (err) {
    warning = 'Entry updated, but history sync failed: ' + ((err && err.message) || err);
  }
  refreshDailySummary(sheet);

  return warning ? { ok: true, warning: warning } : { ok: true };
}

function apiListSecretaries_(body) {
  const session = requireSession_(body);
  requireAdmin_(session);
  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, secretaries: [] };

  const rows = sheet.getRange(2, 1, lastRow - 1, SEC_HEADERS.length).getValues();
  const secretaries = rows.map(function (r) {
    return {
      username: r[0],
      fullName: r[1],
      role: r[4],
      active: r[5] === true,
      createdAt: r[6] instanceof Date ? Utilities.formatDate(r[6], 'Africa/Accra', 'yyyy-MM-dd') : ''
    };
  });
  return { ok: true, secretaries: secretaries };
}

function apiAddSecretary_(body) {
  const session = requireSession_(body);
  requireAdmin_(session);

  const username = String(body.newUsername || '').trim().toLowerCase();
  const fullName = String(body.newFullName || '').trim();
  const password = String(body.newPassword || '');
  const role = (body.newRole === 'admin') ? 'admin' : 'secretary';

  if (!username || !fullName || !password) {
    return { ok: false, error: 'Username, full name and password are all required.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    if (existing.some(function (r) { return String(r[0]).toLowerCase() === username; })) {
      return { ok: false, error: 'That username is already taken.' };
    }
  }

  const salt = makeSalt_();
  const hash = hashPassword_(password, salt);
  sheet.appendRow([username, fullName, hash, salt, role, true, new Date()]);
  return { ok: true };
}

function apiSetSecretaryActive_(body, active) {
  const session = requireSession_(body);
  requireAdmin_(session);

  const username = String(body.username || '').trim().toLowerCase();
  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'No secretaries found.' };

  const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < usernames.length; i++) {
    if (String(usernames[i][0]).toLowerCase() === username) {
      sheet.getRange(2 + i, 6).setValue(active);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Secretary not found.' };
}

// Admin resets a secretary's password when they've forgotten it / are locked out.
// This does NOT require knowing the old password -- that's the whole point of it
// being an admin-only action instead of the self-service changePassword above.
function apiResetSecretaryPassword_(body) {
  const session = requireSession_(body);
  requireAdmin_(session);

  const username = String(body.username || '').trim().toLowerCase();
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'No secretaries found.' };

  const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < usernames.length; i++) {
    if (String(usernames[i][0]).toLowerCase() === username) {
      const salt = makeSalt_();
      const hash = hashPassword_(newPassword, salt);
      sheet.getRange(2 + i, 3, 1, 2).setValues([[hash, salt]]);
      // Resetting a password also reactivates the account, in case it was
      // deactivated -- an admin resetting a password clearly means "let them back in".
      sheet.getRange(2 + i, 6).setValue(true);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Secretary not found.' };
}

function apiChangePassword_(body) {
  const session = requireSession_(body);
  const oldPassword = String(body.oldPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' };

  const sheet = ensureSecretariesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'Account not found.' };
  const rows = sheet.getRange(2, 1, lastRow - 1, SEC_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === session.username) {
      const currentHash = hashPassword_(oldPassword, String(rows[i][3]));
      if (currentHash !== rows[i][2]) return { ok: false, error: 'Current password is incorrect.' };

      const salt = makeSalt_();
      const hash = hashPassword_(newPassword, salt);
      sheet.getRange(2 + i, 3, 1, 2).setValues([[hash, salt]]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Account not found.' };
}


// ---------- optional: quick-add secretary from the Sheets UI menu ----------

function menuAddSecretaryQuick() {
  const ui = SpreadsheetApp.getUi();
  const u = ui.prompt('New secretary', 'Username (no spaces):', ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK || !u.getResponseText().trim()) return;
  const n = ui.prompt('New secretary', 'Full name:', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK || !n.getResponseText().trim()) return;
  const p = ui.prompt('New secretary', 'Temporary password (8+ characters):', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK || p.getResponseText().length < 8) {
    ui.alert('Password must be at least 8 characters. Nothing was created.');
    return;
  }

  const sheet = ensureSecretariesSheet_();
  const username = u.getResponseText().trim().toLowerCase();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    if (existing.some(function (r) { return String(r[0]).toLowerCase() === username; })) {
      ui.alert('That username already exists.');
      return;
    }
  }
  const salt = makeSalt_();
  const hash = hashPassword_(p.getResponseText(), salt);
  sheet.appendRow([username, n.getResponseText().trim(), hash, salt, 'secretary', true, new Date()]);
  ui.alert('Secretary "' + n.getResponseText().trim() + '" created. They can log in with username "' + username + '" now.');
}
