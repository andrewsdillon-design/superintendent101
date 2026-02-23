# Superintendent101 — API Setup Guide

All external services the app requires. Set credentials in `.env.docker` (local)
and in your server environment variables for production.

---

## 1. OpenAI API — Whisper + GPT-4o (Dust Logs AI)

**What it powers:** Voice transcription via Whisper, structured log generation via GPT-4o
**Required for:** Dust Logs tier ($50/mo feature)
**Env var:** `OPENAI_API_KEY`

### Steps
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy the key — it's only shown once
4. Add to `.env.docker`:
   ```
   OPENAI_API_KEY=sk-...
   ```

### Cost estimate
| Usage | Model | Cost |
|-------|-------|------|
| 1-min voice recording | Whisper | ~$0.006 |
| Structure one log | GPT-4o | ~$0.01–$0.03 |
| 50 users × 20 logs/mo | Combined | ~$10–$30/mo |

### What breaks without it
- `/dust-logs/new` — transcription step fails (shows error, manual text still works)
- `/api/transcribe` returns 503
- `/api/dust-logs/structure` returns 503

---

## 2. Notion OAuth — Dust Log Sync

**What it powers:** Pushes structured logs to user's own Notion workspace
**Required for:** Dust Logs tier (optional integration, users bring their own Notion)
**Env vars:** `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

### Steps
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration** → Set type to **Public** (OAuth)
3. Set **Redirect URIs**:
   - Local: `http://localhost:3001/api/integrations/notion/callback`
   - Production: `https://yourdomain.com/api/integrations/notion/callback`
4. Under **Capabilities**: check `Read content`, `Update content`, `Insert content`
5. Copy **OAuth client ID** and **OAuth client secret**
6. Add to `.env.docker`:
   ```
   NOTION_CLIENT_ID=your-notion-client-id
   NOTION_CLIENT_SECRET=your-notion-client-secret
   ```

### What it creates automatically
When a user connects Notion, the app auto-creates an **S101 Dust Logs** database
in their workspace with these properties:
- Date, Project, Location, Job Type, Tags, Summary

### What breaks without it
- Profile → Connect Notion → fails to redirect
- Dust Log submit still works — just skips Notion sync (shows "not connected")

---

## 3. Google OAuth — Drive + NotebookLM Sync

**What it powers:** Uploads structured logs as text files to Google Drive.
NotebookLM can source these as documents for AI-powered analysis.
**Required for:** Dust Logs tier (optional integration)
**Env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Steps
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Library** → Enable **Google Drive API**
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   - Local: `http://localhost:3001/api/integrations/google/callback`
   - Production: `https://yourdomain.com/api/integrations/google/callback`
7. Copy **Client ID** and **Client Secret**
8. Add to `.env.docker`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### OAuth consent screen
- Go to **APIs & Services** → **OAuth consent screen**
- User type: **External** (for production) or **Internal** (for testing)
- Scopes to add: `https://www.googleapis.com/auth/drive.file`
  - This is the minimal scope — only accesses files the app creates, not all Drive files
- Add test users while in development (Google requires this before going live)

### What it creates automatically
When a user connects Google, the app creates an **S101 Dust Logs** folder in their
Drive. Each log is uploaded as a `.txt` file named `YYYY-MM-DD_ProjectName.txt`.
These are readable by NotebookLM as source documents.

### What breaks without it
- Profile → Connect Google → fails to redirect
- Dust Log submit still works — just skips Drive sync

---

## 4. Already Configured (No Action Needed)

| Service | Variable | Status |
|---------|----------|--------|
| PostgreSQL | `DATABASE_URL` | Running via Docker on port 5433 |
| NextAuth | `NEXTAUTH_SECRET` | Set in `.env.docker` |
| NextAuth URL | `NEXTAUTH_URL` | Set in `docker-compose.yml` |

---

## Environment Files

| File | Purpose | Git tracked? |
|------|---------|-------------|
| `.env` | Local dev (direct npm run dev) | No — gitignored |
| `.env.docker` | Injected into Docker container | No — gitignored |

**For production deployment**, set all env vars as environment variables in your
hosting platform (Vercel, Render, Coolify, Hostinger VPS, etc.) — never commit
secrets to git.

---

## Minimum to be "live" for users

1. **OpenAI key** → enables the core Dust Logs feature
2. **Notion OR Google** → at least one integration so Dust Logs has somewhere to sync
3. Both OAuth apps in **production mode** (not test mode) before going public

The community feed, mentor profiles, and networking features work with **zero external APIs** — just the PostgreSQL database.

---

## Production Checklist

- [ ] `OPENAI_API_KEY` set and funded
- [ ] Notion OAuth app created with production redirect URI
- [ ] Google OAuth consent screen published (or test users added)
- [ ] `NEXTAUTH_SECRET` changed from dev default (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` updated to production domain
- [ ] `DATABASE_URL` pointing to production Postgres (not Docker)
- [ ] HTTPS enabled (required for Google OAuth)
- [ ] Notion redirect URI includes production domain
- [ ] Google redirect URI includes production domain
