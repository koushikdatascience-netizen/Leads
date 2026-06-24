import csv
import base64
import hmac
import io
import json
import os
import re
import sqlite3
import subprocess
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parents[1]
APP_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(tempfile.gettempdir()) / "lead_platform"
DB_PATH = Path(os.getenv("LEADS_DB_PATH", DATA_DIR / "leads_platform.db"))
LEADS_JSON = ROOT / "leads.json"

DEFAULT_COUNTRY = "India"
DEFAULT_INDUSTRY = "alcohol leads"
AVG_SECONDS_PER_QUERY = float(os.getenv("AVG_SECONDS_PER_QUERY", "8"))
NODE_CMD = os.getenv("NODE_CMD", "node")
DATABASE_URL = os.getenv("DATABASE_URL", "")
APP_USERNAME = os.getenv("APP_USERNAME", "")
APP_PASSWORD = os.getenv("APP_PASSWORD", "")
STATE_ALIASES = {
  "bengal": "west bengal",
  "wb": "west bengal",
  "orissa": "odisha",
  "mp": "madhya pradesh",
  "m.p.": "madhya pradesh",
  "madhyapradesh": "madhya pradesh",
  "up": "uttar pradesh",
  "u.p.": "uttar pradesh",
  "uttarpradesh": "uttar pradesh",
}

app = FastAPI(title="Lead Platform", version="0.1.0")
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")

job_threads: dict[str, threading.Thread] = {}


class EstimateRequest(BaseModel):
  country: str = DEFAULT_COUNTRY
  states: list[str] = Field(default_factory=list)
  districts: list[str] = Field(default_factory=list)
  industries: list[str] = Field(default_factory=list)
  mode: str = "fast"


class ScrapeRequest(EstimateRequest):
  start: bool = True


def utc_now() -> str:
  return datetime.now(timezone.utc).isoformat()


def db() -> sqlite3.Connection:
  if DATABASE_URL:
    try:
      import psycopg
      from psycopg.rows import dict_row
    except ImportError as exc:
      raise RuntimeError("DATABASE_URL is set but psycopg is not installed") from exc
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

  conn = sqlite3.connect(DB_PATH, check_same_thread=False)
  conn.row_factory = sqlite3.Row
  return conn


def sql(statement: str) -> str:
  if DATABASE_URL:
    return statement.replace("?", "%s")
  return statement


def init_db() -> None:
  if not DATABASE_URL:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
  schema_file = "postgres_schema.sql" if DATABASE_URL else "schema.sql"
  with db() as conn:
    schema = (APP_DIR / schema_file).read_text(encoding="utf-8")
    if DATABASE_URL:
      conn.execute(schema)
    else:
      conn.executescript(schema)


def unauthorized() -> Response:
  return Response(
    "Authentication required",
    status_code=401,
    headers={"WWW-Authenticate": 'Basic realm="Lead Platform"'},
  )


@app.middleware("http")
async def basic_auth(request: Request, call_next):
  if not APP_USERNAME and not APP_PASSWORD:
    return await call_next(request)

  header = request.headers.get("authorization", "")
  if not header.lower().startswith("basic "):
    return unauthorized()

  try:
    decoded = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
    username, password = decoded.split(":", 1)
  except Exception:
    return unauthorized()

  valid_user = hmac.compare_digest(username, APP_USERNAME)
  valid_pass = hmac.compare_digest(password, APP_PASSWORD)
  if not (valid_user and valid_pass):
    return unauthorized()
  return await call_next(request)


def normalize(value: Any) -> str:
  return re.sub(r"\s+", " ", str(value or "").strip().lower())


def normalizeState(value: Any) -> str:
  state = normalize(value)
  return STATE_ALIASES.get(state, state)


def clean_phone(value: Any) -> str:
  return re.sub(r"\D", "", str(value or ""))


def lead_key(lead: dict[str, Any]) -> str:
  name = normalize(lead.get("name") or lead.get("business_name"))
  maps_url = str(lead.get("mapsUrl") or lead.get("maps_url") or "").strip()
  phone = clean_phone(lead.get("phone"))
  address = normalize(lead.get("address"))
  if maps_url:
    return f"{name}|{maps_url}"
  if phone:
    return f"{name}|{phone}"
  return f"{name}|{address}"


def load_catalog() -> dict[str, Any]:
  script = """
const g = require('./geo-scraper');
const states = g.getSupportedStates();
const catalog = { country: 'India', states: states.map(state => ({
  name: state,
  districts: g.getSupportedDistricts(state)
})) };
process.stdout.write(JSON.stringify(catalog));
"""
  result = subprocess.run(
    [NODE_CMD, "-e", script],
    cwd=ROOT,
    text=True,
    capture_output=True,
    timeout=20,
  )
  if result.returncode != 0:
    raise RuntimeError(result.stderr or result.stdout)
  return json.loads(result.stdout)


def selected_plan_items(payload: EstimateRequest) -> list[tuple[str, str, str]]:
  catalog = load_catalog()
  state_map = {normalize(item["name"]): item for item in catalog["states"]}
  selected_states = payload.states or [item["name"] for item in catalog["states"]]
  industries = [item.strip() for item in payload.industries if item.strip()] or [DEFAULT_INDUSTRY]
  requested_districts = {normalize(item) for item in payload.districts if item.strip()}
  items: list[tuple[str, str, str]] = []

  for state in selected_states:
    state_item = state_map.get(normalizeState(state))
    if not state_item:
      continue
    for district in state_item["districts"]:
      if requested_districts and normalize(district) not in requested_districts:
        continue
      for industry in industries:
        items.append((state_item["name"], district, industry))
  return items


def summarize_node_plan(state: str, district: str, industry: str, mode: str) -> dict[str, Any]:
  script = f"""
const g = require('./geo-scraper');
const summary = g.summarizeScrapePlan({json.dumps(state)}, {json.dumps(district)}, {json.dumps(industry)}, {{ mode: {json.dumps(mode)} }});
process.stdout.write(JSON.stringify(summary));
"""
  result = subprocess.run(
    [NODE_CMD, "-e", script],
    cwd=ROOT,
    text=True,
    capture_output=True,
    timeout=20,
  )
  if result.returncode != 0:
    raise RuntimeError(result.stderr or result.stdout)
  return json.loads(result.stdout)


def count_existing(items: list[tuple[str, str, str]]) -> int:
  if not items:
    return 0
  clauses = []
  params: list[Any] = []
  for state, district, industry in items:
    clauses.append("(lower(state)=? AND lower(district)=? AND (lower(industry)=? OR ?='alcohol leads'))")
    params.extend([normalize(state), normalize(district), normalize(industry), normalize(industry)])
  statement = "SELECT COUNT(*) AS total FROM leads WHERE " + " OR ".join(clauses)
  with db() as conn:
    return int(conn.execute(sql(statement), params).fetchone()["total"])


def estimate_payload(payload: EstimateRequest) -> dict[str, Any]:
  mode = "thorough" if normalize(payload.mode) in {"thorough", "grid"} else "fast"
  items = selected_plan_items(payload)
  plans = []
  total_queries = 0
  for state, district, industry in items:
    summary = summarize_node_plan(state, district, industry, mode)
    total_queries += int(summary["totalQueries"])
    plans.append({
      "state": state,
      "district": district,
      "industry": industry,
      "queries": int(summary["totalQueries"]),
      "mode": summary["mode"],
    })

  existing = count_existing(items)
  estimated_seconds = int(total_queries * AVG_SECONDS_PER_QUERY)
  # This is a planning estimate, not a promise. Existing data density improves it over time.
  estimated_leads = max(existing, int(total_queries * 2.5))
  return {
    "country": payload.country or DEFAULT_COUNTRY,
    "mode": mode,
    "district_count": len({f"{s}|{d}" for s, d, _ in items}),
    "industry_count": len({i for _, _, i in items}),
    "total_queries": total_queries,
    "existing_leads": existing,
    "estimated_leads": estimated_leads,
    "estimated_new_leads": max(estimated_leads - existing, 0),
    "estimated_seconds": estimated_seconds,
    "estimated_minutes": round(estimated_seconds / 60, 1),
    "plans": plans[:250],
    "truncated": len(plans) > 250,
  }


def insert_lead(conn: sqlite3.Connection, raw: dict[str, Any]) -> bool:
  name = str(raw.get("name") or raw.get("business_name") or "").strip()
  if not name or name.lower() == "rating":
    return False
  key = lead_key(raw)
  values = {
    "dedupe_key": key,
    "name": name,
    "rating": raw.get("rating") or None,
    "review_count": raw.get("reviewCount") or raw.get("review_count") or None,
    "business_type": raw.get("businessType") or raw.get("business_type") or "",
    "industry": raw.get("industry") or "",
    "address": raw.get("address") or "",
    "phone": raw.get("phone") or "",
    "status": raw.get("status") or "",
    "maps_url": raw.get("mapsUrl") or raw.get("maps_url") or "",
    "query": raw.get("query") or "",
    "country": raw.get("country") or DEFAULT_COUNTRY,
    "state": raw.get("state") or "",
    "district": raw.get("district") or "",
    "source": raw.get("source") or "import",
    "scraped_at": raw.get("scrapedAt") or raw.get("scraped_at") or "",
  }
  try:
    if DATABASE_URL:
      cursor = conn.execute(
        """
        INSERT INTO leads (
          dedupe_key, name, rating, review_count, business_type, industry,
          address, phone, status, maps_url, query, country, state, district,
          source, scraped_at
        ) VALUES (
          %(dedupe_key)s, %(name)s, %(rating)s, %(review_count)s,
          %(business_type)s, %(industry)s, %(address)s, %(phone)s, %(status)s,
          %(maps_url)s, %(query)s, %(country)s, %(state)s, %(district)s,
          %(source)s, %(scraped_at)s
        )
        ON CONFLICT (dedupe_key) DO NOTHING
        """,
        values,
      )
      return cursor.rowcount > 0

    conn.execute(
      """
      INSERT INTO leads (
        dedupe_key, name, rating, review_count, business_type, industry,
        address, phone, status, maps_url, query, country, state, district,
        source, scraped_at
      ) VALUES (
        :dedupe_key, :name, :rating, :review_count, :business_type, :industry,
        :address, :phone, :status, :maps_url, :query, :country, :state,
        :district, :source, :scraped_at
      )
      """,
      values,
    )
    return True
  except Exception as exc:
    if exc.__class__.__name__ == "IntegrityError":
      return False
    raise
    return False


def import_leads_json(path: Path = LEADS_JSON) -> dict[str, int]:
  if not path.exists():
    return {"seen": 0, "inserted": 0, "duplicates": 0}
  data = json.loads(path.read_text(encoding="utf-8"))
  inserted = 0
  duplicates = 0
  with db() as conn:
    for raw in data:
      if insert_lead(conn, raw):
        inserted += 1
      else:
        duplicates += 1
  return {"seen": len(data), "inserted": inserted, "duplicates": duplicates}


def job_update(job_id: str, **fields: Any) -> None:
  if not fields:
    return
  assignments = ", ".join(f"{key}=?" for key in fields)
  values = list(fields.values()) + [job_id]
  with db() as conn:
    conn.execute(sql(f"UPDATE scrape_jobs SET {assignments} WHERE id=?"), values)


def job_log(job_id: str, line: str) -> None:
  with db() as conn:
    row = conn.execute(sql("SELECT log FROM scrape_jobs WHERE id=?"), (job_id,)).fetchone()
    current = row["log"] if row else ""
    updated = (current + line)[-20000:]
    conn.execute(sql("UPDATE scrape_jobs SET log=? WHERE id=?"), (updated, job_id))


def build_queries_for_job(payload: ScrapeRequest) -> list[dict[str, str]]:
  mode = "thorough" if normalize(payload.mode) in {"thorough", "grid"} else "fast"
  queries: list[dict[str, str]] = []
  for state, district, industry in selected_plan_items(payload):
    script = f"""
const g = require('./geo-scraper');
const plan = g.buildScrapePlan({json.dumps(state)}, {json.dumps(district)}, {json.dumps(industry)}, {{ mode: {json.dumps(mode)} }});
process.stdout.write(JSON.stringify([...plan.phase1Queries, ...plan.phase2Queries]));
"""
    result = subprocess.run([NODE_CMD, "-e", script], cwd=ROOT, text=True, capture_output=True, timeout=20)
    if result.returncode != 0:
      raise RuntimeError(result.stderr or result.stdout)
    for query in json.loads(result.stdout):
      queries.append({
        "query": query,
        "state": state,
        "district": district,
        "industry": industry,
      })
  return queries


def run_scrape_job(job_id: str, payload: ScrapeRequest) -> None:
  try:
    job_update(job_id, status="running", started_at=utc_now())
    before = import_leads_json()
    queries = build_queries_for_job(payload)
    total = len(queries)
    job_update(job_id, total_queries=total, existing_before=count_existing(selected_plan_items(payload)))
    if total == 0:
      job_update(job_id, status="failed", error="No queries generated", finished_at=utc_now())
      return

    with NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as query_file:
      json.dump(queries, query_file)
      query_file_path = query_file.name

    command = [NODE_CMD, "platform-runner.js", query_file_path]
    process = subprocess.Popen(
      command,
      cwd=ROOT,
      text=True,
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      bufsize=1,
    )
    query_pattern = re.compile(r"PLATFORM_QUERY\s+(\d+)\s*/\s*(\d+)", re.IGNORECASE)
    assert process.stdout is not None
    for line in process.stdout:
      job_log(job_id, line)
      match = query_pattern.search(line)
      if match:
        completed = max(int(match.group(1)) - 1, 0)
        progress = min(99, int((completed / total) * 100))
        job_update(job_id, completed_queries=completed, progress=progress)

    code = process.wait()
    after = import_leads_json()
    inserted = max(after["inserted"], 0)
    duplicates = max(after["duplicates"] - before["duplicates"], 0)
    if code != 0:
      job_update(job_id, status="failed", progress=100, error=f"Scraper exited with code {code}", finished_at=utc_now())
      return
    job_update(
      job_id,
      status="completed",
      completed_queries=total,
      progress=100,
      inserted_count=inserted,
      duplicate_count=duplicates,
      finished_at=utc_now(),
    )
  except Exception as exc:
    job_update(job_id, status="failed", error=str(exc), finished_at=utc_now())
  finally:
    if "query_file_path" in locals():
      try:
        Path(query_file_path).unlink(missing_ok=True)
      except Exception:
        pass


def lead_filters(
  state: Optional[str],
  district: Optional[str],
  industry: Optional[str],
  q: Optional[str],
) -> tuple[str, list[Any]]:
  clauses = []
  params: list[Any] = []
  if state:
    clauses.append("lower(state)=?")
    params.append(normalize(state))
  if district:
    clauses.append("lower(district)=?")
    params.append(normalize(district))
  if industry:
    clauses.append("lower(industry) LIKE ?")
    params.append(f"%{normalize(industry)}%")
  if q:
    clauses.append("(lower(name) LIKE ? OR lower(address) LIKE ? OR phone LIKE ?)")
    term = f"%{normalize(q)}%"
    params.extend([term, term, f"%{q}%"])
  where = " WHERE " + " AND ".join(clauses) if clauses else ""
  return where, params


@app.on_event("startup")
def startup() -> None:
  init_db()


@app.get("/")
def index() -> FileResponse:
  return FileResponse(APP_DIR / "static" / "index.html")


@app.get("/api/catalog")
def catalog() -> dict[str, Any]:
  return load_catalog()


@app.get("/api/leads")
def leads(
  state: Optional[str] = None,
  district: Optional[str] = None,
  industry: Optional[str] = None,
  q: Optional[str] = None,
  limit: int = Query(50, ge=1, le=500),
  offset: int = Query(0, ge=0),
) -> dict[str, Any]:
  where, params = lead_filters(state, district, industry, q)
  with db() as conn:
    total = conn.execute(sql(f"SELECT COUNT(*) AS total FROM leads{where}"), params).fetchone()["total"]
    rows = conn.execute(
      sql(f"SELECT * FROM leads{where} ORDER BY imported_at DESC LIMIT ? OFFSET ?"),
      [*params, limit, offset],
    ).fetchall()
  return {"total": total, "items": [dict(row) for row in rows]}


@app.get("/api/summary")
def summary() -> dict[str, Any]:
  with db() as conn:
    total = conn.execute("SELECT COUNT(*) AS total FROM leads").fetchone()["total"]
    by_state = conn.execute("SELECT state, COUNT(*) total FROM leads GROUP BY state ORDER BY total DESC").fetchall()
    by_industry = conn.execute("SELECT industry, COUNT(*) total FROM leads GROUP BY industry ORDER BY total DESC LIMIT 20").fetchall()
  return {
    "total": total,
    "by_state": [dict(row) for row in by_state],
    "by_industry": [dict(row) for row in by_industry],
  }


@app.post("/api/import/json")
def import_json() -> dict[str, int]:
  return import_leads_json()


@app.post("/api/estimate")
def estimate(payload: EstimateRequest) -> dict[str, Any]:
  return estimate_payload(payload)


@app.post("/api/jobs")
def create_job(payload: ScrapeRequest) -> dict[str, Any]:
  estimate = estimate_payload(payload)
  job_id = str(uuid.uuid4())
  with db() as conn:
    conn.execute(
      sql(
      """
      INSERT INTO scrape_jobs (
        id, status, country, states, districts, industries, mode,
        total_queries, existing_before
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      """),
      (
        job_id,
        "queued",
        payload.country or DEFAULT_COUNTRY,
        json.dumps(payload.states),
        json.dumps(payload.districts),
        json.dumps(payload.industries),
        payload.mode or "fast",
        estimate["total_queries"],
        estimate["existing_leads"],
      ),
    )
  thread = threading.Thread(target=run_scrape_job, args=(job_id, payload), daemon=True)
  job_threads[job_id] = thread
  thread.start()
  return {"id": job_id, "estimate": estimate}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
  with db() as conn:
    row = conn.execute(sql("SELECT * FROM scrape_jobs WHERE id=?"), (job_id,)).fetchone()
  if not row:
    raise HTTPException(status_code=404, detail="Job not found")
  return dict(row)


@app.get("/api/export.csv")
def export_csv(
  state: Optional[str] = None,
  district: Optional[str] = None,
  industry: Optional[str] = None,
  q: Optional[str] = None,
) -> StreamingResponse:
  where, params = lead_filters(state, district, industry, q)
  with db() as conn:
    rows = conn.execute(sql(f"SELECT * FROM leads{where} ORDER BY state, district, name"), params).fetchall()

  output = io.StringIO()
  writer = csv.writer(output)
  columns = [
    "name", "rating", "review_count", "business_type", "industry", "address",
    "phone", "status", "maps_url", "country", "state", "district", "source",
    "scraped_at",
  ]
  writer.writerow(columns)
  for row in rows:
    writer.writerow([row[col] for col in columns])
  output.seek(0)
  filename = f"leads-{int(time.time())}.csv"
  return StreamingResponse(
    iter([output.getvalue()]),
    media_type="text/csv",
    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
  )
