/**
 * Ondorpata / Molat Personal Book Library — Zero-Billing Google Sheets Bridge
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

function getSpreadsheet() {
  const propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (propId && propId.trim()) {
    return SpreadsheetApp.openById(propId.trim());
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No active spreadsheet found. If this is a standalone Apps Script project, add SPREADSHEET_ID under Project Settings > Script Properties. Otherwise, open this script from Extensions > Apps Script inside your Google Sheet.');
  }
  return active;
}

function findSheet(sheetName) {
  const ss = getSpreadsheet();
  // 1. Direct case match
  let sheet = ss.getSheetByName(sheetName);
  if (sheet && sheet.getLastRow() > 1) return sheet;

  // 2. Case-insensitive match
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === sheetName.toLowerCase()) {
      return sheets[i];
    }
  }

  // 3. Fallback for Books: if Sheet1 has data, or the first sheet with data
  if (sheetName === SHEETS.BOOKS) {
    const sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
    if (sheet1 && sheet1.getLastRow() > 1) return sheet1;

    for (let i = 0; i < sheets.length; i++) {
      const name = sheets[i].getName().toLowerCase();
      if (name !== 'reading_logs' && name !== 'wishlist' && sheets[i].getLastRow() > 1) {
        return sheets[i];
      }
    }
  }

  return sheet || ss.getSheetByName(sheetName);
}

function ensureSheetsExist() {
  const ss = getSpreadsheet();
  Object.keys(SCHEMAS).forEach(sheetName => {
    let sheet = findSheet(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, SCHEMAS[sheetName].length).setValues([SCHEMAS[sheetName]]);
      sheet.setFrozenRows(1);
    }
  });
}

function verifyToken(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('BRIDGE_TOKEN');
  return expected && token === expected;
}

function normalizeHeader(h) {
  const raw = String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const aliasMap = {
    'id': 'book_id',
    'bookid': 'book_id',
    'book_id': 'book_id',
    'title': 'title',
    'book_title': 'title',
    'author': 'authors',
    'authors': 'authors',
    'writer': 'authors',
    'subtitle': 'subtitle',
    'isbn': 'isbn_13',
    'isbn_13': 'isbn_13',
    'isbn13': 'isbn_13',
    'isbn_10': 'isbn_10',
    'isbn10': 'isbn_10',
    'publisher': 'publisher',
    'year': 'publication_year',
    'publication_year': 'publication_year',
    'language': 'language',
    'genre': 'genre',
    'cover': 'cover_url',
    'cover_url': 'cover_url',
    'image': 'cover_url',
    'status': 'reading_status',
    'reading_status': 'reading_status',
    'condition': 'condition',
    'location': 'location',
    'shelf': 'location',
    'price': 'purchase_price',
    'purchase_price': 'purchase_price',
    'cost': 'purchase_price',
    'rp': 'rp',
    'mrp': 'rp',
    'retail_price': 'rp',
    'purchase_date': 'purchase_date',
    'date_purchased': 'purchase_date',
    'rating': 'rating',
    'notes': 'notes',
    'note': 'notes',
  };
  return aliasMap[raw] || raw;
}

function doGet(e) {
  try {
    const token = e?.parameter?.token || '';
    if (!verifyToken(token)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid or missing token' });
    }
    ensureSheetsExist();
    const table = e?.parameter?.table || SHEETS.BOOKS;
    return jsonResponse({
      success: true,
      table: table,
      rows: readTableAsObjects(table)
    });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (!verifyToken(body.token)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid or missing token' });
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
    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err.message || err) });
  }
}

function readTableAsObjects(sheetName) {
  const sheet = findSheet(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  // Read actual headers from row 1
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  return data.map((row, rowIdx) => {
    const obj = {};
    normalizedHeaders.forEach((h, colIdx) => {
      if (h) {
        obj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      }
    });

    // Auto-generate book_id if missing but row has title or content
    if (sheetName === SHEETS.BOOKS) {
      if (!obj['book_id'] && (obj['title'] || row[0])) {
        obj['book_id'] = 'BOOK-' + String(rowIdx + 1).padStart(3, '0');
      }
      if (!obj['title'] && row[0]) {
        obj['title'] = row[0];
      }
    }

    return obj;
  });
}

function appendRowObject(sheetName, record) {
  const sheet = findSheet(sheetName) || getSpreadsheet().getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const row = headers.map(h => formatCellForWrite(h, record[h]));
  sheet.appendRow(row);
  return record;
}

function updateRowByKey(sheetName, keyField, keyValue, patch) {
  const sheet = findSheet(sheetName) || getSpreadsheet().getSheetByName(sheetName);
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
  const sheet = findSheet(SHEETS.BOOKS) || getSpreadsheet().getSheetByName(SHEETS.BOOKS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().map(r => r[0]);
  const map = {};
  items.forEach(item => { map[item.book_id] = item.cover_url; });
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
  const sheet = findSheet(sheetName) || getSpreadsheet().getSheetByName(sheetName);
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
