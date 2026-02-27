# ProFieldHub — Voice AI & Inference Architecture

> Updated: 2026-02-26 | Reflects current tier pricing: Daily Logs $19/mo, Mentor $39/mo

---

## What the pipeline needs

1. **Voice-to-text transcription** of field audio notes
2. **AI structuring** of raw transcripts into organized field logs
3. **Push to user's Notion workspace** (write-only, privacy-first)
4. **Zero file storage** — audio and transcript discarded in-memory, never persisted

---

## Current Stack (live in production)

```
User records audio (browser/mobile)
  → POST /api/transcribe → OpenAI Whisper API → raw transcript (in-memory)
  → POST /api/dust-logs/structure → GPT-4o → structured JSON log
  → POST /api/dust-logs/submit → Notion API → page created in user's DB
  → Audio + transcript discarded
```

---

## Transcription Options

### OpenAI Whisper API — $0.006/min
- Standard Whisper-1 model, same price since launch, no bulk discounts
- Bills on audio duration, not speech detected (silence costs the same)
- SOC 2 Type II compliant

### OpenAI gpt-4o-mini-transcribe — $0.003/min
- Half the cost of standard Whisper
- Similar accuracy for clear field audio
- Worth switching to — same API, just change the model param

### Self-hosted Whisper large-v3 on GPU
- Runs in ~2-4GB VRAM, fits on any modern GPU
- Zero marginal cost per transcription after hardware
- See GPU pricing section below

---

## Structuring / LLM Options

### GPT-4o — $2.50 input / $10.00 output per million tokens
- Most capable, best JSON reliability
- ~800 input + 400 output tokens per log
- Cost per log: ~$0.006 → $0.18/user/mo (30 logs)
- Overkill for structured log output — mini is sufficient

### GPT-4o mini — $0.15 input / $0.60 output per million tokens
- More than sufficient for log structuring (deterministic JSON schema)
- Cost per log: ~$0.00036 → $0.011/user/mo (30 logs)
- **Recommended: switch from GPT-4o to GPT-4o mini for structuring**

### xAI Grok 4 Fast — $0.20 input / $0.50 output per million tokens
- Comparable cost to GPT-4o mini
- 2M context window (irrelevant for log structuring but useful for future features)
- $25 signup credit + $150/mo free via data sharing program
- Worth testing: may reduce costs further with prompt caching (50-75% discount on repeated prefixes)

### xAI Grok 3 / Grok 4 — $3.00 input / $15.00 output per million tokens
- No advantage over GPT-4o for this use case at 5x the cost
- Skip

### Self-hosted Llama 3.1 8B / Mistral 7B on GPU
- Effective cost ~$0.013/1k tokens at GPU rental rates
- For log structuring: ~$0.01/log → $0.30/user/mo
- Slightly higher than mini API but audio stays on-prem
- See GPU pricing below

### Managed open-source inference (Together AI / Groq)
- Llama 3.1 70B on Together AI: ~$0.88/M tokens input
- Llama 3.1 8B on Groq: ~$0.20/M tokens input (very fast inference)
- Split option: Whisper on-prem for privacy, Groq for LLM structuring

---

## GPU VPS Pricing (2026 market rates)

| GPU | VRAM | Provider | $/hr | $/mo (730hr) | Best for |
|-----|------|----------|------|-------------|----------|
| RTX 4090 | 24GB | Vast.ai / RunPod | ~$0.40 | ~$292 | Whisper + 7B LLM, up to ~300 users |
| A100 40GB | 40GB | RunPod | ~$1.29 | ~$942 | Whisper + 13B LLM, up to ~1,000 users |
| A100 80GB | 80GB | Lambda / CoreWeave | ~$2.29 | ~$1,672 | 70B models, high throughput |
| H100 80GB | 80GB | Vast.ai | ~$1.49 | ~$1,088 | Maximum throughput, 70B+ models |
| H100 80GB | 80GB | Azure / GCP | ~$6.98 | ~$5,095 | Enterprise SLA (not worth it at this scale) |

**Notes:**
- RunPod and Vast.ai are 40-60% cheaper than AWS/Azure/GCP for equivalent hardware
- H100 prices are dropping — sub-$2/hr expected by mid-2026
- RTX 4090 fits Whisper large-v3 (6GB) + Llama 3.1 8B (16GB) simultaneously in 24GB VRAM

---

## Cost Per User: Current vs Optimized

### Current (Whisper + GPT-4o, 30 logs/mo)
| Component | Cost/log | Cost/user/mo |
|-----------|----------|-------------|
| Whisper API ($0.006/min × 5min) | $0.030 | $0.90 |
| GPT-4o structuring | $0.006 | $0.18 |
| **Total** | **$0.036** | **$1.08** |
| Margin at $19/mo | | **$17.92 (94%)** |

### Optimized: gpt-4o-mini-transcribe + GPT-4o mini
| Component | Cost/log | Cost/user/mo |
|-----------|----------|-------------|
| gpt-4o-mini-transcribe ($0.003/min × 5min) | $0.015 | $0.45 |
| GPT-4o mini structuring | $0.00036 | $0.011 |
| **Total** | **$0.015** | **$0.46** |
| Margin at $19/mo | | **$18.54 (97.6%)** |

### Self-hosted RTX 4090 ($292/mo fixed) + Llama 3.1 8B
| Users | GPU cost/user | LLM cost/user | Total/user | Margin at $19 |
|-------|-------------|--------------|-----------|--------------|
| 100 | $2.92 | $0.30 | $3.22 | $15.78 (83%) |
| 200 | $1.46 | $0.30 | $1.76 | $17.24 (91%) |
| 400 | $0.73 | $0.30 | $1.03 | $17.97 (95%) |
| 600 | $0.49 | $0.30 | $0.79 | $18.21 (96%) |

**Break-even vs optimized API: ~630 active Daily Logs users**

---

## Recommendation: Optimized API Path

```
Switch /api/transcribe  → model: "gpt-4o-mini-transcribe"  (-50% transcription cost)
Switch /api/dust-logs/structure → model: "gpt-4o-mini"      (-95% structuring cost)
```

One-line change each. Gets you to **97.6% gross margin** on the Daily Logs feature with zero infrastructure changes. Only move to self-hosted GPU when you hit 600+ active Daily Logs users.

---

## Decision Matrix

| Factor | Current (API) | Optimized API | RTX 4090 self-hosted | H100 self-hosted |
|--------|-------------|--------------|----------------------|------------------|
| Cost/user/mo | $1.08 | $0.46 | ~$1.03 @ 300 users | ~$0.50 @ 600 users |
| Fixed monthly cost | $0 | $0 | $292 | $1,088 |
| Audio leaves infra | OpenAI | OpenAI | Never | Never |
| Setup complexity | None | None | High | High |
| Break-even users | — | — | 630 | 2,365 |
| Time to deploy | Now | 30min | 4-6 weeks | 4-6 weeks |

---

## Revenue Model (updated pricing)

### 50 users (30 free / 10 Daily Logs / 10 Mentor)
| Tier | Users | MRR |
|------|-------|-----|
| Community | 30 | $0 |
| Daily Logs | 10 | $190 |
| Mentor | 10 | $390 |
| **Total MRR** | | **$580** |
| AI costs (20 paid users × $0.46) | | -$9 |
| VPS infra (DigitalOcean) | | -$20 |
| **Net** | | **~$551/mo** |

### 200 users (30 free / 100 Daily Logs / 70 Mentor)
| Tier | Users | MRR |
|------|-------|-----|
| Community | 30 | $0 |
| Daily Logs | 100 | $1,900 |
| Mentor | 70 | $2,730 |
| **Total MRR** | | **$4,630** |
| AI costs (170 users × $0.46) | | -$78 |
| VPS infra | | -$40 |
| **Net** | | **~$4,512/mo** |

### 500 users (100 free / 250 Daily Logs / 150 Mentor)
| Tier | Users | MRR |
|------|-------|-----|
| Daily Logs | 250 | $4,750 |
| Mentor | 150 | $5,850 |
| **Total MRR** | | **$10,600** |
| AI costs (400 users × $0.46) | | -$184 |
| VPS + GPU (consider self-hosted at this scale) | | -$300 |
| **Net** | | **~$10,116/mo** |

---

## Action Items

- [ ] Switch `/api/transcribe` to `gpt-4o-mini-transcribe` ($0.003/min)
- [ ] Switch `/api/dust-logs/structure` to `gpt-4o-mini` ($0.15/$0.60 per M)
- [ ] Test Grok 4 Fast as structuring model alternative (free credits available)
- [ ] Evaluate RTX 4090 on Vast.ai/RunPod when Daily Logs users exceed 200
- [ ] Add prompt caching for the FIELD_AI_SYSTEM_PROMPT (repeated prefix → 50% discount)

---

*Updated: 2026-02-26 | Sources: OpenAI pricing page, xAI docs, RunPod/Vast.ai/Lambda pricing, IntuitionLabs GPU comparison*
