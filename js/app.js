// Alfa Company Health Monitoring — Application State, Real-Time Surveillance & Chart Engine

(function () {
  'use strict';

  const STORAGE_KEYS = {
    theme: 'alfa_health_theme',
    pollMs: 'alfa_health_poll_ms',
    appsScriptUrl: 'alfa_health_apps_script_url',
    cachedRows: 'alfa_health_cached_rows_v1',
    syncHistory: 'alfa_health_sync_history_v1',
    localOverrides: 'alfa_health_local_overrides_v1'
  };

  const config = window.HEALTH_SHEET_CONFIG || {};
  const metaMap = window.ALFA_CADET_META || {};
  const syncEngine = new window.HealthSheetSync(config);

  const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(body.sheetName || 'Sheet1') || ss.getSheets()[0];
  var data = sheet.getRange(1, 1, sheet.getLastRow(), 7).getValues();

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
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, row: foundRow > 0 ? foundRow : insertAt }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const state = {
    rawSheetRows: [],
    records: [],
    localOverrides: {},
    classScope: 'all',        // 'all' | '1CL' | '2CL' | '3CL' | '4CL'
    rosterFilter: 'all',      // 'all' | 'none' | 'symptomatic' | 'mild' | 'acute' | 'colds' | 'cough' | 'flu' | 'fever' | 'combo:...'
    chartMode: 'symptoms',    // 'symptoms' | 'readiness' | 'history'
    unitBreakdownMode: 'class', // 'class' | 'platoon'
    pollIntervalMs: Number(localStorage.getItem(STORAGE_KEYS.pollMs) ?? config.defaultPollIntervalMs ?? 10000),
    countdownSec: 10,
    pollTimerId: null,
    isSyncing: false,
    hasLiveSyncSucceeded: false,
    lastSyncedAt: null,
    lastTransport: 'snapshot',
    audioMuted: false,
    audioCtx: null,
    chartInstance: null,
    activityLog: [],
    syncHistory: []
  };

  // ---------------- HELPERS ----------------
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMeta(classYr, cadet) {
    const key = `${String(classYr || '').trim().toUpperCase()}|${String(cadet || '').trim().toUpperCase()}`;
    return metaMap[key] || null;
  }

  function enrichRecord(raw, idx) {
    const classYr = String(raw.classYr || '').trim().toUpperCase();
    const cadet = String(raw.cadet || '').trim();
    const meta = getMeta(classYr, cadet);
    const colds = Boolean(raw.colds);
    const cough = Boolean(raw.cough);
    const flu = Boolean(raw.flu);
    const fever = Boolean(raw.fever);
    const anySymptom = colds || cough || flu || fever;
    const none = Boolean(raw.none) && !anySymptom;
    const activeFlags = [];
    if (colds) activeFlags.push('Colds');
    if (cough) activeFlags.push('Cough');
    if (flu) activeFlags.push('Flu');
    if (fever) activeFlags.push('Fever');

    let triage = 'fit';
    let severityScore = 0;
    if (fever) {
      triage = 'fever';
      severityScore = 100 + activeFlags.length;
    } else if (flu) {
      triage = 'flu';
      severityScore = 70 + activeFlags.length;
    } else if (activeFlags.length >= 2) {
      triage = 'dual';
      severityScore = 40 + activeFlags.length;
    } else if (activeFlags.length === 1) {
      triage = 'mild';
      severityScore = 20;
    } else if (!none) {
      triage = 'unmarked';
      severityScore = 5;
    }

    const key = `${classYr}|${cadet.toUpperCase()}`;
    return {
      key,
      order: idx,
      rowNumber: raw.rowNumber || idx + 2,
      classYr,
      cadet,
      fullName: meta?.fullName || '',
      sn: meta?.sn || '',
      platoon: meta?.platoon || 'Unassigned',
      squad: meta?.squad || '',
      designation: meta?.designation || '',
      colds,
      cough,
      flu,
      fever,
      none,
      anySymptom,
      isAcute: fever || flu,
      isMildOnly: anySymptom && !fever && !flu,
      activeFlags,
      comboKey: anySymptom ? activeFlags.join(' + ') : (none ? 'None' : 'Unmarked'),
      triage,
      severityScore,
      isLocalOverride: Boolean(state.localOverrides[key])
    };
  }

  function getMergedRecords(baseRows) {
    const map = new Map();
    const list = [];

    (baseRows || []).forEach((r, idx) => {
      const key = `${String(r.classYr || '').trim().toUpperCase()}|${String(r.cadet || '').trim().toUpperCase()}`;
      const override = state.localOverrides[key];
      const merged = override ? { ...r, ...override } : r;
      const enriched = enrichRecord(merged, idx);
      map.set(key, enriched);
      list.push(enriched);
    });

    // Include locally added cadets not yet in sheet
    Object.keys(state.localOverrides).forEach((key) => {
      if (!map.has(key)) {
        const enriched = enrichRecord(state.localOverrides[key], list.length);
        list.unshift(enriched);
      }
    });

    return list;
  }

  function getScopedRecords() {
    if (state.classScope === 'all') return state.records;
    return state.records.filter((r) => r.classYr === state.classScope);
  }

  function computeStats(records) {
    const total = records.length;
    let none = 0;
    let symptomatic = 0;
    let mildOnly = 0;
    let acute = 0;
    let colds = 0;
    let cough = 0;
    let flu = 0;
    let fever = 0;
    let totalCheckedFlags = 0;

    records.forEach((r) => {
      if (r.none) none++;
      if (r.anySymptom) symptomatic++;
      if (r.isMildOnly) mildOnly++;
      if (r.isAcute) acute++;
      if (r.colds) { colds++; totalCheckedFlags++; }
      if (r.cough) { cough++; totalCheckedFlags++; }
      if (r.flu) { flu++; totalCheckedFlags++; }
      if (r.fever) { fever++; totalCheckedFlags++; }
    });

    const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');
    return {
      total,
      none,
      symptomatic,
      mildOnly,
      acute,
      colds,
      cough,
      flu,
      fever,
      totalCheckedFlags,
      nonePct: pct(none),
      coldsPct: pct(colds),
      coughPct: pct(cough),
      fluPct: pct(flu),
      feverPct: pct(fever)
    };
  }

  // ---------------- AUDIO & TOAST ----------------
  function playSoftChime(freq = 587, type = 'sine', duration = 0.08) {
    if (state.audioMuted) return;
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (_) {}
  }

  window.toggleAudio = function () {
    state.audioMuted = !state.audioMuted;
    const navIcon = document.getElementById('soundNavIcon');
    const navStatus = document.getElementById('soundStatusLabel');
    if (state.audioMuted) {
      navIcon.className = 'fa-solid fa-bell-slash text-base w-5 text-center text-slate-400';
      navStatus.className = 'ml-auto text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full';
      navStatus.textContent = 'OFF';
      showToast('Audio Muted', 'Alert chimes disabled.');
    } else {
      navIcon.className = 'fa-regular fa-bell text-base w-5 text-center text-pastel-purple';
      navStatus.className = 'ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full';
      navStatus.textContent = 'ON';
      playSoftChime(660, 'sine', 0.1);
      showToast('Audio Active', 'Alert chimes enabled for acute changes.');
    }
  };

  let toastTimer = null;
  function showToast(title, desc, tone = 'default') {
    const toast = document.getElementById('desktopToast');
    const iconWrap = document.getElementById('toastIconWrap');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastDesc').textContent = desc;

    if (tone === 'alert') {
      iconWrap.className = 'w-9 h-9 rounded-xl bg-rose-50 text-pastel-fever flex items-center justify-center text-sm shrink-0';
      iconWrap.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else if (tone === 'success') {
      iconWrap.className = 'w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shrink-0';
      iconWrap.innerHTML = '<i class="fa-solid fa-bolt"></i>';
    } else {
      iconWrap.className = 'w-9 h-9 rounded-xl bg-pastel-lavender text-pastel-purple flex items-center justify-center text-sm shrink-0';
      iconWrap.innerHTML = '<i class="fa-solid fa-check"></i>';
    }

    clearTimeout(toastTimer);
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    toastTimer = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3600);
  }
  window.showToast = showToast;

  // ---------------- DARK MODE & SIDEBAR ----------------
  function applyDarkModeUI(isDark) {
    const html = document.documentElement;
    const icon = document.getElementById('darkModeIcon');
    const pill = document.getElementById('darkModePill');
    if (isDark) {
      html.classList.add('dark');
      if (icon) icon.className = 'fa-solid fa-sun text-base w-5 text-center text-amber-400';
      if (pill) {
        pill.textContent = 'ON';
        pill.className = 'ml-auto text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full';
      }
    } else {
      html.classList.remove('dark');
      if (icon) icon.className = 'fa-solid fa-moon text-base w-5 text-center text-slate-400 group-hover:text-amber-500 transition';
      if (pill) {
        pill.textContent = 'OFF';
        pill.className = 'ml-auto text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full';
      }
    }
    if (state.chartInstance) renderAnalyticsChart();
  }

  window.toggleDarkMode = function () {
    const nextDark = !document.documentElement.classList.contains('dark');
    localStorage.setItem(STORAGE_KEYS.theme, nextDark ? 'dark' : 'light');
    applyDarkModeUI(nextDark);
  };

  window.openMobileSidebar = function () {
    document.getElementById('mainSidebar')?.classList.remove('-translate-x-full');
    document.getElementById('sidebarOverlay')?.classList.remove('hidden');
  };

  window.closeMobileSidebar = function () {
    document.getElementById('mainSidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay')?.classList.add('hidden');
  };

  window.navigateSection = function (sectionKey, btnEl) {
    document.querySelectorAll('.side-nav-btn').forEach((b) => b.classList.remove('nav-active'));
    if (btnEl) btnEl.classList.add('nav-active');

    const map = {
      overview: 'overviewSection',
      surveillance: 'surveillanceSection',
      roster: 'rosterSection'
    };
    const target = document.getElementById(map[sectionKey] || 'overviewSection');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileSidebar();
  };

  // ---------------- RENDERING: KPIS, GAUGE & TICKER ----------------
  function renderMetricsAndGauge() {
    const scoped = getScopedRecords();
    const allStats = computeStats(state.records);
    const stats = computeStats(scoped);

    // Sidebar badges reflect overall Alfa Company sheet totals
    document.getElementById('sideBadgeTotal').textContent = allStats.total;
    document.getElementById('sideBadgeAlert').textContent = allStats.acute;
    document.getElementById('bellAlertBadge').textContent = allStats.acute;

    // Scope badge
    const scopeText = state.classScope === 'all'
      ? `All Classes (1CL–4CL)`
      : `${state.classScope} Cohort Only`;
    document.getElementById('activeScopeBadge').textContent = scopeText;
    document.getElementById('gaugeScopeLabel').textContent = `${stats.total} Cadets`;

    // KPI Cards
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statTotalSub').textContent = state.classScope === 'all' ? '1CL–4CL Screened' : `${state.classScope} Screened`;
    document.getElementById('statSymptomaticSub').textContent = `${stats.symptomatic} Sym`;

    document.getElementById('statNone').textContent = stats.none;
    document.getElementById('statNonePct').textContent = `${stats.nonePct}%`;
    document.getElementById('barNone').style.width = `${stats.nonePct}%`;

    document.getElementById('statColds').textContent = stats.colds;
    document.getElementById('statColdsPct').textContent = `${stats.coldsPct}%`;
    document.getElementById('barColds').style.width = `${stats.coldsPct}%`;

    document.getElementById('statCough').textContent = stats.cough;
    document.getElementById('statCoughPct').textContent = `${stats.coughPct}%`;
    document.getElementById('barCough').style.width = `${stats.coughPct}%`;

    document.getElementById('statFlu').textContent = stats.flu;
    document.getElementById('statFluPct').textContent = `${stats.fluPct}%`;
    document.getElementById('barFlu').style.width = `${stats.fluPct}%`;

    document.getElementById('statFever').textContent = stats.fever;
    document.getElementById('statFeverPct').textContent = `${stats.feverPct}%`;
    document.getElementById('barFever').style.width = `${stats.feverPct}%`;

    // Radial Gauge (C = 2*pi*48 = 301.6)
    const C = 301.6;
    const fitRatio = stats.total > 0 ? stats.none / stats.total : 0;
    const acuteRatio = stats.total > 0 ? stats.acute / stats.total : 0;
    document.getElementById('gaugeHealthCircle').style.strokeDashoffset = C - C * fitRatio;
    document.getElementById('gaugeAcuteSegment').style.strokeDashoffset = C - C * (fitRatio + acuteRatio);
    document.getElementById('centerHealthIndexPct').textContent = `${stats.nonePct}%`;

    document.getElementById('summaryHealthyCount').textContent = `${stats.none} Cadets`;
    document.getElementById('summaryMildCount').textContent = `${stats.mildOnly} Cadets`;
    document.getElementById('summaryAcuteCount').textContent = `${stats.acute} Cadets`;

    document.getElementById('acuteWatchSubtitle').textContent =
      `${stats.acute} cadets (${stats.fever} Fever, ${stats.flu} Flu)`;

    // Filter pill counts (based on current class scope)
    document.getElementById('pillCountAll').textContent = stats.total;
    document.getElementById('pillCountNone').textContent = stats.none;
    document.getElementById('pillCountSymptomatic').textContent = stats.symptomatic;
    document.getElementById('pillCountColds').textContent = stats.colds;
    document.getElementById('pillCountCough').textContent = stats.cough;
    document.getElementById('pillCountFlu').textContent = stats.flu;
    document.getElementById('pillCountFever').textContent = stats.fever;
    document.getElementById('pillCountAcute').textContent = stats.acute;

    document.getElementById('totalFlagsSummary').textContent =
      `${stats.symptomatic} Symptomatic • ${stats.totalCheckedFlags} Checked Flags`;
  }

  function renderMarqueeTicker() {
    const allStats = computeStats(state.records);
    const feverCadets = state.records.filter((r) => r.fever).map((r) => `${r.classYr} ${r.cadet}`);
    const fluCadets = state.records.filter((r) => r.flu).map((r) => `${r.classYr} ${r.cadet}`);

    // Find highest symptomatic class
    const classes = ['1CL', '2CL', '3CL', '4CL'];
    let highestCls = null;
    let highestPct = -1;
    classes.forEach((cls) => {
      const sub = state.records.filter((r) => r.classYr === cls);
      if (sub.length > 0) {
        const symCount = sub.filter((r) => r.anySymptom).length;
        const pct = (symCount / sub.length) * 100;
        if (pct > highestPct) {
          highestPct = pct;
          highestCls = { cls, symCount, total: sub.length, pct: pct.toFixed(1) };
        }
      }
    });

    const items = [
      `<span class="ticker-item"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><strong>ACCOUNTABILITY:</strong> ${allStats.total} Cadets Screened &bull; ${allStats.none} Fit (${allStats.nonePct}%)</span>`,
      feverCadets.length > 0
        ? `<span class="ticker-item text-rose-600"><span class="w-1.5 h-1.5 rounded-full bg-pastel-fever"></span><strong>FEBRILE ALERT:</strong> ${escapeHtml(feverCadets.join(', '))}</span>`
        : `<span class="ticker-item text-emerald-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><strong>FEVER WATCH:</strong> 0 Febrile Cases Reported</span>`,
      fluCadets.length > 0
        ? `<span class="ticker-item text-pastel-purple"><span class="w-1.5 h-1.5 rounded-full bg-pastel-purple"></span><strong>FLU COHORT (${fluCadets.length}):</strong> ${escapeHtml(fluCadets.join(', '))}</span>`
        : `<span class="ticker-item"><strong>FLU COHORT:</strong> 0 Cases</span>`,
      highestCls
        ? `<span class="ticker-item"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><strong>HIGHEST CLASS LOAD:</strong> ${highestCls.cls} (${highestCls.symCount}/${highestCls.total} symptomatic &bull; ${highestCls.pct}%)</span>`
        : '',
      `<span class="ticker-item"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span><strong>SYMPTOM TOTALS:</strong> Colds ${allStats.colds} &bull; Cough ${allStats.cough} &bull; Flu ${allStats.flu} &bull; Fever ${allStats.fever}</span>`
    ].filter(Boolean);

    const html = items.join('<span class="text-slate-300 px-2">|</span>');
    const container = document.getElementById('dynamicTickerContent');
    if (container) {
      container.innerHTML = `${html}<span class="text-slate-300 px-2">|</span>${html}`;
    }
  }

  // ---------------- RENDERING: CHART.JS ANALYTICS ----------------
  window.setChartMode = function (mode, btn) {
    state.chartMode = mode;
    document.querySelectorAll('.chart-mode-btn').forEach((b) => {
      b.classList.remove('pill-active');
      b.classList.add('text-slate-500');
    });
    if (btn) {
      btn.classList.add('pill-active');
      btn.classList.remove('text-slate-500');
    }
    renderAnalyticsChart();
  };

  function renderAnalyticsChart() {
    const canvas = document.getElementById('desktopTrendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (state.chartInstance) state.chartInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const tickColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? '#1E293B' : '#F1F5F9';

    const titleEl = document.getElementById('chartCardTitle');
    const descEl = document.getElementById('chartCardDesc');
    const legendEl = document.getElementById('chartLegendRow');

    const classes = ['1CL', '2CL', '3CL', '4CL'];

    if (state.chartMode === 'symptoms') {
      titleEl.textContent = 'Symptom Distribution by Class';
      descEl.textContent = 'Live counts of Colds, Cough, Flu, and Fever across 1CL, 2CL, 3CL, and 4CL from Google Sheets.';
      legendEl.innerHTML = `
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-cobalt"></span><span>Colds</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-amber"></span><span>Cough</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-purple"></span><span>Flu</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-fever"></span><span>Fever</span></div>
      `;

      const coldsData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.colds).length);
      const coughData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.cough).length);
      const fluData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.flu).length);
      const feverData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.fever).length);

      state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: classes.map((c) => `${c} (${state.records.filter((r) => r.classYr === c).length})`),
          datasets: [
            { label: 'Colds', data: coldsData, backgroundColor: '#3B82F6', borderRadius: 20, borderSkipped: false, barThickness: 12 },
            { label: 'Cough', data: coughData, backgroundColor: '#F59E0B', borderRadius: 20, borderSkipped: false, barThickness: 12 },
            { label: 'Flu', data: fluData, backgroundColor: '#8B5CF6', borderRadius: 20, borderSkipped: false, barThickness: 12 },
            { label: 'Fever', data: feverData, backgroundColor: '#FF4757', borderRadius: 20, borderSkipped: false, barThickness: 12 }
          ]
        },
        options: chartOptions(tickColor, gridColor)
      });
    } else if (state.chartMode === 'readiness') {
      titleEl.textContent = 'Fit vs Symptomatic Readiness';
      descEl.textContent = 'Mutually exclusive cadet headcount per class: Fit (None), Mild Only, and Acute (Flu/Fever).';
      legendEl.innerHTML = `
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-lime"></span><span>Fit (None)</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-cobalt"></span><span>Mild Only</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-fever"></span><span>Acute (Flu/Fever)</span></div>
      `;

      const fitData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.none).length);
      const mildData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.isMildOnly).length);
      const acuteData = classes.map((c) => state.records.filter((r) => r.classYr === c && r.isAcute).length);

      state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: classes,
          datasets: [
            { label: 'Fit (None)', data: fitData, backgroundColor: '#10B981', borderRadius: 20, borderSkipped: false, barThickness: 16 },
            { label: 'Mild Only', data: mildData, backgroundColor: '#3B82F6', borderRadius: 20, borderSkipped: false, barThickness: 16 },
            { label: 'Acute (Flu/Fever)', data: acuteData, backgroundColor: '#FF4757', borderRadius: 20, borderSkipped: false, barThickness: 16 }
          ]
        },
        options: chartOptions(tickColor, gridColor)
      });
    } else {
      titleEl.textContent = 'Observed Live Sync History';
      descEl.textContent = 'Timestamped readings captured automatically during live Google Sheet sync checks.';
      legendEl.innerHTML = `
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-lime"></span><span>Fit Cadets</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-coral"></span><span>Symptomatic</span></div>
        <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-pastel-fever"></span><span>Acute (Flu/Fever)</span></div>
      `;

      const hist = state.syncHistory.slice(-10);
      state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: hist.map((h) => h.label),
          datasets: [
            {
              label: 'Symptomatic',
              data: hist.map((h) => h.symptomatic),
              borderColor: '#8B5CF6',
              backgroundColor: 'rgba(139, 92, 246, 0.14)',
              fill: true,
              tension: 0.35,
              pointRadius: 4
            },
            {
              label: 'Acute (Flu/Fever)',
              data: hist.map((h) => h.acute),
              borderColor: '#FF4757',
              backgroundColor: 'rgba(255, 71, 87, 0.1)',
              fill: false,
              tension: 0.35,
              pointRadius: 4
            }
          ]
        },
        options: chartOptions(tickColor, gridColor)
      });
    }
  }

  function chartOptions(tickColor, gridColor) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E1B4B',
          padding: 12,
          cornerRadius: 14,
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
          boxPadding: 4
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: tickColor, precision: 0, font: { family: 'JetBrains Mono', size: 10 } },
          border: { display: false }
        }
      }
    };
  }

  // ---------------- RENDERING: UNIT BREAKDOWN & COMBO MATRIX ----------------
  window.setUnitBreakdownMode = function (mode, btn) {
    state.unitBreakdownMode = mode;
    document.querySelectorAll('.unit-mode-btn').forEach((b) => {
      b.classList.remove('pill-active');
      b.classList.add('text-slate-500');
    });
    if (btn) {
      btn.classList.add('pill-active');
      btn.classList.remove('text-slate-500');
    }
    renderUnitLoadBars();
  };

  function renderUnitLoadBars() {
    const container = document.getElementById('unitLoadBarsContainer');
    const titleEl = document.getElementById('unitLoadTitle');
    const descEl = document.getElementById('unitLoadDesc');
    if (!container) return;

    const groups = state.unitBreakdownMode === 'class'
      ? [
          { key: '1CL', label: '1CL • First Class' },
          { key: '2CL', label: '2CL • Second Class' },
          { key: '3CL', label: '3CL • Third Class' },
          { key: '4CL', label: '4CL • Fourth Class' }
        ]
      : [
          { key: '1st Plt', label: 'Alfa • 1st Platoon' },
          { key: '2nd Plt', label: 'Alfa • 2nd Platoon' },
          { key: '3rd Plt', label: 'Alfa • 3rd Platoon' },
          { key: '4th Plt', label: 'Alfa • 4th Platoon' }
        ];

    titleEl.textContent = state.unitBreakdownMode === 'class' ? 'Class Symptom Load' : 'Platoon Symptom Load';
    descEl.textContent = state.unitBreakdownMode === 'class'
      ? 'Symptomatic cadets vs Fit cadets across each PMA class.'
      : 'Symptomatic distribution across Alfa Company platoons.';

    container.innerHTML = groups.map((g) => {
      const subset = state.records.filter((r) =>
        state.unitBreakdownMode === 'class' ? r.classYr === g.key : r.platoon === g.key
      );
      const total = subset.length || 1;
      const fit = subset.filter((r) => r.none).length;
      const mild = subset.filter((r) => r.isMildOnly).length;
      const acute = subset.filter((r) => r.isAcute).length;
      const sym = mild + acute;
      const symPct = Math.round((sym / total) * 100);

      const fitW = (fit / total) * 100;
      const mildW = (mild / total) * 100;
      const acuteW = (acute / total) * 100;

      const clickAttr = state.unitBreakdownMode === 'class'
        ? `onclick="setClassScope('${g.key}')"`
        : `onclick="filterByPlatoon('${g.key}')"`;

      return `
        <div ${clickAttr} class="cursor-pointer group">
          <div class="flex justify-between items-center text-xs mb-1.5">
            <span class="font-bold text-slate-700 group-hover:text-pastel-purple transition">${escapeHtml(g.label)}</span>
            <span class="font-mono text-[11px] font-semibold text-slate-500">${sym} / ${subset.length} (${symPct}%)</span>
          </div>
          <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div class="bg-pastel-lime h-full transition-all duration-500" style="width: ${fitW.toFixed(1)}%" title="Fit: ${fit}"></div>
            <div class="bg-pastel-cobalt h-full transition-all duration-500" style="width: ${mildW.toFixed(1)}%" title="Mild: ${mild}"></div>
            <div class="bg-pastel-fever h-full transition-all duration-500" style="width: ${acuteW.toFixed(1)}%" title="Acute (Flu/Fever): ${acute}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderComboMatrix() {
    const grid = document.getElementById('comboMatrixGrid');
    if (!grid) return;

    const scoped = getScopedRecords().filter((r) => r.anySymptom);
    const counts = new Map();
    scoped.forEach((r) => {
      counts.set(r.comboKey, (counts.get(r.comboKey) || 0) + 1);
    });

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-6 text-center text-xs text-slate-400">
          No symptomatic combinations reported in this scope.
        </div>
      `;
      return;
    }

    grid.innerHTML = sorted.map(([combo, count]) => {
      const hasFever = combo.includes('Fever');
      const hasFlu = combo.includes('Flu');
      const toneClass = hasFever
        ? 'border-rose-200 bg-rose-50/70 text-pastel-fever'
        : hasFlu
          ? 'border-purple-200 bg-purple-50/70 text-pastel-purple'
          : 'border-blue-100 bg-pastel-subtle text-slate-700';

      const isActive = state.rosterFilter === `combo:${combo}`;

      return `
        <button onclick="setRosterFilter('combo:${escapeHtml(combo)}')" class="text-left p-3.5 rounded-2xl border transition hover:shadow-soft-card ${toneClass} ${isActive ? 'ring-2 ring-pastel-purple' : ''}">
          <div class="text-[11px] font-bold truncate" title="${escapeHtml(combo)}">${escapeHtml(combo)}</div>
          <div class="flex items-baseline justify-between mt-1.5">
            <span class="text-xl font-extrabold font-mono-tabular">${count}</span>
            <span class="text-[10px] font-semibold opacity-75">cadets</span>
          </div>
        </button>
      `;
    }).join('');
  }

  function addActivityEvent(text, tone = 'info') {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.activityLog.unshift({ time: timeStr, text, tone });
    if (state.activityLog.length > 30) state.activityLog.length = 30;
    renderActivityFeed();
  }

  function renderActivityFeed() {
    const feed = document.getElementById('liveActivityFeed');
    if (!feed) return;
    if (state.activityLog.length === 0) {
      feed.innerHTML = `<div class="text-slate-400 py-4 text-center">Waiting for live Google Sheet telemetry...</div>`;
      return;
    }

    feed.innerHTML = state.activityLog.map((ev) => {
      const dotColor = ev.tone === 'alert'
        ? 'bg-pastel-fever'
        : ev.tone === 'change'
          ? 'bg-pastel-purple'
          : 'bg-emerald-500';
      return `
        <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-pastel-subtle border border-pastel-border/60">
          <span class="w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0"></span>
          <div class="min-w-0 flex-1">
            <div class="text-slate-700 font-semibold leading-snug">${escapeHtml(ev.text)}</div>
          </div>
          <span class="text-[10px] font-mono text-slate-400 shrink-0">${escapeHtml(ev.time)}</span>
        </div>
      `;
    }).join('');
  }

  // ---------------- RENDERING: CADET ROSTER TABLE ----------------
  function renderCadetTable() {
    const tbody = document.getElementById('cadetTableBody');
    if (!tbody) return;

    const search = (document.getElementById('tableFilterInput')?.value || '').toLowerCase().trim();
    const classDrop = document.getElementById('classDropdown')?.value || 'all';
    const platoonDrop = document.getElementById('platoonDropdown')?.value || 'all';
    const sortBy = document.getElementById('sortDropdown')?.value || 'severity';

    const effectiveClass = state.classScope !== 'all' ? state.classScope : classDrop;

    let filtered = state.records.filter((r) => {
      if (effectiveClass !== 'all' && r.classYr !== effectiveClass) return false;
      if (platoonDrop !== 'all' && r.platoon !== platoonDrop) return false;

      if (state.rosterFilter === 'none' && !r.none) return false;
      else if (state.rosterFilter === 'symptomatic' && !r.anySymptom) return false;
      else if (state.rosterFilter === 'mild' && !r.isMildOnly) return false;
      else if (state.rosterFilter === 'acute' && !r.isAcute) return false;
      else if (state.rosterFilter === 'colds' && !r.colds) return false;
      else if (state.rosterFilter === 'cough' && !r.cough) return false;
      else if (state.rosterFilter === 'flu' && !r.flu) return false;
      else if (state.rosterFilter === 'fever' && !r.fever) return false;
      else if (state.rosterFilter.startsWith('combo:')) {
        const targetCombo = state.rosterFilter.slice(6);
        if (r.comboKey !== targetCombo) return false;
      }

      if (search) {
        const hay = `${r.cadet} ${r.fullName} ${r.sn} ${r.classYr} ${r.platoon} ${r.comboKey}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    if (sortBy === 'severity') {
      filtered.sort((a, b) => (b.severityScore - a.severityScore) || (a.order - b.order));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.cadet.localeCompare(b.cadet));
    } else if (sortBy === 'class') {
      filtered.sort((a, b) => a.classYr.localeCompare(b.classYr) || a.cadet.localeCompare(b.cadet));
    } else {
      filtered.sort((a, b) => a.order - b.order);
    }

    document.getElementById('filteredCountBadge').textContent =
      `Showing ${filtered.length} of ${state.records.length} Cadets`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-file-medical text-3xl mb-2 text-pastel-purple/40 block"></i>
            <p class="text-xs font-semibold">No cadet records matched the active health or search filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    const flagStyles = {
      Colds: 'bg-blue-50 text-pastel-cobalt border border-blue-200',
      Cough: 'bg-amber-50 text-pastel-amber border border-amber-200',
      Flu: 'bg-purple-50 text-pastel-purple border border-purple-200',
      Fever: 'bg-rose-50 text-pastel-fever border border-rose-200 font-extrabold'
    };

    const flagIcons = {
      Colds: 'fa-head-side-cough',
      Cough: 'fa-lungs',
      Flu: 'fa-virus',
      Fever: 'fa-fire'
    };

    const triageMeta = {
      fever: { label: 'Priority Febrile', cls: 'bg-rose-50 text-pastel-fever border border-rose-200' },
      flu: { label: 'Acute / Flu Cohort', cls: 'bg-purple-50 text-pastel-purple border border-purple-200' },
      dual: { label: 'Dual URI Watch', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
      mild: { label: 'Mild Observation', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
      fit: { label: 'Fit for Duty', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      unmarked: { label: 'Unmarked', cls: 'bg-slate-100 text-slate-500 border border-slate-200' }
    };

    tbody.innerHTML = filtered.map((r, i) => {
      const initials = escapeHtml(r.cadet.slice(0, 2).toUpperCase());
      const flagsHtml = r.activeFlags.length > 0
        ? r.activeFlags.map((f) => `<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl ${flagStyles[f]}"><i class="fa-solid ${flagIcons[f] || 'fa-notes-medical'} text-xs"></i> ${escapeHtml(f)}</span>`).join(' ')
        : (r.none
            ? `<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"><i class="fa-solid fa-shield-heart text-xs"></i> None (Fit)</span>`
            : `<span class="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500">Unmarked</span>`);

      const tm = triageMeta[r.triage] || triageMeta.unmarked;
      const avatarBg = r.fever
        ? 'bg-rose-100 text-pastel-fever'
        : r.flu
          ? 'bg-purple-100 text-pastel-purple'
          : r.anySymptom
            ? 'bg-blue-100 text-pastel-cobalt'
            : 'bg-pastel-lavender text-pastel-purple';

      return `
        <tr class="hover:bg-pastel-lavender/20 transition group">
          <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${i + 1}</td>

          <td class="py-3 px-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl ${avatarBg} font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                ${initials}
              </div>
              <div class="min-w-0">
                <div class="font-extrabold text-slate-900 group-hover:text-pastel-purple transition text-xs truncate">${escapeHtml(r.cadet)}</div>
                <div class="text-[10px] font-mono text-slate-400 truncate">
                  ${r.fullName ? `${escapeHtml(r.fullName)}${r.sn ? ` &bull; ${escapeHtml(r.sn)}` : ''}` : `Sheet Row #${r.rowNumber}`}
                </div>
              </div>
            </div>
          </td>

          <td class="py-3 px-4">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-lg bg-pastel-subtle border border-pastel-border font-mono font-bold text-[11px] text-slate-700">${escapeHtml(r.classYr)}</span>
              <span class="text-[11px] text-slate-500 font-medium">${escapeHtml(r.platoon)}</span>
            </div>
          </td>

          <td class="py-3 px-4">
            <div class="flex flex-wrap items-center gap-1.5">${flagsHtml}</div>
          </td>

          <td class="py-3 px-4">
            <span class="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-xl ${tm.cls}">
              ${tm.label}
            </span>
          </td>

          <td class="py-3 px-4 font-mono text-[10px]">
            ${r.isLocalOverride
              ? '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">Local Override</span>'
              : '<span class="text-emerald-600 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Live Sheet</span>'}
          </td>

          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-2">
              <button onclick="editCadetByKey('${escapeHtml(r.key)}')" class="px-3 py-1.5 bg-pastel-subtle hover:bg-pastel-lavender/60 text-pastel-purple rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5">
                <i class="fa-solid fa-pen text-xs"></i>
                <span>Update</span>
              </button>
              <button onclick="quickInspect('${escapeHtml(r.key)}')" class="w-9 h-9 rounded-xl bg-pastel-subtle hover:bg-slate-200 text-slate-500 flex items-center justify-center transition" title="Inspect Details">
                <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  window.renderCadetTable = renderCadetTable;

  // ---------------- INTERACTIVE FILTERS ----------------
  window.setClassScope = function (scope, btn) {
    state.classScope = scope;
    document.querySelectorAll('.class-scope-btn').forEach((b) => {
      b.classList.remove('pill-active');
      b.classList.add('text-slate-600');
      if (b.textContent.trim().toUpperCase() === scope.toUpperCase()) {
        b.classList.add('pill-active');
        b.classList.remove('text-slate-600');
      }
    });
    const classDropdown = document.getElementById('classDropdown');
    if (classDropdown) classDropdown.value = scope;

    renderAllViews();
  };

  window.onClassDropdownChange = function () {
    const val = document.getElementById('classDropdown')?.value || 'all';
    window.setClassScope(val);
  };

  window.filterByPlatoon = function (plt) {
    const drop = document.getElementById('platoonDropdown');
    if (drop) drop.value = plt;
    renderCadetTable();
    document.getElementById('rosterSection')?.scrollIntoView({ behavior: 'smooth' });
  };

  window.setRosterFilter = function (filterKey) {
    state.rosterFilter = filterKey;
    playSoftChime(580, 'sine', 0.05);

    document.querySelectorAll('.filter-tab-btn').forEach((btn) => {
      btn.classList.remove('pill-active');
      btn.classList.add('bg-pastel-subtle', 'text-slate-600');
    });

    const idMap = {
      all: 'btnFilterAll',
      none: 'btnFilterNone',
      symptomatic: 'btnFilterSymptomatic',
      colds: 'btnFilterColds',
      cough: 'btnFilterCough',
      flu: 'btnFilterFlu',
      fever: 'btnFilterFever',
      acute: 'btnFilterAcute'
    };
    const activeBtn = document.getElementById(idMap[filterKey]);
    if (activeBtn) {
      activeBtn.classList.add('pill-active');
      activeBtn.classList.remove('bg-pastel-subtle', 'text-slate-600');
    }

    renderComboMatrix();
    renderCadetTable();
  };

  window.filterAcuteAlerts = function (btnEl) {
    if (btnEl) {
      document.querySelectorAll('.side-nav-btn').forEach((b) => b.classList.remove('nav-active'));
      btnEl.classList.add('nav-active');
    }
    window.setClassScope('all');
    window.setRosterFilter('acute');
    document.getElementById('rosterSection')?.scrollIntoView({ behavior: 'smooth' });
    closeMobileSidebar();
    showToast('Acute Isolation Filter', 'Showing Fever and Flu cohort cadets.', 'alert');
  };

  window.handleGlobalSearch = function (val) {
    const tableInput = document.getElementById('tableFilterInput');
    if (tableInput) tableInput.value = val;
    renderCadetTable();
  };

  // ---------------- MODAL: LOG / UPDATE CADET ----------------
  function getWritebackUrl() {
    const stored = (localStorage.getItem(STORAGE_KEYS.appsScriptUrl) || '').trim();
    return stored || (config.appsScriptWebAppUrl || '').trim();
  }

  function updateModalWritebackBanner() {
    const banner = document.getElementById('modalWritebackText');
    const url = getWritebackUrl();
    if (url) {
      banner.innerHTML = '<strong>Two-Way Google Sheet Sync Active:</strong> Saving will write directly to your live Google Sheet and refresh all connected viewers.';
    } else if (window.location.protocol !== 'file:') {
      banner.innerHTML = '<strong>Live Read Sync Active:</strong> Saving updates this dashboard immediately and calls <code>/api/update</code> if configured on Vercel. <button type="button" onclick="closeLogModal(); openSheetSettingsModal();" class="text-pastel-purple font-bold underline ml-1">Setup direct write-back</button>';
    } else {
      banner.innerHTML = '<strong>Local Preview Mode:</strong> Changes update your browser view. Connect an Apps Script Web App URL in <button type="button" onclick="closeLogModal(); openSheetSettingsModal();" class="text-pastel-purple font-bold underline">Sheet Sync Setup</button> to push edits into Google Sheets.';
    }
  }

  window.openLogModal = function (cadetRecord = null) {
    playSoftChime(660, 'sine', 0.07);
    const modal = document.getElementById('logSymptomModal');
    document.getElementById('cadetForm').reset();

    if (cadetRecord) {
      document.getElementById('modalTitle').textContent = `Update: ${cadetRecord.classYr} ${cadetRecord.cadet}`;
      document.getElementById('formOriginalKey').value = cadetRecord.key;
      document.getElementById('formOriginalClass').value = cadetRecord.classYr;
      document.getElementById('formOriginalCadet').value = cadetRecord.cadet;
      document.getElementById('formClass').value = cadetRecord.classYr;
      document.getElementById('formCadet').value = cadetRecord.cadet;

      document.getElementById('chkColds').checked = cadetRecord.colds;
      document.getElementById('chkCough').checked = cadetRecord.cough;
      document.getElementById('chkFlu').checked = cadetRecord.flu;
      document.getElementById('chkFever').checked = cadetRecord.fever;
      document.getElementById('chkNone').checked = cadetRecord.none;
    } else {
      document.getElementById('modalTitle').textContent = 'Log Cadet Health Report';
      document.getElementById('formOriginalKey').value = '';
      document.getElementById('formOriginalClass').value = '';
      document.getElementById('formOriginalCadet').value = '';
      document.getElementById('formClass').value = state.classScope !== 'all' ? state.classScope : '1CL';
      document.getElementById('formCadet').value = '';
      document.getElementById('chkColds').checked = false;
      document.getElementById('chkCough').checked = false;
      document.getElementById('chkFlu').checked = false;
      document.getElementById('chkFever').checked = false;
      document.getElementById('chkNone').checked = true;
    }

    updateModalWritebackBanner();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  window.closeLogModal = function () {
    const modal = document.getElementById('logSymptomModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  window.onModalCheckboxChange = function (source) {
    const colds = document.getElementById('chkColds');
    const cough = document.getElementById('chkCough');
    const flu = document.getElementById('chkFlu');
    const fever = document.getElementById('chkFever');
    const none = document.getElementById('chkNone');

    if (source === 'none' && none.checked) {
      colds.checked = false;
      cough.checked = false;
      flu.checked = false;
      fever.checked = false;
    } else if (source === 'symptom') {
      const any = colds.checked || cough.checked || flu.checked || fever.checked;
      none.checked = !any;
    }
  };

  window.editCadetByKey = function (key) {
    const rec = state.records.find((r) => r.key === key);
    if (rec) window.openLogModal(rec);
  };

  window.quickInspect = function (key) {
    const r = state.records.find((x) => x.key === key);
    if (!r) return;
    const details = `${r.fullName || r.cadet} (${r.classYr} • ${r.platoon}) — ${r.comboKey}`;
    showToast(`${r.classYr} ${r.cadet}`, details);
  };

  window.saveCadetReport = async function (e) {
    e.preventDefault();
    const saveBtn = document.getElementById('modalSaveBtn');
    const origKey = document.getElementById('formOriginalKey').value;
    const origClass = document.getElementById('formOriginalClass').value;
    const origCadet = document.getElementById('formOriginalCadet').value;

    const classYr = document.getElementById('formClass').value.trim().toUpperCase();
    const cadet = document.getElementById('formCadet').value.trim().toUpperCase();
    const colds = document.getElementById('chkColds').checked;
    const cough = document.getElementById('chkCough').checked;
    const flu = document.getElementById('chkFlu').checked;
    const fever = document.getElementById('chkFever').checked;
    const none = !colds && !cough && !flu && !fever ? true : document.getElementById('chkNone').checked;

    const payload = {
      originalClassYr: origClass || classYr,
      originalCadet: origCadet || cadet,
      classYr,
      cadet,
      colds,
      cough,
      flu,
      fever,
      none
    };

    const newKey = `${classYr}|${cadet}`;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const writeUrl = getWritebackUrl();
      const result = await syncEngine.pushCadetUpdate(payload, writeUrl);

      if (result.ok) {
        delete state.localOverrides[origKey || newKey];
        delete state.localOverrides[newKey];
        localStorage.setItem(STORAGE_KEYS.localOverrides, JSON.stringify(state.localOverrides));
        window.closeLogModal();
        addActivityEvent(`Pushed update to Google Sheet: ${classYr} ${cadet}`, 'change');
        showToast('Google Sheet Updated', `${classYr} ${cadet} saved directly to live sheet.`, 'success');
        await window.performLiveSync(false);
      } else {
        // Store locally as preview override so it persists across live polls until cleared or synced
        if (origKey && origKey !== newKey) delete state.localOverrides[origKey];
        state.localOverrides[newKey] = { classYr, cadet, colds, cough, flu, fever, none };
        localStorage.setItem(STORAGE_KEYS.localOverrides, JSON.stringify(state.localOverrides));
        state.records = getMergedRecords(state.rawSheetRows);
        window.closeLogModal();
        renderAllViews();
        addActivityEvent(`Local preview edit: ${classYr} ${cadet} (Sheet write-back not configured)`, 'change');
        showToast('Saved in Local Preview', 'Connect Apps Script or Vercel API in Sheet Sync Setup to write to Google Sheets.');
      }
    } catch (err) {
      showToast('Update Error', err.message || 'Could not save to Google Sheet.', 'alert');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Health Report';
    }
  };

  // ---------------- MODAL: LIVE SHEET SETTINGS ----------------
  window.openSheetSettingsModal = function () {
    const modal = document.getElementById('sheetSettingsModal');
    const urlInput = document.getElementById('appsScriptUrlInput');
    const intervalSel = document.getElementById('pollIntervalSelect');
    const statusPill = document.getElementById('writebackStatusPill');

    if (urlInput) urlInput.value = localStorage.getItem(STORAGE_KEYS.appsScriptUrl) || '';
    if (intervalSel) intervalSel.value = String(state.pollIntervalMs);

    const hasWrite = Boolean(getWritebackUrl());
    if (statusPill) {
      statusPill.textContent = hasWrite ? 'TWO-WAY ACTIVE' : 'LIVE READ-ONLY';
      statusPill.className = hasWrite
        ? 'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 shrink-0'
        : 'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 shrink-0';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    closeMobileSidebar();
  };

  window.closeSheetSettingsModal = function () {
    const modal = document.getElementById('sheetSettingsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  window.saveAppsScriptUrl = function () {
    const val = (document.getElementById('appsScriptUrlInput')?.value || '').trim();
    if (val && !val.startsWith('https://script.google.com/')) {
      showToast('Invalid URL', 'Apps Script Web App URL must start with https://script.google.com/', 'alert');
      return;
    }
    if (val) localStorage.setItem(STORAGE_KEYS.appsScriptUrl, val);
    else localStorage.removeItem(STORAGE_KEYS.appsScriptUrl);
    showToast('Settings Saved', val ? 'Two-way Google Sheet write-back enabled!' : 'Cleared Apps Script URL.', 'success');
    window.openSheetSettingsModal();
  };

  window.clearAppsScriptUrl = function () {
    localStorage.removeItem(STORAGE_KEYS.appsScriptUrl);
    const input = document.getElementById('appsScriptUrlInput');
    if (input) input.value = '';
    showToast('Cleared', 'Switched back to live read-only mode.');
    window.openSheetSettingsModal();
  };

  window.copyAppsScriptSnippet = async function () {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      showToast('Copied Code.gs', 'Paste into Extensions → Apps Script in your Google Sheet.', 'success');
    } catch (_) {
      showToast('Copy Unavailable', 'Open google-apps-script/Code.gs in the project folder.');
    }
  };

  window.changePollInterval = function (msStr) {
    const ms = Number(msStr);
    state.pollIntervalMs = Number.isFinite(ms) && ms >= 0 ? ms : 10000;
    localStorage.setItem(STORAGE_KEYS.pollMs, String(state.pollIntervalMs));
    startAutoSyncLoop();
    const badge = document.getElementById('sideSyncBadge');
    if (badge) badge.textContent = state.pollIntervalMs > 0 ? `${Math.round(state.pollIntervalMs / 1000)}s` : 'OFF';
    showToast('Sync Interval Updated', state.pollIntervalMs > 0 ? `Polling Google Sheet every ${state.pollIntervalMs / 1000}s.` : 'Automatic polling paused.');
  };

  // ---------------- REAL-TIME SYNC LOOP ----------------
  function updateCountdownUI() {
    const el = document.getElementById('autoSyncCountdown');
    if (!el) return;
    if (state.pollIntervalMs <= 0) {
      el.textContent = 'PAUSED';
    } else {
      el.textContent = `${state.countdownSec}s`;
    }
  }

  function startAutoSyncLoop() {
    if (state.pollTimerId) clearInterval(state.pollTimerId);
    if (state.pollIntervalMs <= 0) {
      updateCountdownUI();
      return;
    }

    state.countdownSec = Math.max(1, Math.round(state.pollIntervalMs / 1000));
    updateCountdownUI();

    state.pollTimerId = setInterval(() => {
      if (document.hidden) return;
      state.countdownSec--;
      if (state.countdownSec <= 0) {
        state.countdownSec = Math.max(1, Math.round(state.pollIntervalMs / 1000));
        updateCountdownUI();
        window.performLiveSync(false);
      } else {
        updateCountdownUI();
      }
    }, 1000);
  }

  function recordSyncHistoryPoint(records) {
    const stats = computeStats(records);
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const last = state.syncHistory[state.syncHistory.length - 1];
    // Append only if values changed or > 2 minutes elapsed
    if (!last || last.symptomatic !== stats.symptomatic || last.acute !== stats.acute || (Date.now() - last.ts > 120000)) {
      state.syncHistory.push({
        ts: Date.now(),
        label: nowLabel,
        fit: stats.none,
        symptomatic: stats.symptomatic,
        acute: stats.acute
      });
      if (state.syncHistory.length > 24) state.syncHistory.shift();
      try {
        localStorage.setItem(STORAGE_KEYS.syncHistory, JSON.stringify(state.syncHistory));
      } catch (_) {}
    }
  }

  window.performLiveSync = async function (isManual = false) {
    if (state.isSyncing) return;
    state.isSyncing = true;

    const icon = document.getElementById('manualSyncIcon');
    if (icon) icon.classList.add('animate-spin');

    if (isManual) {
      state.countdownSec = Math.max(1, Math.round(state.pollIntervalMs / 1000));
      updateCountdownUI();
    }

    try {
      const result = await syncEngine.fetchLiveRecords(config.sheetId, config.gid);
      const prevRecords = state.records;
      state.rawSheetRows = result.records;

      // Clear local overrides if sheet now matches them
      Object.keys(state.localOverrides).forEach((k) => {
        const sheetRow = result.records.find(
          (r) => `${r.classYr}|${r.cadet.toUpperCase()}` === k
        );
        const ov = state.localOverrides[k];
        if (sheetRow &&
            Boolean(sheetRow.colds) === Boolean(ov.colds) &&
            Boolean(sheetRow.cough) === Boolean(ov.cough) &&
            Boolean(sheetRow.flu) === Boolean(ov.flu) &&
            Boolean(sheetRow.fever) === Boolean(ov.fever)) {
          delete state.localOverrides[k];
          localStorage.setItem(STORAGE_KEYS.localOverrides, JSON.stringify(state.localOverrides));
        }
      });

      const incomingEnriched = getMergedRecords(state.rawSheetRows);

      const diffs = state.hasLiveSyncSucceeded
        ? window.HealthSheetSync.diffRecords(prevRecords, incomingEnriched)
        : [];

      state.records = incomingEnriched;
      state.hasLiveSyncSucceeded = true;
      state.lastSyncedAt = new Date();
      state.lastTransport = result.transport;

      try {
        localStorage.setItem(STORAGE_KEYS.cachedRows, JSON.stringify(result.records));
      } catch (_) {}

      recordSyncHistoryPoint(state.records);
      renderAllViews();

      const timeStr = state.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('lastSyncedClock').textContent = `Updated ${timeStr}`;
      document.getElementById('sidebarSyncStatus').textContent = `Live • ${timeStr}`;
      document.getElementById('transportLabel').textContent = `Transport: ${result.transport}`;
      document.getElementById('liveSourceBadge').innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 live-beacon"></span>
        <span>Live Synced (${timeStr})</span>
      `;

      const overrideCount = Object.keys(state.localOverrides).length;
      document.getElementById('lastDiffCountLabel').textContent = `${overrideCount} local override${overrideCount === 1 ? '' : 's'}`;

      if (diffs.length > 0) {
        const hasSevere = diffs.some((d) => d.isSevere);
        diffs.slice(0, 5).forEach((d) => {
          addActivityEvent(d.summary, d.isSevere ? 'alert' : 'change');
        });
        if (hasSevere) playSoftChime(880, 'triangle', 0.14);
        else playSoftChime(660, 'sine', 0.08);

        showToast(
          `⚡ Google Sheet Updated (${diffs.length})`,
          diffs.map((d) => d.summary).slice(0, 2).join(' • '),
          hasSevere ? 'alert' : 'success'
        );
      } else if (isManual) {
        addActivityEvent(`Manual sync verified (${state.records.length} cadets up to date)`, 'info');
        showToast('Google Sheet Verified', `All ${state.records.length} cadet records are live and up to date.`);
      } else if (state.activityLog.length === 0) {
        addActivityEvent(`Connected live to Google Sheet (${state.records.length} cadets loaded)`, 'info');
      }
    } catch (err) {
      console.warn('Live sync error:', err);
      document.getElementById('transportLabel').textContent = 'Transport: Snapshot / Offline fallback';
      if (isManual) {
        showToast('Sync Notice', 'Unable to reach Google Sheets right now. Showing latest snapshot.', 'alert');
      }
    } finally {
      state.isSyncing = false;
      if (icon) icon.classList.remove('animate-spin');
    }
  };

  // ---------------- CSV EXPORT ----------------
  window.downloadCSVReport = function () {
    let csv = 'Class,Cadet,Colds,Cough,Flu,Fever,None,Platoon,SerialNo,TriageTier\n';
    state.records.forEach((r) => {
      csv += `"${r.classYr}","${r.cadet}",${r.colds ? 'TRUE' : 'FALSE'},${r.cough ? 'TRUE' : 'FALSE'},${r.flu ? 'TRUE' : 'FALSE'},${r.fever ? 'TRUE' : 'FALSE'},${r.none ? 'TRUE' : 'FALSE'},"${r.platoon}","${r.sn}","${r.triage}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Alfa_Company_Health_Monitoring_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('CSV Exported', `Downloaded ${state.records.length} cadet health rows.`);
  };

  // ---------------- RENDER ALL & BOOTSTRAP ----------------
  function renderAllViews() {
    renderMetricsAndGauge();
    renderMarqueeTicker();
    renderAnalyticsChart();
    renderUnitLoadBars();
    renderComboMatrix();
    renderCadetTable();
  }

  function init() {
    applyDarkModeUI(localStorage.getItem(STORAGE_KEYS.theme) === 'dark');

    try {
      const savedOverrides = localStorage.getItem(STORAGE_KEYS.localOverrides);
      if (savedOverrides) state.localOverrides = JSON.parse(savedOverrides) || {};
    } catch (_) {}

    try {
      const savedHist = localStorage.getItem(STORAGE_KEYS.syncHistory);
      if (savedHist) state.syncHistory = JSON.parse(savedHist) || [];
    } catch (_) {}

    // Instant first paint from cached live rows or verified snapshot
    let initialRows = window.INITIAL_SHEET_SNAPSHOT || [];
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.cachedRows);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) initialRows = parsed;
      }
    } catch (_) {}

    state.rawSheetRows = initialRows;
    state.records = getMergedRecords(state.rawSheetRows);
    recordSyncHistoryPoint(state.records);
    renderAllViews();

    const badge = document.getElementById('sideSyncBadge');
    if (badge) badge.textContent = state.pollIntervalMs > 0 ? `${Math.round(state.pollIntervalMs / 1000)}s` : 'OFF';

    // Immediately pull live Google Sheet data & start auto-sync loop
    window.performLiveSync(false);
    startAutoSyncLoop();

    // Sync immediately whenever user switches back to this tab
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        window.performLiveSync(false);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeLogModal();
        window.closeSheetSettingsModal();
        window.closeMobileSidebar();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
