/**
 * Ondorpata / Molat Personal Book Library — Zero-Billing Google Sheets Bridge
 * Container-bound Apps Script Web App
 * @OnlyCurrentDoc
 */

const SHEETS = {
  BOOKS: 'Books',
  LOGS: 'Reading_Logs',
  WISHLIST: 'Wishlist'
};

const SCHEMAS = {
  Books: [
    'book_id', 'title', 'subtitle', 'authors', 'isbn_10', 'isbn_13',
    'publisher', 'publication_year', 'language', 'genre', 'cover_url',
    'reading_status', 'condition', 'location', 'purchase_price', 'rp',
    'purchase_date', 'rating', 'notes', 'created_at', 'updated_at'
  ],
  Reading_Logs: [
    'log_id', 'book_id', 'session_date', 'start_page', 'end_page',
    'pages_read', 'duration_minutes', 'session_note', 'created_at'
  ],
  Wishlist: [
    'wishlist_id', 'title', 'authors', 'isbn_13', 'genre',
    'expected_rp', 'target_price', 'priority', 'notes', 'created_at'
  ]
};

function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMAS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, SCHEMAS[sheetName].length).setValues([SCHEMAS[sheetName]]);
      sheet.setFrozenRows(1);
    }
  });
}

function verifyToken(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('BRIDGE_TOKEN');
  if (!expected) return true; // Dev mode if property not configured
  return expected && token === expected;
}

function doGet(e) {
  const token = e?.parameter?.token || e?.parameter?.['X-Bridge-Token'] || '';
  if (!verifyToken(token)) {
    return jsonResponse({ success: false, error: 'Unauthorized' });
  }
  ensureSheetsExist();
  const table = e?.parameter?.table || SHEETS.BOOKS;
  return jsonResponse({
    success: true,
    table: table,
    rows: readTableAsObjects(table)
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData?.contents || '{}');
    const token = body.token || e?.parameter?.token || '';
    if (!verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }
    ensureSheetsExist();
    const { action, table, keyField, keyValue, record, records } = body;

    if (action === 'append') {
      return jsonResponse({ success: true, record: appendRowObject(table, record) });
    }
    if (action === 'update') {
      return jsonResponse({ success: true, record: updateRowByKey(table, keyField, keyValue, record) });
    }
    if (action === 'batch_update_covers') {
      const count = batchUpdateCovers(records || []);
      return jsonResponse({ success: true, updated: count });
    }
    if (action === 'delete') {
      const deleted = deleteRowByKey(table, keyField, keyValue);
      return jsonResponse({ success: deleted });
    }
    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err.message || err) });
  }
}

function readTableAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const headers = SCHEMAS[sheetName];
  if (!headers || lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRowObject(sheetName, record) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const row = headers.map(h => formatCellForWrite(h, record[h]));
  sheet.appendRow(row);
  return record;
}

function updateRowByKey(sheetName, keyField, keyValue, patch) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const keyIndex = headers.indexOf(keyField);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || keyIndex === -1) throw new Error('Key or rows not found');

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][keyIndex]).trim() === String(keyValue).trim()) {
      const updatedObj = {};
      headers.forEach((h, colIdx) => {
        updatedObj[h] = patch.hasOwnProperty(h) ? patch[h] : data[i][colIdx];
      });
      const rowValues = headers.map(h => formatCellForWrite(h, updatedObj[h]));
      sheet.getRange(i + 2, 1, 1, headers.length).setValues([rowValues]);
      return updatedObj;
    }
  }
  throw new Error('Record not found: ' + keyValue);
}

function batchUpdateCovers(items) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.BOOKS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().map(r => r[0]);
  const map = {};
  items.forEach(item => { if (item.book_id && item.cover_url) map[item.book_id] = item.cover_url; });
  let count = 0;
  ids.forEach((id, idx) => {
    if (map[id]) {
      sheet.getRange(idx + 2, 11).setValue(map[id]);
      count++;
    }
  });
  SpreadsheetApp.flush();
  return count;
}

function deleteRowByKey(sheetName, keyField, keyValue) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const keyIndex = headers.indexOf(keyField);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || keyIndex === -1) return false;
  const keys = sheet.getRange(2, keyIndex + 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

function formatCellForWrite(header, val) {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (header === 'isbn_10' || header === 'isbn_13') {
    return str.startsWith("'") ? str : "'" + str;
  }
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return val;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
