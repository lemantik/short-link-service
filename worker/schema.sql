CREATE TABLE IF NOT EXISTS links (
  id         TEXT    PRIMARY KEY,
  url        TEXT    NOT NULL,
  label      TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id    TEXT    NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at INTEGER NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  referer    TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);
