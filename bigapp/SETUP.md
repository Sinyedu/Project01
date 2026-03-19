# Backend — Schemas, Services, Crons & API

## Setup

1. Set env vars in `.env`:
   ```
   MONGO_URI=...
   CLOUDINARY_URL=...
   CRON_SECRET=some-random-secret
   ```
2. Create indexes (once):
   ```
   npx tsx core/db/setup.ts
   ```
3. Start dev server:
   ```
   npm run dev
   ```

## Collections

| Collection | Purpose |
|---|---|
| `archives` | Captured content — text, media URLs, context, link-rot status |
| `capture_jobs` | Scheduled recurring URL captures |
| `time_capsules` | Content locked until a future date |

## API Routes (require Clerk auth)

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/api/archives` | Capture a URL → extract metadata → archive media → save |
| `GET` | `/api/archives` | List user's archived items |
| `POST` | `/api/capture-jobs` | Create a recurring capture job |
| `GET` | `/api/capture-jobs` | List user's capture jobs |
| `POST` | `/api/time-capsules` | Create a locked time capsule |
| `GET` | `/api/time-capsules` | List user's capsules |

### Example: archive a tweet

```bash
curl -X POST http://localhost:3000/api/archives \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-session-token>" \
  -d '{"url": "https://x.com/user/status/123", "platform": "twitter"}'
```

### Example: create a time capsule

```bash
curl -X POST http://localhost:3000/api/time-capsules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-session-token>" \
  -d '{"title": "2026 memories", "textContent": "...", "lockedUntil": "2030-01-01"}'
```

## Cron Endpoints (require `Authorization: Bearer <CRON_SECRET>`)

| Endpoint | Job | Schedule |
|---|---|---|
| `GET /api/cron/capture` | Runs due capture jobs through the full pipeline | Every 15 min |
| `GET /api/cron/unlock` | Unlocks capsules past their date | Every hour |
| `GET /api/cron/verify` | HEAD-checks source URLs for link rot (7-day cycle) | Daily |

## How Capture Works

1. **oEmbed** — Twitter, Instagram, TikTok have free endpoints that return structured author/title/thumbnail data for public content (no API keys needed)
2. **Open Graph fallback** — for any URL, we fetch the HTML and extract `og:title`, `og:description`, `og:image` meta tags
3. **Media storage** — Cloudinary fetches the remote image/video URL and stores a permanent copy
4. **Dedup** — content is hashed; duplicate URLs produce the same hash and are skipped
5. **Link rot** — the verify cron re-checks source URLs weekly and marks dead ones

### Platform realities

| Platform | What works | Limitation |
|---|---|---|
| Twitter/X | oEmbed + OG tags | Full thread context needs API ($) |
| Instagram | oEmbed for public posts | Most content behind auth wall |
| TikTok | oEmbed + OG tags | Video download needs yt-dlp |
| Telegram | OG tags on public channels | Private groups inaccessible |
| Facebook | OG tags on public pages | Mostly walled garden |
| WhatsApp | N/A | No web presence — export only |

## File Layout

```
core/
  services/
    capture.ts    — oEmbed + OG extraction + content hashing
    storage.ts    — Cloudinary upload wrapper
    pipeline.ts   — ties capture + storage + MongoDB together
  db/
    client.ts     — MongoDB connection
    collections.ts — typed collection accessors
    setup.ts      — index creation script
  cron/
    auth.ts       — bearer token check for cron routes
  types/
    archive.ts    — all schema interfaces
app/api/
  archives/       — POST (capture URL) + GET (list)
  capture-jobs/   — POST (schedule) + GET (list)
  time-capsules/  — POST (create) + GET (list)
  cron/
    capture/      — processes due capture jobs
    unlock/       — unlocks mature time capsules
    verify/       — detects link rot
```
