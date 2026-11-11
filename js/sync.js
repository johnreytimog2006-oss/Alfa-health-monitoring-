// Alfa Company Health Monitoring — Real-Time Google Sheets Sync Engine
// Upgraded for sub-minute real-time Alfa Company health surveillance

(function (global) {
  'use strict';

  class HealthSheetSync {
    constructor(config) {
      this.config = config || global.HEALTH_SHEET_CONFIG || {};
      this.lastSignature = null;
      this.lastTransport = 'snapshot';
    }

    static parseCSV(csvText) {
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

    static toBool(val) {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      const s = String(val || '').trim().toUpperCase();
      return s === 'TRUE' || s === 'YES' || s === '1' || s === 'Y' || s === '✓' || s === 'CHECKED';
    }

    static parseCsvRowsToRecords(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return [];

      // Locate the table header row for columns A..G (ignoring right-hand scratch lists)
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

      const startRow = headerIdx === -1 ? 1 : headerIdx + 1;
      const records = [];

      for (let i = startRow; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const classYr = String(r[colMap.classYr] || '').trim().toUpperCase();
        const cadet = String(r[colMap.cadet] || '').trim();

        // Stop or skip blank lines in the main A:G health table
        if (!classYr && !cadet) continue;
        if (!cadet) continue;

        records.push({
          rowNumber: i + 1,
          classYr: classYr || 'UNSPEC',
          cadet,
          colds: colMap.colds >= 0 ? HealthSheetSync.toBool(r[colMap.colds]) : false,
          cough: colMap.cough >= 0 ? HealthSheetSync.toBool(r[colMap.cough]) : false,
          flu: colMap.flu >= 0 ? HealthSheetSync.toBool(r[colMap.flu]) : false,
          fever: colMap.fever >= 0 ? HealthSheetSync.toBool(r[colMap.fever]) : false,
          none: colMap.none >= 0 ? HealthSheetSync.toBool(r[colMap.none]) : false
        });
      }

      return records;
    }

    static parseGvizJsonToRecords(payload) {
      if (!payload || !payload.table || !Array.isArray(payload.table.rows)) return [];
      const cols = (payload.table.cols || []).slice(0, 10).map((c) => String(c.label || '').trim().toLowerCase());

      const idxClass = cols.indexOf('class') !== -1 ? cols.indexOf('class') : 0;
      const idxCadet = cols.indexOf('cadet') !== -1 ? cols.indexOf('cadet') : 1;
      const idxColds = cols.indexOf('colds') !== -1 ? cols.indexOf('colds') : (cols.indexOf('cold') !== -1 ? cols.indexOf('cold') : 2);
      const idxCough = cols.indexOf('cough') !== -1 ? cols.indexOf('cough') : 3;
      const idxFlu = cols.indexOf('flu') !== -1 ? cols.indexOf('flu') : 4;
      const idxFever = cols.indexOf('fever') !== -1 ? cols.indexOf('fever') : 5;
      const idxNone = cols.indexOf('none') !== -1 ? cols.indexOf('none') : 6;

      const records = [];
      payload.table.rows.forEach((rowObj, idx) => {
        const cells = rowObj && Array.isArray(rowObj.c) ? rowObj.c : [];
        const getVal = (colIdx) => (cells[colIdx] && cells[colIdx].v !== undefined && cells[colIdx].v !== null ? cells[colIdx].v : '');

        const classYr = String(getVal(idxClass)).trim().toUpperCase();
        const cadet = String(getVal(idxCadet)).trim();
        if (!classYr && !cadet) return;
        if (!cadet) return;

        records.push({
          rowNumber: idx + 2,
          classYr: classYr || 'UNSPEC',
          cadet,
          colds: HealthSheetSync.toBool(getVal(idxColds)),
          cough: HealthSheetSync.toBool(getVal(idxCough)),
          flu: HealthSheetSync.toBool(getVal(idxFlu)),
          fever: HealthSheetSync.toBool(getVal(idxFever)),
          none: HealthSheetSync.toBool(getVal(idxNone))
        });
      });

      return records;
    }

    async fetchViaDirectGvizCsv(sheetId, gid) {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Google GVIZ CSV HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Google Sheet returned HTML instead of CSV (check public sharing)');
      }
      const rows = HealthSheetSync.parseCSV(text);
      const records = HealthSheetSync.parseCsvRowsToRecords(rows);
      if (records.length === 0) throw new Error('Parsed 0 records from CSV');
      this.lastTransport = 'google-gviz-csv';
      return { records, transport: 'google-gviz-csv', sig: null };
    }

    async fetchViaVercelProxy(sheetId, gid) {
      if (typeof window === 'undefined' || window.location.protocol === 'file:') {
        throw new Error('Proxy unavailable on file://');
      }
      const url = `/api/sheet?sheetId=${encodeURIComponent(sheetId)}&gid=${encodeURIComponent(gid)}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`/api/sheet HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.records)) {
        throw new Error(data?.error || 'Invalid proxy payload');
      }
      this.lastTransport = 'vercel-api-proxy';
      return { records: data.records, transport: 'vercel-api-proxy', sig: data.sig || null };
    }

    fetchViaJsonp(sheetId, gid, timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        if (typeof document === 'undefined') {
          reject(new Error('No DOM for JSONP'));
          return;
        }
        const cbName = `__alfaHealthCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const script = document.createElement('script');
        let settled = false;

        const cleanup = () => {
          try { delete global[cbName]; } catch (_) { global[cbName] = undefined; }
          if (script.parentNode) script.parentNode.removeChild(script);
        };

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error('Google Sheets JSONP timeout'));
        }, timeoutMs);

        global[cbName] = (payload) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          try {
            if (!payload || payload.status === 'error') {
              reject(new Error('Google GVIZ JSONP returned error'));
              return;
            }
            const records = HealthSheetSync.parseGvizJsonToRecords(payload);
            if (records.length === 0) {
              reject(new Error('Parsed 0 records from JSONP'));
              return;
            }
            this.lastTransport = 'google-gviz-jsonp';
            this.lastSignature = payload.sig || null;
            resolve({ records, transport: 'google-gviz-jsonp', sig: payload.sig || null });
          } catch (err) {
            reject(err);
          }
        };

        script.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          reject(new Error('Failed to load Google Sheets JSONP script'));
        };

        script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=${encodeURIComponent(`out:json;responseHandler:${cbName}`)}&gid=${encodeURIComponent(gid)}&_t=${Date.now()}`;
        document.head.appendChild(script);
      });
    }

    async fetchLiveRecords(overrideSheetId, overrideGid) {
      const sheetId = overrideSheetId || this.config.sheetId;
      const gid = overrideGid !== undefined && overrideGid !== null ? String(overrideGid) : String(this.config.gid || '0');
      const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

      if (isFileProtocol) {
        return await this.fetchViaJsonp(sheetId, gid);
      }

      // 1. Direct Google Sheets GVIZ CSV (fastest, CORS-enabled by Google)
      try {
        return await this.fetchViaDirectGvizCsv(sheetId, gid);
      } catch (directErr) {
        // 2. Fallback to Vercel Serverless Proxy (/api/sheet)
        try {
          return await this.fetchViaVercelProxy(sheetId, gid);
        } catch (proxyErr) {
          // 3. Final fallback to GVIZ JSONP
          return await this.fetchViaJsonp(sheetId, gid);
        }
      }
    }

    static recordKey(r) {
      return `${String(r.classYr || '').trim().toUpperCase()}|${String(r.cadet || '').trim().toUpperCase()}`;
    }

    static activeSymptomLabels(r) {
      const list = [];
      if (r.colds) list.push('Colds');
      if (r.cough) list.push('Cough');
      if (r.flu) list.push('Flu');
      if (r.fever) list.push('Fever');
      return list;
    }

    static diffRecords(prevList, nextList) {
      const prevMap = new Map();
      (prevList || []).forEach((r) => prevMap.set(HealthSheetSync.recordKey(r), r));
      const nextMap = new Map();
      (nextList || []).forEach((r) => nextMap.set(HealthSheetSync.recordKey(r), r));

      const events = [];

      nextMap.forEach((next, key) => {
        const prev = prevMap.get(key);
        if (!prev) {
          const syms = HealthSheetSync.activeSymptomLabels(next);
          events.push({
            type: 'added',
            key,
            classYr: next.classYr,
            cadet: next.cadet,
            isSevere: next.fever || next.flu,
            summary: `${next.classYr} ${next.cadet} added (${syms.length ? syms.join(' + ') : 'Fit'})`
          });
          return;
        }

        const changes = [];
        ['colds', 'cough', 'flu', 'fever', 'none'].forEach((flag) => {
          if (Boolean(prev[flag]) !== Boolean(next[flag])) {
            const label = flag.charAt(0).toUpperCase() + flag.slice(1);
            changes.push(`${next[flag] ? '+' : '-'}${label}`);
          }
        });

        if (changes.length > 0) {
          const syms = HealthSheetSync.activeSymptomLabels(next);
          const statusStr = syms.length ? syms.join(' + ') : (next.none ? 'Fit (None)' : 'Unmarked');
          events.push({
            type: 'changed',
            key,
            classYr: next.classYr,
            cadet: next.cadet,
            isSevere: (!prev.fever && next.fever) || (!prev.flu && next.flu),
            summary: `${next.classYr} ${next.cadet}: ${statusStr} (${changes.join(', ')})`
          });
        }
      });

      prevMap.forEach((prev, key) => {
        if (!nextMap.has(key)) {
          events.push({
            type: 'removed',
            key,
            classYr: prev.classYr,
            cadet: prev.cadet,
            isSevere: false,
            summary: `${prev.classYr} ${prev.cadet} removed from sheet`
          });
        }
      });

      return events;
    }

    async pushCadetUpdate(recordPayload, appsScriptUrl) {
      const body = {
        action: 'upsert',
        sheetId: this.config.sheetId,
        sheetName: this.config.sheetName || 'Sheet1',
        originalClassYr: recordPayload.originalClassYr || recordPayload.classYr,
        originalCadet: recordPayload.originalCadet || recordPayload.cadet,
        classYr: recordPayload.classYr,
        cadet: recordPayload.cadet,
        colds: Boolean(recordPayload.colds),
        cough: Boolean(recordPayload.cough),
        flu: Boolean(recordPayload.flu),
        fever: Boolean(recordPayload.fever),
        none: Boolean(recordPayload.none)
      };

      // Option A: Direct Google Apps Script Web App URL (uses text/plain to avoid CORS preflight)
      if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
        const res = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body)
        });
        const text = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (_) {}
        if (!res.ok || (parsed && parsed.ok === false)) {
          throw new Error((parsed && parsed.error) || `Apps Script returned HTTP ${res.status}`);
        }
        return { ok: true, mode: 'apps-script', response: parsed || { raw: text } };
      }

      // Option B: Vercel Serverless Function (/api/update) with Service Account or Webhook env var
      if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
        const res = await fetch('/api/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          return { ok: true, mode: data.mode || 'vercel-api', response: data };
        }
        if (res.status === 501 || data.setupRequired) {
          return { ok: false, setupRequired: true, message: data.message || 'Two-way write-back not configured yet.' };
        }
        throw new Error(data.error || `Server update failed (HTTP ${res.status})`);
      }

      return {
        ok: false,
        setupRequired: true,
        message: 'Two-way write-back requires a Google Apps Script URL or Vercel API configuration.'
      };
    }
  }

  global.HealthSheetSync = HealthSheetSync;
})(typeof window !== 'undefined' ? window : globalThis);
