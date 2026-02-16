# Changelog

## 2026-02-16 - Initial Testing & Fixes

### Fixed
- **Edge Runtime Compatibility**: Replaced `jsonwebtoken` with `jose` in middleware to support Next.js Edge Runtime
- **Chunk Size Issue**: Reduced chunk target from 1000 tokens to 256 tokens (~1000 chars max) to fit within nomic-embed-text context window
- **Path Permissions**: Added `/Users` to `ALLOWED_FILE_ROOTS` to support user home directories
- **Volume Mapping**: Fixed "Macintosh HD" volume to map to root filesystem (`/`) instead of `/Volumes/Macintosh HD`

### Added
- **Full Pipeline Job**: Created integrated pipeline job that runs crawl → ingest → embed in sequence
- **Source Management UI**: Complete CRUD interface for document sources with real-time file tracking
- **Visual Folder Browser**: Click-to-browse folder picker with breadcrumb navigation
- **File Discovery Tracking**: Real-time display of discovered files with status indicators
- **Debug Logging**: Added detailed logging to embed job for troubleshooting

### Changed
- Source "Crawl Now" button renamed to "Index Now" to reflect full pipeline execution
- Middleware simplified to remove internal fetch dependency that caused issues in dev mode

### Tested
- ✅ Login and authentication flow
- ✅ Folder browser and source creation
- ✅ Full indexing pipeline (crawl → ingest → embed)
- ✅ Ollama embedding model integration (nomic-embed-text)
- ✅ Chat interface with vector search
- ⚠️ Search quality needs tuning (see Known Issues)

### Known Issues
- Search relevance could be improved - may need better chunking strategy or search weight tuning
- Logging worker thread errors (cosmetic, doesn't affect functionality)
- Chunk size optimization may need further refinement based on document types

### Models Required
- `ollama pull nomic-embed-text` - for embeddings (768 dimensions)
- `ollama pull llama3:8b` - for chat LLM

### Next Steps
- Fine-tune search relevance (adjust vector/lexical weights, chunk overlap)
- Add batch embedding optimization
- Improve error handling for large documents
- Add progress indicators for long-running pipeline jobs
