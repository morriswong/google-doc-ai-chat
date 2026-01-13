/**
 * Google Docs & Sheets AI Chat Sidebar
 * Supports both Google Docs and Google Sheets with context reading
 */

/**
 * Detects the current container type (Docs or Sheets)
 * @returns {string} 'docs', 'sheets', or 'unknown'
 */
function getContainerType() {
  try {
    DocumentApp.getActiveDocument();
    return 'docs';
  } catch (e) {
    try {
      SpreadsheetApp.getActiveSpreadsheet();
      return 'sheets';
    } catch (e2) {
      return 'unknown';
    }
  }
}

/**
 * Creates the custom menu in Google Docs or Sheets.
 */
function onOpen() {
  const containerType = getContainerType();

  if (containerType === 'docs') {
    DocumentApp.getUi()
        .createAddonMenu()
        .addItem('Open Chat', 'showSidebar')
        .addToUi();
  } else if (containerType === 'sheets') {
    SpreadsheetApp.getUi()
        .createAddonMenu()
        .addItem('Open Chat', 'showSidebar')
        .addToUi();
  }
}

/**
 * Opens the sidebar.
 */
function showSidebar() {
  const containerType = getContainerType();
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Gemini')
      .setWidth(300);

  if (containerType === 'docs') {
    DocumentApp.getUi().showSidebar(html);
  } else if (containerType === 'sheets') {
    SpreadsheetApp.getUi().showSidebar(html);
  }
}

/**
 * Gets information about the current document/sheet for the sidebar
 * @returns {Object} Container info including type, name, and whether content is available
 */
function getContainerInfo() {
  const containerType = getContainerType();
  let name = '';

  if (containerType === 'docs') {
    const doc = DocumentApp.getActiveDocument();
    name = doc.getName();
  } else if (containerType === 'sheets') {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    name = spreadsheet.getName();
  }

  return {
    type: containerType,
    name: name
  };
}

/**
 * Gets the full content of the current Google Doc
 * @returns {string} The document text content
 */
function getDocumentContent() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    return body.getText();
  } catch (e) {
    return "Error reading document: " + e.toString();
  }
}

/**
 * Gets the selected text in Google Docs
 * @returns {string|null} Selected text or null if nothing selected
 */
function getSelectedText() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const selection = doc.getSelection();

    if (!selection) {
      return null;
    }

    const elements = selection.getRangeElements();
    let selectedText = '';

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const text = element.getElement().asText();

      if (element.isPartial()) {
        selectedText += text.getText().substring(
          element.getStartOffset(),
          element.getEndOffsetInclusive() + 1
        );
      } else {
        selectedText += text.getText();
      }

      if (i < elements.length - 1) {
        selectedText += '\n';
      }
    }

    return selectedText || null;
  } catch (e) {
    return null;
  }
}

/**
 * Gets content from the active Google Sheet
 * @param {boolean} activeSheetOnly - If true, only get data from active sheet
 * @returns {string} Formatted sheet content
 */
function getSheetContent(activeSheetOnly) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = activeSheetOnly ?
      [spreadsheet.getActiveSheet()] :
      spreadsheet.getSheets();

    let content = '';

    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      const sheetName = sheet.getName();
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();

      if (values.length === 0 || (values.length === 1 && values[0].length === 1 && values[0][0] === '')) {
        continue; // Skip empty sheets
      }

      content += `\n### Sheet: ${sheetName}\n`;

      // Convert to a readable table format
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        // Filter out empty trailing cells and format
        const formattedRow = row.map(cell => {
          if (cell === '') return '';
          if (cell instanceof Date) return cell.toLocaleDateString();
          return String(cell);
        }).join('\t| ');

        if (formattedRow.trim()) {
          content += formattedRow + '\n';
        }

        // Add separator after header row
        if (i === 0) {
          content += '---\n';
        }
      }
    }

    return content.trim() || 'Sheet is empty';
  } catch (e) {
    return "Error reading sheet: " + e.toString();
  }
}

/**
 * Gets the selected range content in Google Sheets
 * @returns {string|null} Selected cells content or null
 */
function getSelectedCells() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const selection = spreadsheet.getActiveRange();

    if (!selection) {
      return null;
    }

    const values = selection.getValues();
    let content = '';

    for (let i = 0; i < values.length; i++) {
      const row = values[i].map(cell => {
        if (cell === '') return '';
        if (cell instanceof Date) return cell.toLocaleDateString();
        return String(cell);
      }).join('\t| ');

      if (row.trim()) {
        content += row + '\n';
      }
    }

    return content.trim() || null;
  } catch (e) {
    return null;
  }
}

/**
 * Gets the document/sheet content based on container type
 * @param {boolean} selectionOnly - If true, only get selected content
 * @param {boolean} activeSheetOnly - For sheets, only get active sheet
 * @returns {Object} Content object with text and metadata
 */
function getContent(selectionOnly, activeSheetOnly) {
  const containerType = getContainerType();
  let content = '';
  let contentType = '';

  if (containerType === 'docs') {
    if (selectionOnly) {
      content = getSelectedText();
      contentType = 'selected text';
      if (!content) {
        content = getDocumentContent();
        contentType = 'full document';
      }
    } else {
      content = getDocumentContent();
      contentType = 'full document';
    }
  } else if (containerType === 'sheets') {
    if (selectionOnly) {
      content = getSelectedCells();
      contentType = 'selected cells';
      if (!content) {
        content = getSheetContent(activeSheetOnly !== false);
        contentType = activeSheetOnly !== false ? 'active sheet' : 'all sheets';
      }
    } else {
      content = getSheetContent(activeSheetOnly !== false);
      contentType = activeSheetOnly !== false ? 'active sheet' : 'all sheets';
    }
  }

  // Truncate if too long (to avoid API limits)
  const MAX_LENGTH = 50000;
  if (content && content.length > MAX_LENGTH) {
    content = content.substring(0, MAX_LENGTH) + '\n\n[Content truncated due to length...]';
  }

  return {
    content: content || 'No content found',
    contentType: contentType,
    containerType: containerType,
    charCount: content ? content.length : 0
  };
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
      'X-Title': 'Google Docs/Sheets Gemini Sidebar'
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

/**
 * Inserts text at the cursor position (works for both Docs and Sheets)
 */
function insertAtCursor(text) {
  const containerType = getContainerType();

  if (containerType === 'docs') {
    const doc = DocumentApp.getActiveDocument();
    const cursor = doc.getCursor();
    const body = doc.getBody();

    if (cursor) {
      cursor.insertText(text);
    } else {
      body.appendParagraph(text);
    }
  } else if (containerType === 'sheets') {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const activeCell = spreadsheet.getActiveCell();

    if (activeCell) {
      activeCell.setValue(text);
    } else {
      // If no active cell, insert in A1 of active sheet
      const sheet = spreadsheet.getActiveSheet();
      sheet.getRange('A1').setValue(text);
    }
  }
}
