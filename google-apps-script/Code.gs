/**
 * Alfa Company Health Monitoring — Optional Two-Way Google Sheet Sync (Apps Script)
 *
 * Setup (takes ~60 seconds):
 * 1. Open your Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ/edit
 * 2. Click Extensions -> Apps Script.
 * 3. Replace the editor contents with this file and click Save.
 * 4. Click Deploy -> New deployment -> Web app:
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the generated Web App `/exec` URL and either:
 *      - Paste it into "Live Sheet Sync Setup" on the website, OR
 *      - Add it as `APPS_SCRIPT_WEBHOOK_URL` in Vercel Environment Variables.
 */

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(body.sheetName || 'Sheet1') || ss.getSheets()[0];
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var data = sheet.getRange(1, 1, lastRow, 7).getValues();

  var targetClass = String(body.originalClassYr || body.classYr || '').trim().toUpperCase();
  var targetCadet = String(body.originalCadet || body.cadet || '').trim().toUpperCase();
  var newRowValues = [
    String(body.classYr || '').trim().toUpperCase(),
    String(body.cadet || '').trim().toUpperCase(),
    Boolean(body.colds),
    Boolean(body.cough),
    Boolean(body.flu),
    Boolean(body.fever),
    Boolean(body.none)
  ];

  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    var rowCls = String(data[i][0] || '').trim().toUpperCase();
    var rowCadet = String(data[i][1] || '').trim().toUpperCase();
    if (rowCls === targetClass && rowCadet === targetCadet) {
      foundRow = i + 1;
      break;
    }
  }

  var writeRow = foundRow;
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 7).setValues([newRowValues]);
  } else {
    var insertAt = 2;
    for (var j = 1; j < data.length; j++) {
      if (String(data[j][0] || '').trim() || String(data[j][1] || '').trim()) {
        insertAt = j + 2;
      }
    }
    sheet.getRange(insertAt, 1, 1, 7).setValues([newRowValues]);
    writeRow = insertAt;
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, row: writeRow }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'Alfa Company Health Monitoring Apps Script Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}
