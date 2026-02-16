CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'local',
  enabled BOOLEAN DEFAULT TRUE,
  schedule TEXT DEFAULT '*/30 * * * *',
  file_types TEXT[] DEFAULT '{pdf,xlsx,csv,docx}',
  recursive BOOLEAN DEFAULT TRUE,
  max_depth INT DEFAULT 10,
  exclude_patterns TEXT[] DEFAULT '{node_modules,.git,.DS_Store}',
  document_count INT DEFAULT 0,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE NOT NULL,
  title TEXT,
  raw_text TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_hash TEXT NOT NULL,
  source_ref UUID REFERENCES crawl_sources(id),
  metadata JSONB DEFAULT '{}',
  source_type TEXT,
  doc_date TEXT,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  last_crawled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS documents_source_id_idx ON documents(source_id);
CREATE INDEX IF NOT EXISTS documents_file_hash_idx ON documents(file_hash);
CREATE INDEX IF NOT EXISTS documents_source_ref_idx ON documents(source_ref);
CREATE INDEX IF NOT EXISTS documents_file_type_idx ON documents(file_type);

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  content_tsvector TSVECTOR,
  embedding vector(768),
  chunk_type TEXT DEFAULT 'prose',
  metadata JSONB DEFAULT '{}',
  start_char INT,
  end_char INT,
  entities_extracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_idx ON chunks USING gin(content_tsvector);
CREATE INDEX IF NOT EXISTS chunks_content_trgm_idx ON chunks USING gin(content gin_trgm_ops);

CREATE OR REPLACE FUNCTION chunks_content_tsvector_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chunks_tsvector_update ON chunks;
CREATE TRIGGER chunks_tsvector_update
  BEFORE INSERT OR UPDATE OF content ON chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_content_tsvector_trigger();

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  canonical TEXT NOT NULL,
  type TEXT NOT NULL,
  variants TEXT[] DEFAULT '{}',
  frequency INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entities_type_idx ON entities(type);
CREATE INDEX IF NOT EXISTS entities_frequency_idx ON entities(frequency DESC);

CREATE TABLE IF NOT EXISTS entity_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity TEXT NOT NULL REFERENCES entities(id),
  target_entity TEXT NOT NULL REFERENCES entities(id),
  cooccurrence_count INTEGER DEFAULT 0,
  total_documents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_entity, target_entity)
);

CREATE TABLE IF NOT EXISTS file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawl_sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_hash TEXT,
  file_modified TIMESTAMPTZ,
  file_created TIMESTAMPTZ,
  status TEXT DEFAULT 'discovered',
  error_message TEXT,
  document_id UUID REFERENCES documents(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS file_index_source_idx ON file_index(source_id);
CREATE INDEX IF NOT EXISTS file_index_status_idx ON file_index(status);
CREATE INDEX IF NOT EXISTS file_index_hash_idx ON file_index(file_hash);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INT DEFAULT 0,
  total_items INT,
  processed_items INT DEFAULT 0,
  source_id UUID REFERENCES crawl_sources(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_type_idx ON jobs(type);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS response_cache (
  cache_key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]',
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  response TEXT,
  model TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO settings (key, value) VALUES
  ('ai_provider', '"ollama"'),
  ('ollama_url', '"http://localhost:11434"'),
  ('ollama_llm_model', '"llama3:8b"'),
  ('ollama_embedding_model', '"nomic-embed-text"'),
  ('openai_api_key', '""'),
  ('openai_llm_model', '"gpt-4o-mini"'),
  ('openai_embedding_model', '"text-embedding-3-small"'),
  ('anthropic_api_key', '""'),
  ('anthropic_llm_model', '"claude-sonnet-4-5-20250929"'),
  ('embedding_dimensions', '768'),
  ('system_prompt', '"You are a document research assistant. Search indexed documents and answer with citations."'),
  ('default_crawl_schedule', '"*/30 * * * *"'),
  ('default_file_types', '["pdf","xlsx","csv","docx"]'),
  ('min_vector_similarity', '0.35'),
  ('max_chat_history', '10'),
  ('chunk_target_tokens', '1000'),
  ('chunk_overlap_tokens', '200')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION vector_search(query_embedding vector(768), match_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, metadata JSONB, vector_score FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.document_id, c.content, c.metadata, 1 - (c.embedding <=> query_embedding) AS vector_score
  FROM chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_limit;
$$;

CREATE OR REPLACE FUNCTION lexical_search(query_text TEXT, match_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, metadata JSONB, lexical_score FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.document_id, c.content, c.metadata,
         ts_rank_cd(
           COALESCE(c.content_tsvector, to_tsvector('english', c.content)),
           websearch_to_tsquery('english', query_text)
         ) AS lexical_score
  FROM chunks c
  WHERE COALESCE(c.content_tsvector, to_tsvector('english', c.content))
        @@ websearch_to_tsquery('english', query_text)
  ORDER BY lexical_score DESC
  LIMIT match_limit;
$$;

CREATE OR REPLACE FUNCTION fuzzy_search(query_text TEXT, similarity_threshold FLOAT DEFAULT 0.3, result_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, metadata JSONB, similarity_score FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.document_id, c.content, c.metadata, similarity(c.content, query_text) AS similarity_score
  FROM chunks c
  WHERE c.content % query_text OR similarity(c.content, query_text) > similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END;
$$;

CREATE OR REPLACE FUNCTION fuzzy_entity_search(entity_name TEXT, result_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, metadata JSONB, match_score FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.document_id, c.content, c.metadata, word_similarity(entity_name, c.content) AS match_score
  FROM chunks c
  WHERE entity_name <% c.content
  ORDER BY match_score DESC
  LIMIT result_limit;
END;
$$;

CREATE OR REPLACE FUNCTION update_tsvectors_batch(p_chunk_ids UUID[])
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chunks
  SET content_tsvector = to_tsvector('english', content)
  WHERE id = ANY(p_chunk_ids);
END;
$$;

CREATE OR REPLACE FUNCTION increment_cache_hit(key TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE response_cache
  SET hit_count = hit_count + 1, last_accessed_at = NOW()
  WHERE cache_key = key;
END;
$$;
