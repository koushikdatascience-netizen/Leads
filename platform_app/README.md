# Lead Platform

FastAPI platform for stored lead browsing, filtering, estimates, scrape jobs, dedupe, and CSV export.

## Local run

```bash
pip install -r requirements.txt
uvicorn platform_app.app:app --reload --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000
```

First import existing JSON leads:

```text
Import leads.json
```

## Production notes

- Use `fast` mode for large state runs.
- Run scraping in a worker process, not the web request process, when deploying seriously.
- Render deploy uses managed Postgres through `DATABASE_URL`.
- Set `APP_USERNAME` and `APP_PASSWORD` for internal team access.
- Google Maps scraping/storage/resale is not a safe production source. Prefer licensed providers, first-party datasets, or explicitly permitted APIs.

## Render

Use the root `render.yaml` Blueprint. It creates:

- a FastAPI web service
- a Render managed Postgres database
- `DATABASE_URL` wired into the web service

Do not use the service container filesystem as the only database storage.
