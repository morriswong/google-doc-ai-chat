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
