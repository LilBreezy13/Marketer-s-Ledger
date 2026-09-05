<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --brand: #20124D;
      --brand-light: #3a2470;
      --border: #d9d9e3;
      --bg: #f6f6fa;
      --danger: #c0392b;
      --danger-bg: #fdecea;
      --success-bg: #e8f7ee;
      --success: #1e7e42;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      font-family: Arial, sans-serif;
      color: #222;
    }
    .header {
      background: var(--brand);
      color: #fff;
      padding: 16px 20px;
      font-size: 16px;
      font-weight: bold;
    }
    .header small {
      display: block;
      font-weight: normal;
      font-size: 11px;
      opacity: .8;
      margin-top: 2px;
    }
    form { padding: 16px 20px 90px; }
    .field { margin-bottom: 14px; }
    label {
      display: block;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: .03em;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 5px;
    }
    label .req { color: var(--danger); }
    input[type="text"], input[type="date"], input[type="number"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
    }
    input:focus { outline: none; border-color: var(--brand); }

 
    .dropdown-wrap { position: relative; }
    .dropdown-list {
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: 0 8px 20px rgba(0,0,0,0.14);
      z-index: 50;
    }
    .dropdown-list.open { display: block; }
    .dropdown-item {
      padding: 9px 12px;
      font-size: 13.5px;
      cursor: pointer;
      color: #222;
    }
    .dropdown-item:hover,
    .dropdown-item.active {
      background: #ece7f8;
    }
    .dropdown-empty {
      padding: 9px 12px;
      font-size: 12.5px;
      color: #999;
    }
    .dropdown-list::-webkit-scrollbar { width: 8px; }
    .dropdown-list::-webkit-scrollbar-track { background: transparent; }
    .dropdown-list::-webkit-scrollbar-thumb {
      background: #d3d3dd;
      border-radius: 4px;
    }
    /* ---------------------------------------------------------------------- */

    .amount-wrap {
      display: flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
    }
    .amount-wrap span {
      padding: 10px 10px 10px 12px;
      font-size: 13px;
      font-weight: bold;
      color: #666;
      background: #f0f0f4;
      border-right: 1px solid var(--border);
    }
    .amount-wrap input {
      border: none;
      flex: 1;
    }
    .amount-wrap input:focus { outline: none; }
    .hooked-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: normal;
      text-transform: none;
      background: #ece7f8;
      color: var(--brand);
      border-radius: 10px;
      padding: 1px 8px;
      margin-left: 6px;
    }
    .row2 { display: flex; gap: 10px; }
    .row2 .field { flex: 1; }
    .banner {
      display: none;
      font-size: 12.5px;
      padding: 9px 12px;
      border-radius: 8px;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .banner.error { display: block; background: var(--danger-bg); color: var(--danger); }
    .banner.success { display: block; background: var(--success-bg); color: var(--success); }
    .footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #fff;
      border-top: 1px solid var(--border);
      padding: 12px 20px;
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: bold;
      font-family: inherit;
      cursor: pointer;
    }
    #closeBtn { background: #eee; color: #333; }
    #closeBtn:hover { background: #e2e2e2; }
    #submitBtn { background: var(--brand); color: #fff; }
    #submitBtn:hover { background: var(--brand-light); }
    #submitBtn:disabled { opacity: .6; cursor: default; }
    .count {
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-top: -6px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>

  <div class="header">
    New Entry
    <small>Data Entry Agent, Source and Marketer stays selected until you close this window.</small>
  </div>

  <form id="entryForm" onsubmit="return false;">

    <div class="field">
      <label for="date">Date <span class="req">*</span></label>
      <input type="date" id="date" required>
    </div>

    <div class="field">
      <label for="agent">Data Entry Agent <span class="req">*</span><span class="hooked-badge">stays selected</span></label>
      <div class="dropdown-wrap">
        <input type="text" id="agent" placeholder="Type or select..." autocomplete="off" required>
        <div class="dropdown-list" id="agentDropdown"></div>
      </div>
    </div>

    <div class="field">
      <label for="source">Source <span class="req">*</span><span class="hooked-badge">stays selected</span></label>
      <div class="dropdown-wrap">
        <input type="text" id="source" placeholder="Type or select..." autocomplete="off" required>
        <div class="dropdown-list" id="sourceDropdown"></div>
      </div>
    </div>

    <div class="field">
      <label for="marketer">Marketer's Name <span class="req">*</span><span class="hooked-badge">stays selected</span></label>
      <div class="dropdown-wrap">
        <input type="text" id="marketer" placeholder="Select marketer..." autocomplete="off" required>
        <div class="dropdown-list" id="marketerDropdown"></div>
      </div>
    </div>

    <div class="field">
      <label for="school">School Name <span class="req">*</span></label>
      <div class="dropdown-wrap">
        <input type="text" id="school" placeholder="Select a marketer first..." autocomplete="off" required>
        <div class="dropdown-list" id="schoolDropdown"></div>
      </div>
    </div>

    <div class="field">
      <label for="sender">Sender / Merchant <span class="req">*</span></label>
      <input type="text" id="sender" placeholder="Enter sender or merchant name">
    </div>

    <div class="row2">
      <div class="field">
        <label for="amount">Amount <span class="req">*</span></label>
        <div class="amount-wrap">
          <span>GHS</span>
          <input type="number" id="amount" min="0" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="field">
        <label for="status">Status</label>
        <div class="dropdown-wrap">
          <input type="text" id="status" placeholder="Optional" autocomplete="off">
          <div class="dropdown-list" id="statusDropdown"></div>
        </div>
      </div>
    </div>

    <div class="count" id="sessionCount"></div>


    <div id="banner" class="banner"></div>
  </form>

  <div class="footer">
    <button type="button" id="closeBtn" onclick="closeDialog()">Close</button>
    <button type="button" id="submitBtn" onclick="submitEntry()">Submit Entry</button>
  </div>

  <script>
    let submittedCount = 0;

    let AGENTS = [];
    let SOURCES = [];
    let STATUSES = [];
    let MARKETERS = [];
    let SCHOOLS = [];

    function todayLocalISO(fallback) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return fallback || (y + '-' + m + '-' + day);
    }

    function showBanner(msg, type) {
      const b = document.getElementById('banner');
      b.textContent = msg;
      b.className = 'banner ' + type;
    }

    function clearBanner() {
      const b = document.getElementById('banner');
      b.className = 'banner';
      b.textContent = '';
    }

    function setupDropdown(inputId, listId, getItems, opts) {
      opts = opts || {};
      const input = document.getElementById(inputId);
      const list = document.getElementById(listId);

      function render(filterText) {
        const items = getItems() || [];
        const q = (filterText || '').toLowerCase();
        const filtered = q ? items.filter(function (v) {
          return v.toLowerCase().indexOf(q) !== -1;
        }) : items;

        list.innerHTML = '';
        if (items.length === 0) {
          list.classList.remove('open');
          return;
        }
        if (filtered.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'dropdown-empty';
          empty.textContent = 'No matches';
          list.appendChild(empty);
          list.classList.add('open');
          return;
        }
        filtered.forEach(function (v) {
          const item = document.createElement('div');
          item.className = 'dropdown-item';
          item.textContent = v;
         
          item.onmousedown = function (e) {
            e.preventDefault();
            input.value = v;
            list.classList.remove('open');
            if (opts.onSelect) opts.onSelect(v);
          };
          list.appendChild(item);
        });
        list.classList.add('open');
      }

      input.addEventListener('input', function () { render(input.value); });
      input.addEventListener('focus', function () { render(input.value); });
      input.addEventListener('blur', function () {
        setTimeout(function () {
          list.classList.remove('open');
         
          const items = getItems() || [];
          const exact = items.find(function (v) {
            return v.toLowerCase() === input.value.trim().toLowerCase();
          });
          if (exact && opts.onSelect) opts.onSelect(exact);
        }, 120);
      });
    }
    /* ------------------------------------------------------------------------------ */

    function loadSchoolsForMarketer(marketer) {
      const schoolInput = document.getElementById('school');
      if (!marketer) {
        SCHOOLS = [];
        schoolInput.placeholder = 'Select a marketer first...';
        return;
      }
      schoolInput.placeholder = 'Loading schools...';
      google.script.run
        .withSuccessHandler(function (schools) {
          SCHOOLS = schools || [];
          schoolInput.placeholder = 'Select or type a school name...';
        })
        .withFailureHandler(function () {
          SCHOOLS = [];
          schoolInput.placeholder = 'Select or type a school name...';
        })
        .getSchoolsForRep(marketer);
    }

    function resetPerEntryFields() {
      document.getElementById('school').value = '';
      document.getElementById('sender').value = '';
      document.getElementById('amount').value = '';
      document.getElementById('status').value = '';
      document.getElementById('sender').focus();
    }

    function submitEntry() {
      clearBanner();
      const payload = {
        date: document.getElementById('date').value,
        agent: document.getElementById('agent').value.trim(),
        source: document.getElementById('source').value.trim(),
        marketer: document.getElementById('marketer').value.trim(),
        school: document.getElementById('school').value.trim(),
        sender: document.getElementById('sender').value.trim(),
        amount: document.getElementById('amount').value,
        status: document.getElementById('status').value.trim()
      };

      const missing = [];
      if (!payload.date) missing.push('Date');
      if (!payload.agent) missing.push('Data Entry Agent');
      if (!payload.source) missing.push('Source');
      if (!payload.marketer) missing.push("Marketer's Name");
      if (!payload.school) missing.push('School Name');
      if (!payload.sender) missing.push('Sender/Merchant');
      if (!payload.amount || Number(payload.amount) <= 0) missing.push('Amount');
      if (missing.length) {
        showBanner('Missing required field(s): ' + missing.join(', '), 'error');
        return;
      }

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      google.script.run
        .withSuccessHandler(function (res) {
          btn.disabled = false;
          btn.textContent = 'Submit Entry';
          if (res && res.ok) {
            submittedCount++;
            document.getElementById('sessionCount').textContent =
              submittedCount + ' record' + (submittedCount === 1 ? '' : 's') + ' submitted this session';
            showBanner('Saved to ' + payload.marketer + '\u2019s sheet.', 'success');
            resetPerEntryFields();
          } else {
            showBanner((res && res.error) || 'Something went wrong. Please try again.', 'error');
          }
        })
        .withFailureHandler(function (err) {
          btn.disabled = false;
          btn.textContent = 'Submit Entry';
          showBanner('Error: ' + (err && err.message ? err.message : err), 'error');
        })
        .submitLedgerEntry(payload);
    }

    function closeDialog() {
      google.script.host.close();
    }


    setupDropdown('agent', 'agentDropdown', function () { return AGENTS; });
    setupDropdown('source', 'sourceDropdown', function () { return SOURCES; });
    setupDropdown('status', 'statusDropdown', function () { return STATUSES; });
    setupDropdown('school', 'schoolDropdown', function () { return SCHOOLS; });
    setupDropdown('marketer', 'marketerDropdown', function () { return MARKETERS; }, {
      onSelect: function (v) {
        document.getElementById('school').value = '';
        loadSchoolsForMarketer(v);
      }
    });

     google.script.run
      .withSuccessHandler(function (data) {
        document.getElementById('date').value = data.todayISO || todayLocalISO();
        AGENTS = data.agents || [];
        SOURCES = data.sources || [];
        STATUSES = data.statuses || [];
        MARKETERS = data.marketers || [];
      })
      .withFailureHandler(function (err) {
        
        showBanner('Could not load dropdown data: ' + (err && err.message ? err.message : err), 'error');
      })
      .getDialogInitData();
  </script>
</body>
</html>