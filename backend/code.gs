const LEDGER_SS = SpreadsheetApp.getActive();

const SETTING_SHEET = 'SETTING';
const REP_NAME_COL_IN_SETTING = 2; 
const LEDGER_META_VALUES = ['STATISTIC', 'ALL', 'G. GHANA', 'U. GHANA', 'C. GHANA', 'N. GHANA'];

const LEDGER_DATA_START_ROW = 4;
const LEDGER_MAX_ROW = 1800;

const COL_DATE = 2;           
const COL_SCHOOL = 3;         
const COL_SENDER = 4;         
const COL_AMOUNT = 5;         
const COL_STATUS = 6;         
const COL_SCHOOL_HELPER = 28; 

const WRONG_ENTRY_STATUS = 'Wrong Entry';
const HIGHLIGHT_COLOR = '#F4CCCC';


const NEW_TEMPLATE_SS_ID = '17otwSt-AccsatYAv8aeZA9a91672Vq4NL_PbNzaG7mY';

const HEADER_FILL = '#20124D';
const HEADER_FONT_COLOR = '#FFFFFF';
const HEADER_FONT = 'Twentieth Century';
const WHIST_SHEET = 'WRONG ENTRY - HISTORY';
const WHIST_LOG_COL = 13;      
const WHIST_LOG_WIDTH = 10;
const WHIST_DISPLAY_WIDTH = 10;
const WHIST_LOG_START_ROW = 5;
const WHIST_MAX_ROW = 5000;
const PHIST_SHEET = 'ALL PAYMENTS - HISTORY';
const PHIST_LOG_COL = 12;      
const PHIST_LOG_WIDTH = 10;
const PHIST_DISPLAY_WIDTH = 9;
const PHIST_LOG_START_ROW = 5;
const PHIST_MAX_ROW = 5000;


// SETUP


function runLedgerSetup() {
  const reps = getAllRepNames_Ledger();
  reps.forEach(function (repName) {
    const sheet = LEDGER_SS.getSheetByName(repName);
    if (!sheet) return; 

    setupSchoolLiveSync(sheet, repName);
    setupWrongEntryHighlight(sheet);
    refreshDailySummary(sheet);
  });

  buildWrongEntryHistorySheet();
  buildPaymentHistorySheet();

  LEDGER_SS.toast('Ledger setup complete for ' + reps.length + ' rep sheet(s).');
}


function getAllRepNames_Ledger() {
  const settingSheet = LEDGER_SS.getSheetByName(SETTING_SHEET);
  const lastRow = settingSheet.getLastRow();
  const values = settingSheet.getRange(1, REP_NAME_COL_IN_SETTING, lastRow, 1).getValues();
  const reps = [];
  values.forEach(function (r) {
    const v = String(r[0]).trim();
    if (v && LEDGER_META_VALUES.indexOf(v) === -1) reps.push(v);
  });
  return reps;
}



function setupSchoolLiveSync(sheet, repName) {

  const formula = '=IFERROR(LET(data, IMPORTRANGE("' + NEW_TEMPLATE_SS_ID + '","\'' + repName +
    '\'!C5:D1000"), ids, INDEX(data,0,1), names, INDEX(data,0,2), ' +
    'FILTER(names & " (" & ids & ")", names<>"")), "")';

  sheet.getRange(LEDGER_DATA_START_ROW, COL_SCHOOL_HELPER).setFormula(formula);
  sheet.hideColumns(COL_SCHOOL_HELPER);

  const schoolListRange = sheet.getRange(
    LEDGER_DATA_START_ROW, COL_SCHOOL_HELPER, LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1, 1
  );
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(schoolListRange, true)
    .setAllowInvalid(true)
    .build();

  sheet.getRange(LEDGER_DATA_START_ROW, COL_SCHOOL, LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1, 1)
    .setDataValidation(rule);
}

function setupWrongEntryHighlight(sheet) {
  const range = sheet.getRange(
    LEDGER_DATA_START_ROW, COL_DATE, LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1, COL_STATUS - COL_DATE + 1
  ); // B:F

  const rules = sheet.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (rg) { return rg.getA1Notation() !== range.getA1Notation(); });
  });

  const newRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$F' + LEDGER_DATA_START_ROW + '="' + WRONG_ENTRY_STATUS + '"')
    .setBackground(HIGHLIGHT_COLOR)
    .setRanges([range])
    .build();

  rules.push(newRule);
  sheet.setConditionalFormatRules(rules);
}


const COL_SUMMARY_DATE = 10; 
const COL_SUMMARY_TOTAL = 10; 

function refreshDailySummary(sheet) {
  const numRows = LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1;
  const data = sheet.getRange(LEDGER_DATA_START_ROW, COL_DATE, numRows, COL_STATUS - COL_DATE + 1).getValues();
  

  const totals = {}; 
  data.forEach(function (r) {
    const date = r[0];
    const amount = Number(r[3]) || 0;
    const status = r[4];
    if (!(date instanceof Date)) return;
    if (status === WRONG_ENTRY_STATUS) return; 

    const key = Utilities.formatDate(date, 'Africa/Accra', 'yyyy-MM-dd');
    if (!totals[key]) totals[key] = { date: date, sum: 0 };
    totals[key].sum += amount;
  });

  const rows = Object.keys(totals).sort().map(function (k) {
    return [totals[k].date, totals[k].sum];
  });

  sheet.getRange(LEDGER_DATA_START_ROW, 10, numRows, 2).clearContent(); // J:K
  if (rows.length > 0) {
    sheet.getRange(LEDGER_DATA_START_ROW, 10, rows.length, 2).setValues(rows);
    sheet.getRange(LEDGER_DATA_START_ROW, 10, rows.length, 1).setNumberFormat('M/d/yyyy');
  }
}



function styleHeaderRange_(range) {
  range.setBackground(HEADER_FILL)
    .setFontColor(HEADER_FONT_COLOR)
    .setFontFamily(HEADER_FONT)
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);
}

function buildWrongEntryHistorySheet() {
  const ss = LEDGER_SS;
  let sheet = ss.getSheetByName(WHIST_SHEET);
  if (!sheet) sheet = ss.insertSheet(WHIST_SHEET);

  sheet.getRange('B2').setValue('Marketer');
  sheet.getRange('D2').setValue('Date');
  sheet.getRange('E2').setNumberFormat('M/d/yyyy'); 

  const reps = getAllRepNames_Ledger();
  const marketerCell = sheet.getRange('C2');
  marketerCell.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ALL'].concat(reps), true)
      .setAllowInvalid(false)
      .build()
  );
  if (!marketerCell.getValue()) marketerCell.setValue('ALL');

  
  const headers = ['Marketer', 'Date', 'Name of School', 'Sender/ Merchant', 'Amount', 'Source', 'Data Entry Agent', 'Event', 'Event At', 'Current Status'];
  const headerRange = sheet.getRange(4, 2, 1, headers.length);
  headerRange.setValues([headers]);
  styleHeaderRange_(headerRange);

  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 140);
  sheet.setColumnWidth(10, 160);
  sheet.setColumnWidth(11, 130);

  sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL + 1, WHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy');          // log date
  sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL + 8, WHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy H:mm:ss'); // eventAt

  sheet.getRange(WHIST_LOG_START_ROW, 3, WHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy');          // visible Date column
  sheet.getRange(WHIST_LOG_START_ROW, 10, WHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy H:mm:ss'); // visible Event At column

  sheet.showColumns(WHIST_LOG_COL, WHIST_LOG_WIDTH);
  sheet.hideColumns(WHIST_LOG_COL, WHIST_LOG_WIDTH);

  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  sheet.getRange(4, 2, WHIST_MAX_ROW - 3, WHIST_DISPLAY_WIDTH).createFilter();

  sheet.setFrozenRows(4);
}

function buildPaymentHistorySheet() {
  const ss = LEDGER_SS;
  let sheet = ss.getSheetByName(PHIST_SHEET);
  if (!sheet) sheet = ss.insertSheet(PHIST_SHEET);

  sheet.getRange('B2').setValue('Marketer');
  sheet.getRange('D2').setValue('Date');
  sheet.getRange('E2').setNumberFormat('M/d/yyyy');

  const reps = getAllRepNames_Ledger();
  const marketerCell = sheet.getRange('C2');
  marketerCell.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ALL'].concat(reps), true)
      .setAllowInvalid(false)
      .build()
  );
  if (!marketerCell.getValue()) marketerCell.setValue('ALL');

  const headers = ['Marketer', 'Date', 'Name of School', 'Sender/ Merchant', 'Amount', 'Status', 'Source', 'Agent', 'Logged At'];
  const headerRange = sheet.getRange(4, 2, 1, headers.length); // B4:J4
  headerRange.setValues([headers]);
  styleHeaderRange_(headerRange);

  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 140);  
  sheet.setColumnWidth(9, 130);  
  sheet.setColumnWidth(10, 160); 

  sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL + 1, PHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy');          // log date
  sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL + 8, PHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy H:mm:ss'); // loggedAt

  sheet.getRange(PHIST_LOG_START_ROW, 3, PHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy');          // visible Date column
  sheet.getRange(PHIST_LOG_START_ROW, 10, PHIST_MAX_ROW, 1).setNumberFormat('M/d/yyyy H:mm:ss'); // visible Logged At column

  sheet.showColumns(PHIST_LOG_COL, PHIST_LOG_WIDTH);
  sheet.hideColumns(PHIST_LOG_COL, PHIST_LOG_WIDTH);

  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  sheet.getRange(4, 2, PHIST_MAX_ROW - 3, PHIST_DISPLAY_WIDTH).createFilter();

  sheet.setFrozenRows(4);
}


// onEdit TRIGGER


function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (sheetName === WHIST_SHEET) {
    const cell = e.range.getA1Notation();
    const editedRow = e.range.getRow();
    
    if (cell === 'C2' || cell === 'E2' || editedRow >= WHIST_LOG_START_ROW) {
      refreshWrongEntryHistoryDisplay(sheet);
    }
    return;
  }

  if (sheetName === PHIST_SHEET) {
    const cell = e.range.getA1Notation();
    const editedRow = e.range.getRow();
    if (cell === 'C2' || cell === 'E2' || editedRow >= PHIST_LOG_START_ROW) {
      refreshPaymentHistDisplay(sheet);
    }
    return;
  }

  const reps = getAllRepNames_Ledger();
  if (reps.indexOf(sheetName) === -1) return; 

  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  const startCol = e.range.getColumn();
  const endCol = startCol + e.range.getNumColumns() - 1;

   // Ignore edits fully outside the data rows, or fully outside columns B:H (Date..Agent)
  if (startRow + numRows - 1 < LEDGER_DATA_START_ROW) return;
  if (endCol < COL_DATE || startCol > COL_AGENT) return;

  const firstRow = Math.max(startRow, LEDGER_DATA_START_ROW);
  const lastRow = startRow + numRows - 1;
  const statusWasEdited = startCol <= COL_STATUS && endCol >= COL_STATUS;

  for (let row = firstRow; row <= lastRow; row++) {
    try {
      processLedgerRowChange(sheet, sheetName, row, statusWasEdited);
    } catch (err) {
      
    }
  }

  refreshDailySummary(sheet);
}




function processLedgerRowChange(sheet, marketerName, row, statusWasEdited) {
  const rowData = sheet.getRange(row, COL_DATE, 1, COL_AGENT - COL_DATE + 1).getValues()[0];
  const date = rowData[0];
  const school = rowData[1];
  const sender = rowData[2];
  const amount = rowData[3];
  const status = rowData[4];
  const source = rowData[5];
  const agent = rowData[6];

  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);

    if (date && school && amount) {
      upsertPaymentHistLog(marketerName, row, date, school, sender, amount, status, source, agent);
    }

    if (statusWasEdited) {
      const lastEventType = getLastWrongEntryEventType(marketerName, row);
      if (status === WRONG_ENTRY_STATUS) {
        if (lastEventType !== 'Marked Wrong Entry') {
          appendWrongEntryLog(marketerName, date, school, sender, amount, source, agent, 'Marked Wrong Entry', row);
        }
      } else if (lastEventType === 'Marked Wrong Entry') {
        appendWrongEntryLog(marketerName, date, school, sender, amount, source, agent, 'Reversed', row);
      }
    }
  } catch (err) {
    logSyncError_(marketerName, row, err);
    throw err;
  } finally {
    lock.releaseLock();
  }
}


function logSyncError_(marketer, row, err) {
  try {
    let sheet = LEDGER_SS.getSheetByName('SYNC ERRORS');
    if (!sheet) {
      sheet = LEDGER_SS.insertSheet('SYNC ERRORS');
      sheet.appendRow(['When', 'Marketer', 'Row', 'Error']);
    }
    sheet.appendRow([new Date(), marketer, row, String((err && err.message) || err)]);
  } catch (e2) {
    // Never let logging itself break the flow.
  }
}


function getLastWrongEntryEventType(marketer, row) {
  const sheet = LEDGER_SS.getSheetByName(WHIST_SHEET);
  if (!sheet) return null;
  const lastLogRow = getNextWrongEntryLogRow() - 1;
  if (lastLogRow < WHIST_LOG_START_ROW) return null;

  const numRows = lastLogRow - WHIST_LOG_START_ROW + 1;
  const log = sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, numRows, WHIST_LOG_WIDTH).getValues();

  let lastType = null;
  for (let i = 0; i < log.length; i++) {
    if (log[i][0] === marketer && Number(log[i][9]) === row) lastType = log[i][7];
  }
  return lastType;
}




function getNextWrongEntryLogRow() {
  const sheet = LEDGER_SS.getSheetByName(WHIST_SHEET);
  const cache = PropertiesService.getDocumentProperties();
  const cached = Number(cache.getProperty('wrongEntryNextLogRow'));
  if (cached) return cached;

  const ids = sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, WHIST_MAX_ROW - WHIST_LOG_START_ROW + 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === '' || ids[i][0] === null) {
      const row = WHIST_LOG_START_ROW + i;
      cache.setProperty('wrongEntryNextLogRow', String(row));
      return row;
    }
  }
  return WHIST_MAX_ROW;
}


function getNextPaymentHistLogRow() {
  const sheet = LEDGER_SS.getSheetByName(PHIST_SHEET);
  const cache = PropertiesService.getDocumentProperties();
  const cached = Number(cache.getProperty('ledgerPaymentHistNextLogRow'));
  if (cached) return cached;

  const ids = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, PHIST_MAX_ROW - PHIST_LOG_START_ROW + 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === '' || ids[i][0] === null) {
      const row = PHIST_LOG_START_ROW + i;
      cache.setProperty('ledgerPaymentHistNextLogRow', String(row));
      return row;
    }
  }
  return PHIST_MAX_ROW;
}


function appendWrongEntryLog(marketer, date, school, sender, amount, source, agent, eventType, rowRef) {
  const sheet = LEDGER_SS.getSheetByName(WHIST_SHEET);
  if (!sheet) return;
  const nextRow = getNextWrongEntryLogRow();
  const eventAt = new Date();

  sheet.getRange(nextRow, WHIST_LOG_COL, 1, WHIST_LOG_WIDTH).setValues(
    [[marketer, date, school, sender, amount, source, agent, eventType, eventAt, rowRef]]
  );
  PropertiesService.getDocumentProperties().setProperty('wrongEntryNextLogRow', String(nextRow + 1));
  refreshWrongEntryHistoryDisplay(sheet);
}

function upsertPaymentHistLog(marketer, row, date, school, sender, amount, status, source, agent) {
  const sheet = LEDGER_SS.getSheetByName(PHIST_SHEET);
  if (!sheet) return;

  const lastLogRow = getNextPaymentHistLogRow() - 1;
  let targetRow = -1;

  if (lastLogRow >= PHIST_LOG_START_ROW) {
    const numRows = lastLogRow - PHIST_LOG_START_ROW + 1;
    const marketers = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, numRows, 1).getValues();
    const rowRefs = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL + 9, numRows, 1).getValues();
    for (let i = 0; i < marketers.length; i++) {
      if (marketers[i][0] === marketer && Number(rowRefs[i][0]) === row) {
        targetRow = PHIST_LOG_START_ROW + i;
        break;
      }
    }
  }

  if (targetRow === -1) {
    // Brand new log row: stamp "Logged At" with now.
    const loggedAt = new Date();
    const values = [[marketer, date, school, sender, amount, status || '', source || '', agent || '', loggedAt, row]];
    const nextRow = getNextPaymentHistLogRow();
    sheet.getRange(nextRow, PHIST_LOG_COL, 1, PHIST_LOG_WIDTH).setValues(values);
    PropertiesService.getDocumentProperties().setProperty('ledgerPaymentHistNextLogRow', String(nextRow + 1));
  } else {
   
    const existingLoggedAt = sheet.getRange(targetRow, PHIST_LOG_COL + 8, 1, 1).getValue();
    const values = [[marketer, date, school, sender, amount, status || '', source || '', agent || '', existingLoggedAt, row]];
    sheet.getRange(targetRow, PHIST_LOG_COL, 1, PHIST_LOG_WIDTH).setValues(values);
  }

  refreshPaymentHistDisplay(sheet);
}

function refreshWrongEntryHistoryDisplay(sheet) {
  const marketerFilter = sheet.getRange('C2').getValue();
  const dateFilter = sheet.getRange('E2').getValue();

  sheet.getRange(WHIST_LOG_START_ROW, 2, WHIST_MAX_ROW - WHIST_LOG_START_ROW + 1, WHIST_DISPLAY_WIDTH).clearContent();

  const lastLogRow = getNextWrongEntryLogRow() - 1;
  if (lastLogRow < WHIST_LOG_START_ROW) return;

  const numRows = lastLogRow - WHIST_LOG_START_ROW + 1;
  const log = sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, numRows, WHIST_LOG_WIDTH).getValues();
  const dateFilterStr = dateFilter ? Utilities.formatDate(new Date(dateFilter), 'Africa/Accra', 'yyyy-MM-dd') : '';

  const matches = log.filter(function (r) {
    const marketerOk = !marketerFilter || marketerFilter === 'ALL' || r[0] === marketerFilter;
    let dateOk = true;
    if (dateFilterStr) {
      dateOk = (r[1] instanceof Date) && Utilities.formatDate(r[1], 'Africa/Accra', 'yyyy-MM-dd') === dateFilterStr;
    }
    return marketerOk && dateOk;
  });

  if (matches.length === 0) return;

  const repSheetCache = {};
  const rowsWithStatus = matches.map(function (r) {
    const marketer = r[0];
    const rowRef = r[9];
    let currentStatus = 'Unknown';

    if (marketer && rowRef) {
      if (!(marketer in repSheetCache)) {
        repSheetCache[marketer] = LEDGER_SS.getSheetByName(marketer);
      }
      const repSheet = repSheetCache[marketer];
      if (repSheet) {
        const liveStatus = repSheet.getRange(rowRef, COL_STATUS).getValue();
        currentStatus = liveStatus === WRONG_ENTRY_STATUS ? 'Still Voided' : 'Reversed';
      }
    }

    return [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], currentStatus];
  });

  sheet.getRange(WHIST_LOG_START_ROW, 2, rowsWithStatus.length, WHIST_DISPLAY_WIDTH).setValues(rowsWithStatus);
}

function refreshPaymentHistDisplay(sheet) {
  const marketerFilter = sheet.getRange('C2').getValue();
  const dateFilter = sheet.getRange('E2').getValue();

  sheet.getRange(PHIST_LOG_START_ROW, 2, PHIST_MAX_ROW - PHIST_LOG_START_ROW + 1, PHIST_DISPLAY_WIDTH).clearContent();

  const lastLogRow = getNextPaymentHistLogRow() - 1;
  if (lastLogRow < PHIST_LOG_START_ROW) return;

  const numRows = lastLogRow - PHIST_LOG_START_ROW + 1;
  const log = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, numRows, PHIST_LOG_WIDTH).getValues();
  const dateFilterStr = dateFilter ? Utilities.formatDate(new Date(dateFilter), 'Africa/Accra', 'yyyy-MM-dd') : '';

  const matches = log.filter(function (r) {
    const marketerOk = !marketerFilter || marketerFilter === 'ALL' || r[0] === marketerFilter;
    let dateOk = true;
    if (dateFilterStr) {
      dateOk = (r[1] instanceof Date) && Utilities.formatDate(r[1], 'Africa/Accra', 'yyyy-MM-dd') === dateFilterStr;
    }
    return marketerOk && dateOk;
  }).map(function (r) { return r.slice(0, PHIST_DISPLAY_WIDTH); });

  if (matches.length > 0) {
    sheet.getRange(PHIST_LOG_START_ROW, 2, matches.length, PHIST_DISPLAY_WIDTH).setValues(matches);
  }
}



function backfillPaymentHistory() {
  const reps = getAllRepNames_Ledger();
  reps.forEach(function (repName) {
    const sheet = LEDGER_SS.getSheetByName(repName);
    if (!sheet) return;

    const numRows = LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1;
    const data = sheet.getRange(LEDGER_DATA_START_ROW, COL_DATE, numRows, COL_AGENT - COL_DATE + 1).getValues();

    data.forEach(function (r, i) {
      const row = LEDGER_DATA_START_ROW + i;
      const date = r[0], school = r[1], sender = r[2], amount = r[3], status = r[4], source = r[5], agent = r[6];

      if (date && school && amount) {
        upsertPaymentHistLog(repName, row, date, school, sender, amount, status, source, agent);
      }
       if (status === WRONG_ENTRY_STATUS && getLastWrongEntryEventType(repName, row) !== 'Marked Wrong Entry') {
        appendWrongEntryLog(repName, date, school, sender, amount, source, agent, 'Marked Wrong Entry', row);
      }
    });
  });

  LEDGER_SS.toast('Payment history backfilled for all reps.');
}




//REP NAVIGATOR/

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RECORD PAYMENT')
    .addItem('New Ledger Entry...', 'openDataEntryDialog')
    // .addItem('Go to Rep Sheet...', 'showRepNavigator')
    .addToUi();
}


function showRepNavigator() {
  const reps = getAllRepNames_Ledger();
  const html = buildRepNavigatorHtml(reps);
  const output = HtmlService.createHtmlOutput(html).setWidth(460).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(output, 'Jump to Rep Sheet');
}


function setActiveRepSheet(repName) {
  const sheet = LEDGER_SS.getSheetByName(repName);
  if (sheet) LEDGER_SS.setActiveSheet(sheet);
  return true;
}


function buildRepNavigatorHtml(reps) {
  const buttons = reps.map(function (name) {
    const safe = name.replace(/'/g, "\\'");
    return '<button class="rep-btn" onclick="goTo(\'' + safe + '\')">' + name + '</button>';
  }).join('');

  return '<!DOCTYPE html><html><head><base target="_top">' +
    '<style>' +
    'body{font-family:Arial,sans-serif;margin:0;padding:14px;background:#fff;}' +
    '#search{width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:10px;' +
    'border:1px solid #ccc;border-radius:6px;font-size:13px;}' +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:380px;overflow-y:auto;}' +
    '.rep-btn{padding:10px 6px;background:#20124D;color:#fff;border:none;border-radius:6px;' +
    'cursor:pointer;font-size:12px;font-weight:bold;font-family:inherit;}' +
    '.rep-btn:hover{background:#3a2470;}' +
    '</style></head><body>' +
    '<input type="text" id="search" placeholder="Type a rep name..." oninput="filterReps()" autofocus>' +
    '<div class="grid" id="grid">' + buttons + '</div>' +
    '<script>' +
    'function filterReps(){' +
    '  const q = document.getElementById("search").value.toLowerCase();' +
    '  document.querySelectorAll(".rep-btn").forEach(function(btn){' +
    '    btn.style.display = btn.textContent.toLowerCase().indexOf(q) !== -1 ? "" : "none";' +
    '  });' +
    '}' +
    'function goTo(name){' +
    '  google.script.run.withSuccessHandler(function(){ google.script.host.close(); }).setActiveRepSheet(name);' +
    '}' +
    '</script>' +
    '</body></html>';
}


// DATA ENTRY DIALOG


const SETTING_STATUS_COL   = 3; 
                                 
const SETTING_STATUS_MAX_ROW = 8;
const SETTING_AGENT_COL    = 4; 
const SETTING_SOURCE_COL   = 5; 

const COL_SOURCE = 7; 
const COL_AGENT  = 8; 



function openDataEntryDialog() {
  const html = HtmlService.createHtmlOutputFromFile('DataEntryDialog')
    .setWidth(480)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'New Ledger Entry');
}



function getDialogInitData() {
  const settingSheet = LEDGER_SS.getSheetByName(SETTING_SHEET);

  const agents  = readSettingColumn_(settingSheet, SETTING_AGENT_COL);
  const sources = readSettingColumn_(settingSheet, SETTING_SOURCE_COL);

  const statuses = settingSheet
    .getRange(1, SETTING_STATUS_COL, SETTING_STATUS_MAX_ROW, 1)
    .getValues()
    .map(function (r) { return r[0]; })
    .filter(function (v) { return v !== '' && v !== null; })
    .map(function (v) {
      return v instanceof Date ? Utilities.formatDate(v, 'Africa/Accra', 'yyyy-MM-dd') : String(v);
    });

  const marketers = getAllRepNames_Ledger(); 

  return {
    agents: agents,
    sources: sources,
    statuses: statuses,
    marketers: marketers,
    todayISO: Utilities.formatDate(new Date(), 'Africa/Accra', 'yyyy-MM-dd')
  };
}



function readSettingColumn_(settingSheet, col) {
  const lastRow = settingSheet.getLastRow();
  const values = settingSheet.getRange(1, col, lastRow, 1).getValues();
  const seen = {};
  const out = [];
  values.forEach(function (r) {
    const v = String(r[0]).trim();
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  return out;
}


function getSchoolsForRep(repName) {
  const sheet = LEDGER_SS.getSheetByName(repName);
  if (!sheet) return [];

  const numRows = LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1;
  const values = sheet.getRange(LEDGER_DATA_START_ROW, COL_SCHOOL_HELPER, numRows, 1).getValues();

  const seen = {};
  const out = [];
  values.forEach(function (r) {
    const v = String(r[0]).trim();
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  out.sort();
  return out;
}


function parseIncomingDate_(dateStr) {
  dateStr = String(dateStr).trim();
  let y, m, d;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
    // yyyy-mm-dd
    const p = dateStr.split('-');
    y = Number(p[0]); m = Number(p[1]); d = Number(p[2]);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    // mm/dd/yyyy
    const p = dateStr.split('/');
    m = Number(p[0]); d = Number(p[1]); y = Number(p[2]);
  } else {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    y = parsed.getFullYear(); m = parsed.getMonth() + 1; d = parsed.getDate();
  }

  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}


function submitLedgerEntry(payload) {
  const marketer = String(payload.marketer || '').trim();
  const dateStr  = String(payload.date || '').trim();
  const school   = String(payload.school || '').trim();
  const sender   = String(payload.sender || '').trim();
  const amount   = Number(payload.amount);
  const status   = String(payload.status || '').trim();
  const source   = String(payload.source || '').trim();
  const agent    = String(payload.agent || '').trim();

  const missing = [];
  if (!dateStr) missing.push('Date');
  if (!agent) missing.push('Data Entry Agent');
  if (!source) missing.push('Source');
  if (!marketer) missing.push("Marketer's Name");
  if (!school) missing.push('School Name');
  if (!sender) missing.push('Sender/Merchant');
  if (!payload.amount || isNaN(amount) || amount <= 0) missing.push('Amount');
  if (missing.length) {
    return { ok: false, error: 'Missing required field(s): ' + missing.join(', ') };
  }

  const reps = getAllRepNames_Ledger();
  if (reps.indexOf(marketer) === -1) {
    return { ok: false, error: 'Unknown marketer: ' + marketer };
  }

  const sheet = LEDGER_SS.getSheetByName(marketer);
  if (!sheet) {
    return { ok: false, error: 'No sheet found for marketer: ' + marketer };
  }

  const entryDate = parseIncomingDate_(dateStr);
  if (!entryDate) {
    return { ok: false, error: 'Could not understand the date: ' + dateStr };
  }

  const row = getNextLedgerRow_(sheet);
  sheet.getRange(row, COL_DATE, 1, 7)
    .setValues([[entryDate, school, sender, amount, status, source, agent]]);


  let warning = null;
  try {
    processLedgerRowChange(sheet, marketer, row, true);
  } catch (err) {
    warning = 'Entry saved, but history sync failed: ' + ((err && err.message) || err) +
      '. Check the "SYNC ERRORS" sheet and this user\'s edit access on the history sheets.';
  }

  refreshDailySummary(sheet);

  return warning ? { ok: true, row: row, warning: warning } : { ok: true, row: row };
}



function getNextLedgerRow_(sheet) {
  const numRows = LEDGER_MAX_ROW - LEDGER_DATA_START_ROW + 1;
  const dates = sheet.getRange(LEDGER_DATA_START_ROW, COL_DATE, numRows, 1).getValues();
  for (let i = 0; i < dates.length; i++) {
    if (!dates[i][0]) return LEDGER_DATA_START_ROW + i;
  }
  return LEDGER_MAX_ROW; 
}


// ONE-TIME MIGRATION / REPAIR UTILITIES


function migrateWrongEntryHistoryColumns() {
  const sheet = LEDGER_SS.getSheetByName(WHIST_SHEET);
  if (!sheet) return;

  const OLD_LOG_WIDTH = 8; 
  const lastLogRow = getNextWrongEntryLogRow() - 1;

  if (lastLogRow >= WHIST_LOG_START_ROW) {
    const numRows = lastLogRow - WHIST_LOG_START_ROW + 1;
    const oldLog = sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, numRows, OLD_LOG_WIDTH).getValues();

    const repSheetCache = {};
    const newLog = oldLog.map(function (r) {
      const marketer = r[0], date = r[1], school = r[2], sender = r[3], amount = r[4];
      const eventType = r[5], eventAt = r[6], rowRef = r[7];

      let source = '', agent = '';
      if (marketer && rowRef) {
        if (!(marketer in repSheetCache)) repSheetCache[marketer] = LEDGER_SS.getSheetByName(marketer);
        const repSheet = repSheetCache[marketer];
        if (repSheet) {
          const vals = repSheet.getRange(rowRef, COL_SOURCE, 1, 2).getValues()[0];
          source = vals[0] || '';
          agent = vals[1] || '';
        }
      }
      return [marketer, date, school, sender, amount, source, agent, eventType, eventAt, rowRef];
    });

    sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, newLog.length, WHIST_LOG_WIDTH).setValues(newLog);
  }

  buildWrongEntryHistorySheet();
  refreshWrongEntryHistoryDisplay(sheet);

  LEDGER_SS.toast('Wrong Entry History migrated with Source & Agent columns.');
}


function migratePaymentHistoryColumns() {
  const sheet = LEDGER_SS.getSheetByName(PHIST_SHEET);
  if (!sheet) return;

  const lastLogRow = getNextPaymentHistLogRow() - 1;
  if (lastLogRow < PHIST_LOG_START_ROW) { LEDGER_SS.toast('No payment log rows to migrate.'); return; }

  const numRows = lastLogRow - PHIST_LOG_START_ROW + 1;
  const log = sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, numRows, 10).getValues();

  const repSheetCache = {};
  let fixed = 0;

  const fixedLog = log.map(function (r) {
    const marketer = r[0];
    const sourceSlot = r[6];

    if (!(sourceSlot instanceof Date)) return r;

    const date = r[1], school = r[2], sender = r[3], amount = r[4], status = r[5];
    const loggedAt = r[6];
    const rowRef = r[7];

    let source = '', agent = '';
    if (marketer && rowRef) {
      if (!(marketer in repSheetCache)) repSheetCache[marketer] = LEDGER_SS.getSheetByName(marketer);
      const repSheet = repSheetCache[marketer];
      if (repSheet) {
        const vals = repSheet.getRange(rowRef, COL_SOURCE, 1, 2).getValues()[0];
        source = vals[0] || '';
        agent = vals[1] || '';
      }
    }
    fixed++;
    return [marketer, date, school, sender, amount, status, source, agent, loggedAt, rowRef];
  });

  sheet.getRange(PHIST_LOG_START_ROW, PHIST_LOG_COL, fixedLog.length, 10).setValues(fixedLog);

  buildPaymentHistorySheet();
  refreshPaymentHistDisplay(sheet);

  LEDGER_SS.toast('Payment History migrated: fixed ' + fixed + ' old-format row(s).');
}

function repairWrongEntryHistory_OneTime() {
  const sheet = LEDGER_SS.getSheetByName(WHIST_SHEET);
  if (!sheet) { LEDGER_SS.toast('No Wrong Entry History sheet found.'); return; }

  const OLD_COL = 11;
  const OLD_WIDTH = 10;
  const maxScan = WHIST_MAX_ROW - WHIST_LOG_START_ROW + 1;

  const oldDates = sheet.getRange(WHIST_LOG_START_ROW, OLD_COL + 1, maxScan, 1).getValues();
  let lastOldRow = WHIST_LOG_START_ROW - 1;
  for (let i = 0; i < oldDates.length; i++) if (oldDates[i][0]) lastOldRow = WHIST_LOG_START_ROW + i;
  if (lastOldRow < WHIST_LOG_START_ROW) { LEDGER_SS.toast('No old log rows found to repair.'); return; }

  const numRows = lastOldRow - WHIST_LOG_START_ROW + 1;
  const oldLog = sheet.getRange(WHIST_LOG_START_ROW, OLD_COL, numRows, OLD_WIDTH).getValues();
  const reps = getAllRepNames_Ledger();
  let fixed = 0, unresolved = 0;

  const rebuilt = oldLog.map(function (r) {
    const date = r[1], school = r[2], sender = r[3], amount = r[4],
          source = r[5], agent = r[6], eventType = r[7], eventAt = r[8], rowRef = r[9];

    let marketer = (r[0] && reps.indexOf(r[0]) !== -1) ? r[0] : '';

    if (!marketer && rowRef) {
      for (let i = 0; i < reps.length; i++) {
        const repSheet = LEDGER_SS.getSheetByName(reps[i]);
        if (!repSheet) continue;
        const rowVals = repSheet.getRange(Number(rowRef), COL_SCHOOL, 1, 3).getValues()[0];
        if (rowVals[0] === school && Number(rowVals[2]) === Number(amount)) { marketer = reps[i]; break; }
      }
    }
    marketer ? fixed++ : unresolved++;
    return [marketer, date, school, sender, amount, source, agent, eventType, eventAt, rowRef];
  });

  sheet.getRange(WHIST_LOG_START_ROW, WHIST_LOG_COL, rebuilt.length, WHIST_LOG_WIDTH).setValues(rebuilt);
  sheet.getRange(WHIST_LOG_START_ROW, OLD_COL + 1, maxScan, OLD_WIDTH - 1).clearContent();

  PropertiesService.getDocumentProperties().deleteProperty('wrongEntryNextLogRow');
  buildWrongEntryHistorySheet();
  refreshWrongEntryHistoryDisplay(sheet);

  LEDGER_SS.toast('Repair done: ' + fixed + ' row(s) fixed, ' + unresolved + ' unresolved.');
}


function rebuildHistorySheets() {
  const ss = LEDGER_SS;

  
  const oldWhist = ss.getSheetByName(WHIST_SHEET);
  if (oldWhist) ss.deleteSheet(oldWhist);

  const oldPhist = ss.getSheetByName(PHIST_SHEET);
  if (oldPhist) ss.deleteSheet(oldPhist);

  const props = PropertiesService.getDocumentProperties();
  props.deleteProperty('wrongEntryNextLogRow');
  props.deleteProperty('ledgerPaymentHistNextLogRow');

  
  buildWrongEntryHistorySheet();
  buildPaymentHistorySheet();

  ss.toast('History sheets rebuilt. Now run backfillPaymentHistory to repopulate from rep sheets.');
}



function fixSpreadsheetTimezone() {
  LEDGER_SS.setSpreadsheetTimeZone('Africa/Accra');
  LEDGER_SS.toast('Spreadsheet timezone set to Africa/Accra.');
}