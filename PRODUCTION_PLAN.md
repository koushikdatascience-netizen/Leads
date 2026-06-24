# Lead Platform Production Plan

## What is implemented now

- FastAPI platform with a simple web UI.
- Existing lead import from `leads.json`.
- Dedupe with a stable key using Maps URL, phone, or name/address.
- Filtered lead browsing by state, district, industry, and search text.
- CSV export for the current filtered view.
- State/district catalog powered by the existing scraper catalog.
- Scrape estimates before starting a job:
  - total searches
  - already saved leads
  - approximate new leads
  - approximate time
- Background scrape job endpoint with polling progress, logs, inserted count, and duplicate count.

Run locally:

```bash
pip install -r requirements.txt
python -m uvicorn platform_app.app:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

## Recommended production architecture

For a real multi-user product:

```text
Browser UI
  -> FastAPI API on Render
  -> Supabase Postgres for leads, users, jobs, billing, exports
  -> Queue/worker service for scraping jobs
  -> Licensed data-source adapters
```

Do not run long scraping jobs inside the web process in production. Use a worker:

- Render Web Service: FastAPI UI/API
- Render Background Worker: scraper workers
- Queue: Redis/Render Key Value, Supabase queue, or Postgres-backed queue
- DB: Supabase Postgres

## Render deployment

This repo includes `render.yaml` for a Render Blueprint:

- `lead-platform`: Python web service running FastAPI
- `lead-platform-db`: Render managed Postgres
- `DATABASE_URL`: injected from the managed Postgres connection string
- `APP_USERNAME` / `APP_PASSWORD`: prompted in Render and used for internal basic auth

Deploy flow:

1. Push this repo to GitHub/GitLab.
2. In Render, create a new Blueprint from the repo.
3. Set `APP_USERNAME` and `APP_PASSWORD` when Render prompts for them.
4. Deploy.
5. Open the Render service URL and sign in with the internal credentials.
6. Click `Import leads.json` once if `leads.json` is deployed with the repo.

Use Render managed Postgres for production data. Do not keep the only database inside
the service container because container filesystems are replaceable during deploys and
restarts. A persistent disk is better than ephemeral container storage, but Postgres is
the right choice for multi-user filtering, dedupe, exports, backups, and later scaling.

Render notes from official docs:

- Render Postgres is fully managed relational storage.
- Render services should use the database internal URL when in the same region.
- Paid Render Postgres databases provide point-in-time recovery and logical exports.
- Persistent disks exist, but they attach to a service instance and are not the same as
  a managed relational database.

## Supabase migration

Use `platform_app/schema.sql` as the starting point. Before launch:

- Convert SQLite types to Postgres where needed.
- Add `users`, `teams`, `subscriptions`, and `exports`.
- Add `owner_id` / `team_id` to `leads` and `scrape_jobs`.
- Enable RLS on all public tables.
- Use service-role credentials only on the backend/worker, never in browser JavaScript.

## Compliance reality

Google Maps scraping is not production-safe for a commercial lead platform.

Google Maps Platform terms prohibit exporting, extracting, or scraping Google Maps content for use outside the services, including copying/saving business names, addresses, and user reviews. If you sell or expose stored Google Maps-derived lead data, your account, infrastructure, or product can be suspended or face legal/business risk.

Safer production data-source options:

- Licensed business data providers.
- Direct business registry datasets where legally permitted.
- User-uploaded lead lists.
- Partner or opt-in merchant data.
- Official APIs only where their terms permit your exact storage and resale use case.

## Anti-blocking note

I will not recommend bypassing blocks or evading access controls as a production strategy. The correct way to make this reliable is:

- use permitted/licensed sources,
- respect rate limits,
- identify your app/API usage properly,
- use queues and retries,
- cache only what the source allows,
- maintain audit logs of source, consent/license, and import time.

## Next hardening tasks

- Add login/auth and role-based permissions.
- Replace temp SQLite with Supabase/Postgres.
- Move scraping to a real worker queue.
- Add XLSX import for files in `Leads/`.
- Add per-source compliance labels on every lead.
- Add export audit logs.
- Add job cancellation and retry.
- Add source adapters with explicit allowed fields and retention rules.
