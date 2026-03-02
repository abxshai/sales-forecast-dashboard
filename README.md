# Sales Forecast Dashboard

AI-powered sales pipeline forecasting. Connect a Google Sheet or upload a CSV, edit rows inline, and get revenue projections powered by Groq.

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local (see below)
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Create `.env.local`:

```bash
GROQ_API_KEY=gsk_...
GOOGLE_SERVICE_ACCOUNT_B64=eyJ0eXBlIjoic...
```

### Getting your Groq API key
1. Go to https://console.groq.com
2. Create an API key → paste as `GROQ_API_KEY`

### Setting up Google Sheets (Service Account)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Sheets API** (APIs & Services → Enable APIs)
4. Go to **APIs & Services → Credentials → Create Credentials → Service Account**
5. Name it anything, click Done (no project roles needed)
6. Click the service account → **Keys** tab → **Add Key → JSON** → Download
7. Note the `client_email` in the downloaded JSON
8. **Share your Google Sheet** with that email as **Editor**
9. Encode the JSON as base64:
   ```bash
   cat service-account.json | base64 | tr -d '\n'
   ```
10. Paste the result as `GOOGLE_SERVICE_ACCOUNT_B64` in `.env.local`

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push to GitHub and import at vercel.com/new.

**Add env vars in Vercel dashboard:**
- `GROQ_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_B64` ← paste the base64 string (no quotes)

---

## CSV Format

Your CSV/Sheet should have a header row. The app auto-detects columns matching:

| Column | Detected names |
|--------|---------------|
| Lead Name | Name, Company, Contact, Account, Prospect |
| Deal Value | Value, Amount, Revenue, MRR, ARR, Deal Size |
| Status | Status, Stage, Phase |
| Interest Level | Interest, Priority, Engagement, Rating |
| Date | Date, Close Date, Created At |
| Notes | Notes, Comments, Description |

Any extra columns are displayed as-is in the table.

---

## Features

- Load from Google Sheet URL or CSV file upload
- Inline cell editing with save to Google Sheet
- 5 live KPI metrics (leads, pipeline value, conversion rate, interest, active leads)
- AI forecast: 30/60/90-day revenue projections, lead quality score, insights, recommendations
- Revenue projection chart + pipeline-by-status bar chart
- Top leads highlighted with indigo dot based on AI analysis
