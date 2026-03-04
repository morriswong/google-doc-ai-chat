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

function extractJobsFromSimplify(html) {
  var jobs = [];
  var seenUrls = {};

  // Each job is an <a> tag linking to simplify.jobs/matches?viewMatch=UUID
  var linkRe = /<a[^>]+href=["']([^"']*simplify\.jobs\/matches\?viewMatch=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  while ((match = linkRe.exec(html)) !== null) {
    var rawUrl = match[1].replace(/&amp;/g, '&');
    // Normalise to just the viewMatch parameter as the canonical URL
    var vmMatch = /viewMatch=([a-f0-9-]+)/i.exec(rawUrl);
    if (!vmMatch) continue;
    var url = 'https://simplify.jobs/matches?viewMatch=' + vmMatch[1];
    if (seenUrls[url]) continue;
    seenUrls[url] = true;

    // Strip all tags from the link inner HTML to get plain text lines
    var inner = match[2].replace(/<[^>]+>/g, '\n');
    var lines = inner.split('\n')
      .map(function(l) { return l.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '').trim(); })
      .filter(function(l) { return l.length > 1; });

    // Simplify link text order (from inspection):
    // [0] Company name
    // [1] Employment type  (e.g. "Full-time")
    // [2] Company description  (sometimes absent)
    // [3] Job title  (or [2] if description is absent)
    var company = lines[0] || '';
    var title   = lines[3] || lines[2] || '';
    var location = '';  // Simplify emails don't include location

    jobs.push({ url: url, title: title, company: company, location: location });
  }

  return jobs;
}

function extractJobsFromBuiltIn(html) {
  var jobs = [];
  var seenUrls = {};

  // Built In wraps links in awstrack.me/L0/<url-encoded-real-url>
  // e.g. https://cb4sdw3d.r.us-west-2.awstrack.me/L0/https:%2F%2Fbuiltin.com%2Fjob%2F...
  var linkRe = /<a[^>]+href=["']([^"']+awstrack\.me[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  while ((match = linkRe.exec(html)) !== null) {
    var href = match[1];

    // Extract the URL-encoded real URL from the /L0/ path segment
    var l0Match = /\/L0\/(https:[^/\s"']+)/i.exec(href);
    if (!l0Match) continue;

    var realUrl;
    try { realUrl = decodeURIComponent(l0Match[1]); } catch(e) { realUrl = l0Match[1]; }

    // Only process links to builtin.com job pages
    if (!/builtin\.com\/job\//.test(realUrl)) continue;

    var canonical = realUrl.split('?')[0];
    if (seenUrls[canonical]) continue;
    seenUrls[canonical] = true;

    // Strip tags from inner HTML
    var inner = match[2].replace(/<[^>]+>/g, '\n');
    var lines = inner.split('\n')
      .map(function(l) { return l.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim(); })
      .filter(function(l) { return l.length > 1; });

    // Built In link text order (from inspection):
    // [0] Company name
    // [1] Job title
    // [2] Work type + Location concatenated (e.g. "HybridLondon" or "In OfficeMultiple Locations")
    var company  = lines[0] || '';
    var title    = lines[1] || '';
    var location = lines[2] || '';

    jobs.push({ url: canonical, title: title, company: company, location: location });
  }

  return jobs;
}

function extractJobsFromWTTJ(html) {
  var jobs = [];
  var seenUrls = {};

  // WTTJ uses SendGrid opaque tracking URLs (upn= token, no decodable real URL).
  // Job links are identified by their link text structure:
  //   Company\n\nCompany description\n\n\nJob Title\nLocation (optional: Salary line before location)
  // Non-job links (nav, unsubscribe, etc.) have short plain text.
  var linkRe = /<a[^>]+href=["'](https:\/\/[^"']*sendgrid\.net[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  while ((match = linkRe.exec(html)) !== null) {
    var href = match[1].replace(/&amp;/g, '&');
    var inner = match[2];

    // Strip tags, decode entities
    var plainText = inner.replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, '');

    // Split into non-empty lines
    var lines = plainText.split('\n')
      .map(function(l) { return l.trim(); })
      .filter(function(l) { return l.length > 0; });

    // Job cards have at least 4 lines: company, description, title, location
    if (lines.length < 4) continue;

    // Use the SendGrid URL as canonical (unique per job)
    if (seenUrls[href]) continue;
    seenUrls[href] = true;

    var company  = lines[0];
    // lines[1] is company description — skip it
    var title    = lines[2];
    // lines[3] may be a team name in parens like "(Payments)" — skip it
    // lines[3 or 4] may be "Salary: ..." — skip it too; location follows
    var locIdx = 3;
    if (locIdx < lines.length && /^\(.*\)$/.test(lines[locIdx])) locIdx++;
    if (locIdx < lines.length && /^Salary:/i.test(lines[locIdx])) locIdx++;
    var location = lines[locIdx] || '';

    jobs.push({ url: href, title: title, company: company, location: location });
  }

  return jobs;
}
