CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rating REAL,
  review_count INTEGER,
  business_type TEXT,
  industry TEXT,
  address TEXT,
  phone TEXT,
  status TEXT,
  maps_url TEXT,
  query TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT,
  district TEXT,
  source TEXT,
  scraped_at TEXT,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_district ON leads(district);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name);

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  states TEXT NOT NULL,
  districts TEXT NOT NULL,
  industries TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'fast',
  total_queries INTEGER NOT NULL DEFAULT 0,
  completed_queries INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  existing_before INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  log TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  finished_at TEXT
);
