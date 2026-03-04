function getOrCreateSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch(e) {}
  }
  var ss = SpreadsheetApp.create('Career Job Listings');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  Logger.log('Created new spreadsheet: ' + ss.getUrl());
  return ss;
}

function getOrCreateSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName('Job Listings');
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName('Job Listings');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 280);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 180);
    sheet.setColumnWidth(6, 320);
    sheet.setColumnWidth(7, 100);
  }
  // Always ensure correct headers (handles schema migrations)
  sheet.getRange(1, 1, 1, 7).setValues([['Date', 'Source', 'Job Title', 'Company', 'Location', 'URL', 'Status']]);
  sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  return sheet;
}

function deleteSourceTabs() {
  var ss = getOrCreateSpreadsheet();
  ['LinkedIn', 'Simplify', 'Built In', 'Welcome to the Jungle'].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) ss.deleteSheet(sheet);
  });
}

function getProcessedUrls(sheet) {
  var processed = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return processed;
  var urls = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  urls.forEach(function(row) { if (row[0]) processed[row[0]] = true; });
  return processed;
}

// WARNING: Destructive one-time reset. Wipes ALL historical rows and reimports
// only the last 2 days. Do NOT use this routinely — use importJobAlerts() instead.
function clearAndReimport() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName('Job Listings');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();
  }
  importJobAlerts();
}
