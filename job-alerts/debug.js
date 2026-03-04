// Debug: log a sample of plain text from one email
function debugPlainText() {
  var threads = GmailApp.search('label:Career from:jobalerts-noreply@linkedin.com', 0, 1);
  if (threads.length > 0) {
    var msg = threads[0].getMessages()[0];
    var plain = msg.getPlainBody();
    Logger.log(plain.substring(0, 2000));
  }
}

function debugRawLines() {
  var sources = [
    { name: 'Simplify',          query: 'label:Career from:matches@simplify.jobs newer_than:7d',       useHtml: true },
    { name: 'WelcomeToJungle',   query: 'label:Career from:help@welcometothejungle.com newer_than:7d', useHtml: true },
  ];

  sources.forEach(function(source) {
    var threads = GmailApp.search(source.query, 0, 1);
    if (!threads.length) { Logger.log(source.name + ': no emails found'); return; }
    var html = threads[0].getMessages()[0].getBody();

    // For Simplify: find first job link and log its lines
    if (source.name === 'Simplify') {
      var linkRe = /<a[^>]+href=["']([^"']*simplify\.jobs\/matches\?viewMatch=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i;
      var m = linkRe.exec(html);
      if (m) {
        var inner = m[2].replace(/<[^>]+>/g, '\n');
        var lines = inner.split('\n').map(function(l) { return l.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '').trim(); }).filter(function(l) { return l.length > 1; });
        lines.forEach(function(l, i) { Logger.log('Simplify line[' + i + ']: ' + l); });
      }
    }

    // For WTTJ: find first job link and log its lines
    if (source.name === 'WelcomeToJungle') {
      var linkRe2 = /<a[^>]+href=["'](https:\/\/[^"']*sendgrid\.net[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
      var m2;
      var count = 0;
      while ((m2 = linkRe2.exec(html)) !== null && count < 3) {
        var plain = m2[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, '');
        var lines2 = plain.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        if (lines2.length >= 4) {
          Logger.log('--- WTTJ job card ' + count + ' ---');
          lines2.forEach(function(l, i) { Logger.log('WTTJ line[' + i + ']: ' + l); });
          count++;
        }
      }
    }
  });
}

function debugJobCounts() {
  var sources = [
    { name: 'LinkedIn',         query: 'label:Career from:jobalerts-noreply@linkedin.com newer_than:7d', parser: extractJobsFromLinkedIn, useHtml: false },
    { name: 'Simplify',         query: 'label:Career from:matches@simplify.jobs newer_than:7d',          parser: extractJobsFromSimplify, useHtml: true },
    { name: 'Built In',         query: 'label:Career from:support@builtin.com newer_than:7d',            parser: extractJobsFromBuiltIn, useHtml: true },
    { name: 'WelcomeToJungle',  query: 'label:Career from:help@welcometothejungle.com newer_than:7d',    parser: extractJobsFromWTTJ,     useHtml: true },
  ];

  sources.forEach(function(source) {
    var threads = GmailApp.search(source.query, 0, 50);
    var totalJobs = 0;
    threads.forEach(function(thread) {
      thread.getMessages().forEach(function(message) {
        var body = source.useHtml ? message.getBody() : message.getPlainBody();
        var jobs = source.useHtml ? source.parser(body) : source.parser(body, message.getBody());
        Logger.log(source.name + ' | email date: ' + message.getDate() + ' | jobs parsed: ' + jobs.length);
        if (jobs.length > 0) {
          jobs.forEach(function(j) { Logger.log('  -> ' + j.company + ' | ' + j.title + ' | ' + j.url); });
        }
        totalJobs += jobs.length;
      });
    });
    Logger.log('=== ' + source.name + ': ' + threads.length + ' emails, ' + totalJobs + ' total jobs ===');
  });
}
