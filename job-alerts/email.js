function sendEmailSummary(rows) {
  var ss = getOrCreateSpreadsheet();
  var sheetUrl = ss.getUrl();

  var jobLines = rows.map(function(row) {
    var date = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd MMM') : row[0];
    var source = row[1] || '';
    var title = row[2] || '(No title)';
    var company = row[3] || '';
    var location = row[4] || '';
    var url = row[5] || '';
    return '<tr>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;color:#666;font-size:12px;">' + source + '</td>' +
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
    '<th style="padding:8px 12px;text-align:left;">Source</th>' +
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
    rows.length + ' new job alert' + (rows.length > 1 ? 's' : '') + ' — Career Job Alerts',
    rows.map(function(r) { return (r[2] || '') + ' — ' + (r[3] || '') + ' (' + (r[4] || '') + ')\n' + r[5]; }).join('\n\n'),
    { htmlBody: html }
  );

  Logger.log('Email summary sent.');
}
