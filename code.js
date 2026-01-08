/**
 * Creates the custom menu in Google Docs.
 */
function onOpen() {
  DocumentApp.getUi()
      .createAddonMenu()
      .addItem('Open Chat', 'showSidebar')
      .addToUi();
}

/**
 * Opens the sidebar.
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Gemini')
      .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Saves the API Key to User Properties.
 */
function saveApiKey(key) {
  PropertiesService.getUserProperties().setProperty('OPENROUTER_API_KEY', key);
  return true;
}

/**
 * Checks if an API key exists (returns boolean).
 */
function hasApiKey() {
  const key = PropertiesService.getUserProperties().getProperty('OPENROUTER_API_KEY');
  return !!key;
}

/**
 * Calls the OpenRouter API.
 */
function callOpenRouter(messages) {
  // 1. Retrieve Key from Properties Service
  const API_KEY = PropertiesService.getUserProperties().getProperty('OPENROUTER_API_KEY');
  
  // 2. Error handling if key is missing
  if (!API_KEY) {
    return "Error: API Key is missing. Please click the Settings icon and enter your OpenRouter API Key.";
  }

  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const MODEL = 'google/gemini-2.0-flash-exp:free'; 

  const payload = {
    model: MODEL,
    messages: messages,
    "provider": { "sort": "throughput" }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'HTTP-Referer': 'https://script.google.com/',
      'X-Title': 'Google Docs Gemini Sidebar'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    
    // Check for non-200 errors specifically (like 401 Unauthorized)
    if (response.getResponseCode() !== 200) {
        return "API Error (" + response.getResponseCode() + "): " + response.getContentText();
    }

    const json = JSON.parse(response.getContentText());
    
    if (json.error) {
      return "Error: " + json.error.message;
    }
    
    return json.choices[0].message.content;
    
  } catch (e) {
    return "Connection Error: " + e.toString();
  }
}

function insertAtCursor(text) {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var body = doc.getBody();

  if (cursor) {
    cursor.insertText(text);
  } else {
    body.appendParagraph(text);
  }
}
