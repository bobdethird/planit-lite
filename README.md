# Planit Lite

Next.js app to **download** Instagram / TikTok videos (via [yt-dlp](https://github.com/yt-dlp/yt-dlp)), **play** them in the browser, and **transcribe** with [ElevenLabs Scribe](https://elevenlabs.io/).

There is also a small in-memory **Planit** layer (groups + events) for future planning features — see `GET /api/groups` and `GET /api/events`.

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   ```bash
   cp .env.example .env.local
   ```

   - `ELEVENLABS_API_KEY` — required for transcription.
   - `GOOGLE_GENERATIVE_AI_API_KEY` — required for **Analyze video** and **Plan event** (Gemini via Vercel AI SDK).

3. **System tools**

   `youtube-dl-exec` bundles yt-dlp; you still need **ffmpeg** on your PATH for merging video+audio to MP4 (e.g. `brew install ffmpeg` on macOS).

4. **Instagram login issues**

   Export browser cookies to `cookies.txt` in the project root (Netscape format). The download API passes `--cookies` automatically when that file exists. This file is gitignored.

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `pnpm dev`     | Dev server         |
| `pnpm build`   | Production build   |
| `pnpm start`   | Run production app |
| `pnpm lint`    | ESLint             |
| `pnpm typecheck` | TypeScript       |

## API

| Route | Method | Description |
| ----- | ------ | ----------- |
| `/api/download` | POST `{ url }` | Download from IG/TikTok → `downloads/` |
| `/api/videos` | GET | List MP4s + transcript metadata |
| `/api/videos/[filename]` | GET / DELETE | Stream or delete a file |
| `/api/transcribe` | POST `{ filename }` | Transcribe with ElevenLabs |
| `/api/groups` | GET | Demo groups (in-memory store) |
| `/api/events` | GET / POST | List or create events (POST body: `{ itinerary, groupId? }`) |
| `/api/events/[id]` | GET / DELETE | Get JSON; DELETE needs `x-planit-admin-secret` if `PLANIT_ADMIN_SECRET` is set |
| `/api/analyze` | POST `{ filename }` | Gemini video → structured `VideoContext` (cached as `.analysis.json`) |
| `/api/plan` | POST `{ videoContext }` | Gemini → itinerary JSON (persist with `POST /api/events`) |
| `/api/health` | GET | Liveness JSON |
| `/api/vote` | POST `{ event_id, phone, vote }` | Member vote; may set status to `quorum_reached` |
| `/api/schedule` | POST `{ event_id, scheduled_time? }` | Pick slot and/or confirm; writes GCal when members have `gcal_token` |
| `/api/mcp` | POST (JSON-RPC) | MCP tools for iMessage/POKE agents (`get_itinerary`, `record_vote`, …) |

UI: **`/events`** lists saved events; **`/events/[id]`** vote + schedule demo.

**SEO / ops:** `/sitemap.xml`, `/robots.txt`, **`GET /api/health`**. Set **`NEXT_PUBLIC_APP_URL`** in production for correct canonical URLs.

**Validation:** `POST /api/events` bodies are checked with Zod (`ItineraryFullZodSchema`). `POST /api/vote` uses `VoteRequestSchema`.

## shadcn/ui

Add components:

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button"
```
