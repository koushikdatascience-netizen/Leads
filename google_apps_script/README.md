# Google Sheets Internal Viewer

This Apps Script lets your internal team pull filtered leads from the private FastAPI lead platform into Google Sheets.

## Setup

1. Start the platform:

```bash
python -m uvicorn platform_app.app:app --host 0.0.0.0 --port 8000
```

2. Create a Google Sheet.
3. Go to Extensions > Apps Script.
4. Paste `Code.gs` into the script editor.
5. Update `LEAD_PLATFORM_BASE_URL` to your internal platform URL.
6. Save and reload the Google Sheet.
7. Use the `Lead Platform` menu.

## Config sheet

The script creates a `Config` tab:

```text
baseUrl   https://your-private-lead-platform
state     West Bengal
district  Kolkata
industry  alcohol leads
search
```

Leave fields blank to pull broader data.

## Important

If the platform runs only on your laptop at `127.0.0.1`, Google Sheets cannot reach it.
Use a private/internal URL, VPN, Cloudflare Tunnel with access controls, or deploy the API behind login.
