function importJobAlerts() {
  var sources = [
    { name: 'LinkedIn',              query: 'label:Career from:jobalerts-noreply@linkedin.com newer_than:2d', parser: extractJobsFromLinkedIn, useHtml: false },
    { name: 'Simplify',              query: 'label:Career from:matches@simplify.jobs newer_than:2d',          parser: extractJobsFromSimplify, useHtml: true  },
    { name: 'Built In',              query: 'label:Career from:support@builtin.com newer_than:2d',            parser: extractJobsFromBuiltIn,  useHtml: true  },
    { name: 'Welcome to the Jungle', query: 'label:Career from:help@welcometothejungle.com newer_than:2d',    parser: extractJobsFromWTTJ,     useHtml: true  },
  ];

  var sheet = getOrCreateSheet();
  var processedUrls = getProcessedUrls(sheet);
  var allNewRows = [];

  sources.forEach(function(source) {
    var rows = [];

    var threads = GmailApp.search(source.query, 0, 50);
    threads.forEach(function(thread) {
      thread.getMessages().forEach(function(message) {
        var date = message.getDate();
        var body = source.useHtml ? message.getBody() : message.getPlainBody();
        var html = message.getBody();
        var jobs = source.useHtml ? source.parser(body) : source.parser(body, html);

        jobs.forEach(function(job) {
          if (!processedUrls[job.url]) {
            rows.push([date, source.name, job.title, job.company, job.location, job.url, 'New']);
            processedUrls[job.url] = true;
          }
        });
      });
    });

    if (rows.length > 0) {
      Logger.log(source.name + ': added ' + rows.length + ' new jobs.');
    } else {
      Logger.log(source.name + ': no new jobs found.');
    }

    allNewRows = allNewRows.concat(rows);
  });

  if (allNewRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, allNewRows.length, 7).setValues(allNewRows);
    sendEmailSummary(allNewRows);
  }

  var ss = getOrCreateSpreadsheet();
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
}

// Keep old name as alias so existing triggers still work
function importLinkedInJobAlerts() {
  importJobAlerts();
}
