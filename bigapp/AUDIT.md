# Audit Findings & Target Architecture

## Audit Findings

### 1. Database & Schema
- **Current State:** Direct MongoDB driver usage with TypeScript interfaces (`core/db/client.ts`).
- **Issues:**
  - No runtime validation (Zod/TypeBox). Bad data can crash the app.
  - No indexes defined in code (only implicit).
  - No clear migration strategy.
- **Risk:** High. Data integrity is not guaranteed.

### 2. Connectors & Ingestion
- **Current State:** Simple synchronous parsing logic (`core/connectors/instagram.ts`).
- **Issues:**
  - `parseExport` loads entire files into memory. This will OOM on large exports (e.g., 5GB Instagram dump).
  - No job queue or background processing. Long-running tasks will timeout HTTP requests.
  - Regex-based parsing is fragile.
- **Risk:** Critical. The app will fail on real-world data sizes.

### 3. Services & Logic
- **Current State:** Service functions return Promises directly (`core/services/capture.ts`).
- **Issues:**
  - No resilience (retries, backoff).
  - Tightly coupled to the API layer.
  - `fetchOgData` scrapes entire HTML bodies without limits or streaming.
- **Risk:** Medium. Hard to scale or debug.

### 4. Search & AI
- **Current State:** Non-existent or very basic.
- **Issues:**
  - No vector store integration.
  - No embedding generation.
  - No AI summarization/tagging logic.
- **Risk:** High. The core value proposition ("Unique Search Experience") is missing.

### 5. Missing Modules
- **Jobs/Workers:** Essential for async processing (ingestion, AI, indexing).
- **Audit Logging:** No record of who did what or system errors.
- **Observability:** No structured logging or metrics.

---

## Target Architecture

### 1. Core Modules (Directory Structure)
```
core/
  ├── config/         # Environment & constants
  ├── db/             # Database client & schema definitions (Zod)
  ├── jobs/           # Async job queue (MongoDB-backed)
  ├── ingest/         # Data ingestion pipelines (parsing, normalization)
  ├── search/         # Hybrid search engine (Vector + Keyword)
  ├── ai/             # AI service (Enrichment, Summarization)
  ├── types/          # Shared TypeScript interfaces
  └── utils/          # Shared utilities (Chunking, Hashing)
```

### 2. Data Model (MongoDB Collections)
- **users:** Auth & profile.
- **sources:** Connected platforms (OAuth tokens, config).
- **imports:** Track file uploads/batches.
- **assets:** Raw files (images, videos) metadata.
- **records:** Normalized data (posts, messages) - *The Searchable Unit*.
- **jobs:** Async task status & payload.
- **embeddings:** (Optional) Vector data if not stored in `records`.

### 3. Ingestion Pipeline
1.  **Upload/Connect:** User provides credentials or file.
2.  **Job Creation:** `IngestJob` created in DB.
3.  **Worker:**
    - Picks up `IngestJob`.
    - Streams file/API data.
    - Normalizes to `NormalizedRecord`.
    - Saves to `records` collection.
    - Spawns `EnrichmentJob` & `IndexingJob`.

### 4. Hybrid Search
- **Storage:** MongoDB Atlas Search (or manual vector cosine similarity for local dev).
- **Query:**
  - `text`: Keyword match on `content`, `author`, `tags`.
  - `vector`: Semantic match on `embedding`.
  - `filter`: Date range, source, type.
- **Ranking:** `(TextScore * 0.4) + (VectorScore * 0.4) + (Recency * 0.2)`.

### 5. AI Enrichment
- **Trigger:** Post-ingestion.
- **Tasks:**
  - `summarize`: Generate 1-sentence summary of long text.
  - `tag`: Extract entities (Person, Location, Event).
  - `cluster`: Group similar records (e.g., "Trip to Japan").

## Implementation Plan

### Phase 1: Core & Stability
1.  Define **Zod Schemas** for all entities.
2.  Implement **Job Queue** (MongoDB-based).
3.  Refactor **Database Client** to use schemas.

### Phase 2: Ingestion Engine
1.  Implement **Stream-based Parser** for exports.
2.  Create **Ingest Worker** to handle parsing in background.
3.  Update **Connectors** to yield records instead of returning arrays.

### Phase 3: Search & AI
1.  Implement **Vector Embedding** (OpenAI/Local).
2.  Build **Hybrid Search Service**.
3.  Add **AI Enrichment Worker**.

### Phase 4: UI/UX
1.  Build **Search Interface** (Filters, Timeline).
2.  Display **AI Insights** (Summaries, Clusters).
