# Dust Logs — Voice AI Architecture Decision

## Overview

Superintendent101 Dust Logs feature requires:
1. **Voice-to-text transcription** of field audio notes
2. **AI structuring** of raw transcripts into organized field logs
3. **Push to user's workspace** (Notion or Google NotebookLM)
4. **Zero file storage** — privacy-first, no audio/transcript retained on our servers
5. **SOC 2 compliance**

---

## Option 1: OpenAI Whisper API (Cloud)

### Architecture
```
User records audio (browser/mobile)
  → Audio streamed directly to Whisper API (OpenAI)
  → Transcript returned to server (in-memory only)
  → GPT-4o applies custom field AI prompt
  → Structured log pushed to Notion/NotebookLM API
  → Audio and transcript discarded immediately
```

### Cost (for 50 active Dust Logs users)
- Whisper API: $0.006/min × avg 5 min/log × 30 logs/user/mo = $0.90/user/mo
- GPT-4o (structuring): ~$0.003/1k tokens × ~800 tokens/log = $0.0024/log × 30 = $0.07/user/mo
- **Total AI cost per user: ~$0.97/mo**
- Your margin at $50/mo: ~$49/user minus infra

### Pros
- Zero infrastructure to manage
- Industry-leading accuracy (Whisper v3)
- Fast time-to-market
- SOC 2 compliant (OpenAI has SOC 2 Type II)
- Easy to implement (single API call)

### Cons
- Audio leaves your infrastructure to OpenAI
- Per-minute costs scale with usage
- Dependent on OpenAI uptime

### **Recommendation: START HERE.** Best cost/quality ratio for launch.

---

## Option 2: Self-hosted Whisper on NVIDIA GPU (Hostinger VPS)

### Architecture
```
User records audio
  → Audio streamed to your NVIDIA GPU instance (Hostinger)
  → Whisper large-v3 runs locally
  → Transcript structured with local LLM (Llama 3.1 8B or similar)
  → Pushed to Notion/NotebookLM
  → Audio and transcript cleared from memory immediately
```

### Hardware & Cost
- Hostinger VPS with NVIDIA RTX 4000 Ada: ~$100-200/mo
- Whisper large-v3 requires ~6GB VRAM → fits on single GPU
- Can process ~100 concurrent transcriptions
- For 50 users × 30 logs = 1,500 logs/mo → ~$0.07-0.13/log in infra cost

### Pros
- Audio NEVER leaves your infrastructure — true zero-knowledge
- Strongest privacy story / SOC 2 easier to document
- Fixed monthly cost (predictable)
- You control the model and prompt

### Cons
- ~$150/mo fixed cost (even with 0 users)
- Requires DevOps to maintain GPU server
- More complex deployment (CUDA, Docker, model weights)
- Inference speed may lag vs API for initial users

### **Best when:** You have 20+ active Dust Logs users, strong privacy requirements, or want GPU for other S101 features (future: video, blueprints).

---

## Option 3: Google Cloud Speech-to-Text (Chirp / Universal v2)

### Architecture
```
User records audio
  → Audio sent to Google Cloud STT API
  → Transcript processed by Gemini 1.5 Pro (Google AI)
  → Result structured and pushed to user's NotebookLM notebook
  → Seamless integration since same ecosystem
```

### Cost
- Google STT: $0.0048/15sec chunk → ~$0.096/5min log
- Gemini 1.5 Pro structuring: ~$0.00125/1k tokens × 800 = $0.001/log
- **Total AI cost: ~$0.10/user/log × 30 = $3/user/mo**
- Your margin at $50/mo: ~$47/user

### Pros
- Native Google ecosystem (better NotebookLM integration)
- Excellent accuracy, especially with construction vocabulary
- No audio storage (streaming API)
- Google's SOC 2/ISO 27001 compliance

### Cons
- More expensive per log than Whisper
- Google's NotebookLM API is in limited preview
- Vendor lock-in risk

### **Best when:** Users primarily use Google NotebookLM over Notion.

---

## Decision Matrix

| Factor | OpenAI Whisper | Self-hosted NVIDIA | Google Cloud |
|--------|---------------|-------------------|--------------|
| Monthly infra cost (50 users) | ~$50 | ~$150 fixed | ~$150 |
| Privacy (audio leaves infra) | Leaves to OpenAI | Never leaves | Leaves to Google |
| Setup complexity | Low | High | Medium |
| Notion integration | ✓ | ✓ | ✓ |
| NotebookLM integration | Limited | Limited | Best |
| SOC 2 compliance | OpenAI SOC2 | Self-managed | Google SOC2 |
| Time to launch | 1 week | 4-6 weeks | 2 weeks |

---

## Recommended Phased Approach

### Phase 1 (Launch): OpenAI Whisper API
- Fastest to build
- Lowest upfront cost
- Sufficient for first 100 users
- **Implementation: 1-2 weeks**

### Phase 2 (Scale): Hybrid
- Whisper API for Notion users
- Google Cloud STT for NotebookLM users
- Evaluate self-hosted NVIDIA when monthly AI costs exceed $300

### Phase 3 (Enterprise): Self-hosted
- Full control, strongest privacy guarantees
- Required for SOC 2 Type II certification scope

---

## Notion Integration

```
User connects Notion workspace → OAuth flow → store encrypted token
Dust Log submission → AI structures → Notion API creates page
```

Database in Notion is structured by:
- **Location** (site address)
- **Job type** (retail, industrial, healthcare, etc.)
- **Client name**
- **Date**
- Custom tags from Field AI Rules

### Privacy
- Notion OAuth token stored encrypted (AES-256) in our DB
- Token scoped to specific databases user authorizes
- User can revoke at any time
- We never read Notion content — write-only

---

## Google NotebookLM Integration

```
User connects Google account → OAuth (Drive scope)
Dust Log submission → AI structures → appended to user's notebook file
```

### Privacy
- Google OAuth scoped to specific notebook file(s) user selects
- Write-only access
- User owns the notebook, can revoke at any time

---

## SOC 2 Compliance Checklist

- [ ] TLS 1.3 for all API calls (enforced via HTTPS)
- [ ] Database encryption at rest (PostgreSQL + disk encryption)
- [ ] Auth tokens encrypted with AES-256
- [ ] No audio/transcript storage (confirmed: in-memory only)
- [ ] Access logs for all API endpoints
- [ ] Rate limiting on auth endpoints
- [ ] RBAC (implemented: MEMBER, MENTOR, ADMIN roles)
- [ ] Penetration test before launch
- [ ] Privacy policy documenting data flows
- [ ] Incident response plan
- [ ] Vendor SOC 2 docs (OpenAI, Notion, Google)

---

## Monthly Operating Cost Summary (50 users, at scale)

| Service | Cost/mo |
|---------|---------|
| Hostinger VPS (app + DB) | ~$20-40 |
| OpenAI Whisper API (Dust Logs) | ~$50 |
| Domain + SSL | ~$5 |
| Tailscale (internal network) | Free (up to 100 devices) |
| **Total** | **~$75-95/mo** |

**Revenue at 50 users (conservative mix):**
- 30 free + 10 mentorship ($200) + 10 dust logs ($500) = **$700/mo**
- Net after infra: **~$600/mo**

At 200 users (20 free / 100 mentorship / 80 dust logs):
- Revenue: **$100 × 2000 + $50 × 80** = wait, recalculating:
  - 100 × $20 = $2,000 (mentorship)
  - 80 × $50 = $4,000 (dust logs)
  - Total: **$6,000/mo revenue**
  - Infra at scale: ~$300-500/mo
  - **Net: ~$5,500-5,700/mo**

---

*Document generated: 2026-02-22 | Superintendent101 architecture planning*
