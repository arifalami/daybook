CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('event','task','note')),
  date TEXT,
  time TEXT,
  description TEXT DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  reminder_minutes INTEGER,
  repeat_rule TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_date ON items(date);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
