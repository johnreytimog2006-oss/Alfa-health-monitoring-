// Vercel Serverless Function: Live Google Sheet Reader Proxy
// Fetches live GVIZ CSV from Google Sheets with zero caching so Vercel clients always get real-time data.

const DEFAULT_SHEET_ID = '1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ';

function parseCSV(csvText) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let field = '';

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c.length > 0)) lines.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((c) => c.length > 0)) lines.push(row);
  }
  return lines;
}

function toBool(val) {
  if (typeof val === 'boolean') return val;
  const s = String(val || '').trim().toUpperCase();
  return s === 'TRUE' || s === 'YES' || s === '1' || s === 'Y' || s === '✓';
}

function parseRecords(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  let headerIdx = -1;
  let colMap = { classYr: 0, cadet: 1, colds: 2, cough: 3, flu: 4, fever: 5, none: 6 };

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const normalized = rows[i].slice(0, 10).map((c) => String(c || '').trim().toLowerCase());
    const idxClass = normalized.indexOf('class');
    const idxCadet = normalized.indexOf('cadet');
    if (idxClass !== -1 && idxCadet !== -1) {
      headerIdx = i;
      colMap = {
        classYr: idxClass,
        cadet: idxCadet,
        colds: normalized.indexOf('colds') !== -1 ? normalized.indexOf('colds') : normalized.indexOf('cold'),
        cough: normalized.indexOf('cough'),
        flu: normalized.indexOf('flu'),
        fever: normalized.indexOf('fever'),
        none: normalized.indexOf('none')
      };
      break;
    }
  }

  const start = headerIdx === -1 ? 1 : headerIdx + 1;
  const records = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const classYr = String(r[colMap.classYr] || '').trim().toUpperCase();
    const cadet = String(r[colMap.cadet] || '').trim();
    if (!classYr && !cadet) continue;
    if (!cadet) continue;

    records.push({
      rowNumber: i + 1,
      classYr: classYr || 'UNSPEC',
      cadet,
      colds: colMap.colds >= 0 ? toBool(r[colMap.colds]) : false,
      cough: colMap.cough >= 0 ? toBool(r[colMap.cough]) : false,
      flu: colMap.flu >= 0 ? toBool(r[colMap.flu]) : false,
      fever: colMap.fever >= 0 ? toBool(r[colMap.fever]) : false,
      none: colMap.none >= 0 ? toBool(r[colMap.none]) : false
    });
  }
  return records;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawSheetId = String(req.query?.sheetId || DEFAULT_SHEET_ID).trim();
  const rawGid = String(req.query?.gid || '0').trim();

  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(rawSheetId)) {
    return res.status(400).json({ ok: false, error: 'Invalid sheetId parameter' });
  }
  if (!/^\d+$/.test(rawGid)) {
    return res.status(400).json({ ok: false, error: 'Invalid gid parameter' });
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(rawSheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(rawGid)}&_t=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Google Sheets returned HTTP ${response.status}`
      });
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const records = parseRecords(rows);

    return res.status(200).json({
      ok: true,
      syncedAt: new Date().toISOString(),
      sheetId: rawSheetId,
      gid: rawGid,
      count: records.length,
      records
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'Failed to fetch Google Sheet'
    });
  }
};
