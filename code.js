function importLinkedInJobAlerts() {
  var sheet = getOrCreateSheet();
  var processedUrls = getProcessedUrls(sheet);

  var threads = GmailApp.search('label:Career from:jobalerts-noreply@linkedin.com newer_than:1d', 0, 50);
  var rows = [];

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    messages.forEach(function(message) {
      var date = message.getDate();
      var plain = message.getPlainBody();
      var html = message.getBody();
      var jobs = extractJobsFromLinkedIn(plain, html);

      jobs.forEach(function(job) {
        if (!processedUrls[job.url]) {
          rows.push([date, job.title, job.company, job.location, job.url, 'New']);
          processedUrls[job.url] = true;
        }
      });
    });
  });

  if (rows.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, 6).setValues(rows);
    Logger.log('Added ' + rows.length + ' new jobs.');
    sendEmailSummary(rows);
  } else {
    Logger.log('No new jobs found.');
  }

  var ss = getOrCreateSpreadsheet();
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
}

function extractJobsFromLinkedIn(plain, html) {
  var jobs = [];
  var seenIds = {};

  // Plain text format per job:
  // Job Title
  // Company
  // Location
  // N company alumni  (or "N connections" etc - skip)
  // View job: https://...jobs/view/JOBID/...
  // ---------

  // Split on "View job:" to get each job block
  var blocks = plain.split('View job:');

  for (var b = 1; b < blocks.length; b++) {
    // Extract job ID from the URL at start of this block
    var idMatch = /jobs\/view\/(\d+)\//.exec(blocks[b]);
    if (!idMatch) continue;
    var jobId = idMatch[1];
    if (seenIds[jobId]) continue;
    seenIds[jobId] = true;

    var jobUrl = 'https://www.linkedin.com/jobs/view/' + jobId;

    // Look at the lines BEFORE "View job:" — in the previous block
    var prevBlock = blocks[b - 1];
    var lines = prevBlock.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 1; });

    // Last lines of prevBlock are: [..., Title, Company, Location, "N alumni"]
    // Skip trailing lines that look like alumni/connection counts
    var i = lines.length - 1;
    while (i >= 0 && /^\d+\s+(company|school|alumni|connection)/i.test(lines[i])) {
      i--;
    }

    var location = i >= 0 ? lines[i--] : '';
    var company  = i >= 0 ? lines[i--] : '';
    var title    = i >= 0 ? lines[i]   : '';

    jobs.push({ url: jobUrl, title: title, company: company, location: location });
  }

  return jobs;
}

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
    sheet.getRange(1, 1, 1, 6).setValues([['Date', 'Job Title', 'Company', 'Location', 'LinkedIn URL', 'Status']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 280);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 320);
    sheet.setColumnWidth(6, 100);
  }
  return sheet;
}

function getProcessedUrls(sheet) {
  var processed = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return processed;
  var urls = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
  urls.forEach(function(row) { if (row[0]) processed[row[0]] = true; });
  return processed;
}

function clearAndReimport() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName('Job Listings');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
    Logger.log('Cleared existing data.');
  }
  importLinkedInJobAlerts();
}

function sendEmailSummary(rows) {
  var ss = getOrCreateSpreadsheet();
  var sheetUrl = ss.getUrl();

  var jobLines = rows.map(function(row) {
    var date = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd MMM') : row[0];
    var title = row[1] || '(No title)';
    var company = row[2] || '';
    var location = row[3] || '';
    var url = row[4] || '';
    return '<tr>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;">' + title + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;">' + company + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;">' + location + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;"><a href="' + url + '">View</a></td>' +
      '</tr>';
  }).join('');

  var html = '<div style="font-family:Arial,sans-serif;max-width:700px;">' +
    '<h2 style="color:#0a66c2;">' + rows.length + ' new job' + (rows.length > 1 ? 's' : '') + ' added today</h2>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr style="background:#f3f3f3;">' +
    '<th style="padding:8px 12px;text-align:left;">Job Title</th>' +
    '<th style="padding:8px 12px;text-align:left;">Company</th>' +
    '<th style="padding:8px 12px;text-align:left;">Location</th>' +
    '<th style="padding:8px 12px;text-align:left;">Link</th>' +
    '</tr></thead>' +
    '<tbody>' + jobLines + '</tbody>' +
    '</table>' +
    '<p style="margin-top:16px;"><a href="' + sheetUrl + '" style="background:#0a66c2;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Open full spreadsheet</a></p>' +
    '</div>';

  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    rows.length + ' new LinkedIn job' + (rows.length > 1 ? 's' : '') + ' — Career Job Alerts',
    rows.map(function(r) { return (r[1] || '') + ' — ' + (r[2] || '') + ' (' + (r[3] || '') + ')\n' + r[4]; }).join('\n\n'),
    { htmlBody: html }
  );

  Logger.log('Email summary sent.');
}

// Set up a daily trigger - run this once
function createDailyTrigger() {
  // Delete any existing triggers for this function first
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'importLinkedInJobAlerts') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create a new daily trigger at 8am
  ScriptApp.newTrigger('importLinkedInJobAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log('Daily trigger created — will run every day at 8am.');
}

// Debug: log a sample of plain text from one email
function debugPlainText() {
  var threads = GmailApp.search('label:Career from:jobalerts-noreply@linkedin.com', 0, 1);
  if (threads.length > 0) {
    var msg = threads[0].getMessages()[0];
    var plain = msg.getPlainBody();
    Logger.log(plain.substring(0, 2000));
  }
}
