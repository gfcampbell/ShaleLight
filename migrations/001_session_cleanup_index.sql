-- Index to speed up session expiry cleanup
-- Plain btree index on expires_at (not a partial index - NOW() in a partial index
-- predicate freezes at creation time and becomes useless as time passes)
CREATE INDEX IF NOT EXISTS sessions_expires_cleanup_idx ON sessions(expires_at);
