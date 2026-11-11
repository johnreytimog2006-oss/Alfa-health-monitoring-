# Alfa Company Health Monitoring — Live Symptom Surveillance Portal

**Alfa Company Health Monitoring** is a real-time Alfa Company health monitoring and symptom surveillance dashboard built for zero-config static + serverless deployment on **Vercel** via **GitHub**.

It connects live to your Google Spreadsheet (`1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ`) and synchronizes automatically in real time as symptom checkboxes (`Colds`, `Cough`, `Flu`, `Fever`, `None`) are updated.

---

## Live Google Sheet Integration

- **Source Spreadsheet:** [Open Google Sheet](https://docs.google.com/spreadsheets/d/1-kohOuC0fSXLJVrGQNWSmyb00Ona2hBlMG-EaS3YuyQ/edit?usp=sharing)
- **Columns Tracked:** `Class` (`1CL`–`4CL`), `Cadet`, `Colds`, `Cough`, `Flu`, `Fever`, `None` (151 Alfa Company cadets, plus automatic handling of any newly added rows).
- **Real-Time Polling:** Automatically polls the Google Sheet every **10 seconds** (configurable to `5s`, `10s`, `30s`, `60s`, or `Manual` in **Live Sheet Sync Setup**), re-syncs immediately when the browser tab regains focus, and highlights exact cadet-level changes in the **Real-Time Sheet Updates** feed + ticker bar + audio chime.
- **Multi-Transport Resilience:**
  1. Direct Google Sheets GVIZ CSV (`no-store`)
  2. Vercel Serverless Proxy (`/api/sheet`)
  3. Google Sheets GVIZ JSONP (even works when opening `index.html` locally via `file://`)
  4. Verified snapshot & `localStorage` fallback if offline

---

## Optional: Enable Two-Way Write-Back (Website &rarr; Google Sheet)

Reading from the Google Sheet works live out of the box with zero credentials. If you also want edits made via the **Log Report / Update** modal on the website to write straight back into the Google Sheet in real time:

### Option A: 60-Second Google Apps Script (Easiest)
1. Open your Google Sheet &rarr; **Extensions &rarr; Apps Script**.
2. Paste the contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs) and save.
3. Click **Deploy &rarr; New deployment &rarr; Web app** (Execute as: **Me**, Who has access: **Anyone**).
4. Copy the generated `/exec` URL and either:
   - Paste it into **Live Sheet Sync Setup** inside the website UI, **or**
   - Add `APPS_SCRIPT_WEBHOOK_URL` in your Vercel project's **Environment Variables** so it works automatically across all devices.

### Option B: Google Service Account on Vercel
Set `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON key for a Service Account granted Editor access on the spreadsheet) in your Vercel project's **Environment Variables**. `/api/update` will authenticate directly with Google Sheets API v4.

---

## Local Preview

Open directly in your browser or run a quick local static server:

```bash
cd /Users/macbookairm315/.gemini/antigravity/scratch/ccafp-health
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

---

## Push to GitHub & Deploy to Vercel

### 1. Push to GitHub
```bash
cd /Users/macbookairm315/.gemini/antigravity/scratch/ccafp-health
git init
git add .
git commit -m "feat: initial release of Alfa Company Health Monitoring portal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ccafp-health.git
git push -u origin main
```

### 2. Launch on Vercel
1. Sign in to [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New &rarr; Project** and import your `ccafp-health` repository.
3. Keep **Framework Preset** as `Other` and **Root Directory** as `./` (no build command needed).
4. Click **Deploy** — Vercel will host the static dashboard plus `/api/sheet` and `/api/update` serverless functions automatically!
