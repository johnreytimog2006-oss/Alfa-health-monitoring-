// Vercel Serverless Function: Optional Two-Way Google Sheet Write-Back
// Supports either:
//   1. GOOGLE_SERVICE_ACCOUNT_JSON environment variable (official Sheets API v4 via native crypto RS256 JWT)
//   2. APPS_SCRIPT_WEBHOOK_URL environment variable (Google Apps Script Web App)

const crypto = require('crypto');

const DEFAULT_SHEET_ID = '1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ';

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getServiceAccountToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })
  );
  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer
    .sign(sa.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const assertion = `${signingInput}.${signature}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to authenticate Service Account');
  }
  return tokenData.access_token;
}

async function updateViaServiceAccount(saJsonStr, payload) {
  const sa = JSON.parse(saJsonStr);
  const token = await getServiceAccountToken(sa);
  const sheetId = payload.sheetId || DEFAULT_SHEET_ID;
  const sheetName = payload.sheetName || 'Sheet1';

  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(`${sheetName}!A1:G500`)}`;
  const readRes = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const readData = await readRes.json();
  if (!readRes.ok) {
    throw new Error(readData.error?.message || 'Failed reading Google Sheet via API v4');
  }

  const values = Array.isArray(readData.values) ? readData.values : [];
  const targetClass = String(payload.originalClassYr || payload.classYr || '').trim().toUpperCase();
  const targetCadet = String(payload.originalCadet || payload.cadet || '').trim().toUpperCase();

  let foundRowNumber = -1;
  let lastNonEmptyRow = 1;

  for (let i = 1; i < values.length; i++) {
    const r = values[i] || [];
    const cls = String(r[0] || '').trim().toUpperCase();
    const cdt = String(r[1] || '').trim().toUpperCase();
    if (cls || cdt) lastNonEmptyRow = i + 1;
    if (cls === targetClass && cdt === targetCadet) {
      foundRowNumber = i + 1;
      break;
    }
  }

  const rowValues = [[
    String(payload.classYr || '').trim().toUpperCase(),
    String(payload.cadet || '').trim().toUpperCase(),
    Boolean(payload.colds),
    Boolean(payload.cough),
    Boolean(payload.flu),
    Boolean(payload.fever),
    Boolean(payload.none)
  ]];

  const writeRow = foundRowNumber > 0 ? foundRowNumber : lastNonEmptyRow + 1;
  const range = `${sheetName}!A${writeRow}:G${writeRow}`;
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const writeRes = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values: rowValues })
  });
  const writeData = await writeRes.json();
  if (!writeRes.ok) {
    throw new Error(writeData.error?.message || 'Failed writing row to Google Sheet');
  }

  return { ok: true, mode: 'service-account', row: writeRow, updatedCells: writeData.updatedCells || 7 };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (_) { payload = null; }
  }
  if (!payload || !payload.cadet || !payload.classYr) {
    return res.status(400).json({ ok: false, error: 'Missing required classYr or cadet field' });
  }

  if (payload.sheetId && !/^[a-zA-Z0-9_-]{10,100}$/.test(String(payload.sheetId))) {
    return res.status(400).json({ ok: false, error: 'Invalid sheetId' });
  }

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;

  try {
    if (saJson) {
      const result = await updateViaServiceAccount(saJson, payload);
      return res.status(200).json(result);
    }

    if (webhookUrl && webhookUrl.startsWith('https://script.google.com/')) {
      const hookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await hookRes.text();
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}
      if (!hookRes.ok || data.ok === false) {
        throw new Error(data.error || `Apps Script returned HTTP ${hookRes.status}`);
      }
      return res.status(200).json({ ok: true, mode: 'vercel-apps-script-env', response: data });
    }

    return res.status(501).json({
      ok: false,
      setupRequired: true,
      message: 'Configure APPS_SCRIPT_WEBHOOK_URL or GOOGLE_SERVICE_ACCOUNT_JSON in Vercel, or paste an Apps Script URL in Sheet Sync Setup.'
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to update Google Sheet'
    });
  }
};
