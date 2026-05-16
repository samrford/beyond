# AI-Assisted Place Coordinates — Design Options

**Status:** Draft for team review
**Author:** _(add your name)_
**Date:** 2026-05-16

---

## 1. Problem & Goal

When a user builds a plan in Beyond, every activity/place is stored as a
**`PlanItem`** with a human-typed `Location` string ("Colosseum, Rome",
"that ramen place near Shibuya"). Coordinates are optional and today are only
set by the user manually clicking the Leaflet map or typing lat/lng into the
modal.

**Goal:** Add a one-action feature — "Auto-add coordinates" — that takes every
place in a plan and fills in `latitude` / `longitude` automatically, so the map
and route view light up without manual pinning.

The team is interested in using **Cloudflare Workers AI** as part of this.
This doc lays out a few ways to build it, the tradeoffs, and a recommendation.

---

## 2. What we're working with (current state)

| Thing | Where | Notes |
|---|---|---|
| Place model | `backend/internal/data/plans.go:33` (`PlanItem`) | `Name`, `Location` (free text), `Latitude *float64`, `Longitude *float64` (both **nullable**) |
| Plan shape | `Plan` → `Days[]` → `Items[]`, plus `Unassigned[]` | A plan can have many places across many days |
| Storage | PostgreSQL, Goose migrations | `latitude`/`longitude` already nullable `DOUBLE PRECISION` — **no schema change strictly required** |
| API | Go `net/http`, REST under `/v1/`, Supabase JWT, user-scoped by `sub` | e.g. `PUT /v1/plans/items/{id}` already updates coords |
| Frontend | Next.js + React Query + Leaflet/OSM | Plan detail page `app/plans/[id]/page.tsx`; place editor `components/PlanItemModal.tsx` |
| Hosting | **Fly.io** (Go backend + Next.js), not Cloudflare | Important: Workers AI would be an *external* dependency, not a co-located runtime |
| Existing AI/geo | None | No geocoder, no LLM today. OSM tiles only. |

**Key implication:** "a place" = `PlanItem.Location` (a string) → we need to turn
strings into coordinates. That is fundamentally a **geocoding** problem, with AI
as an optional accelerator.

---

## 3. The approaches

### Approach A — Pure LLM via Cloudflare Workers AI

Send the list of place names (plus plan context like name/dates/destination) to
a Workers AI text model (e.g. Llama 3.x with JSON/structured output) in **one
batched call** and ask it to return `{location, lat, lng, confidence}` per item.

- ✅ Single integration, no second vendor. Genuinely "adds AI to Beyond."
- ✅ Great at **disambiguation from context** — "Colosseum" in a plan titled
  "Rome long weekend" resolves correctly; handles messy human phrasing.
- ✅ Cheap on Workers AI; one round-trip for a whole plan.
- ❌ **Coordinate hallucination is the real risk.** LLMs approximate lat/lng
  from memory — famous landmarks land close, but obscure/ambiguous places can
  be off by hundreds of metres to many kilometres, or confidently wrong.
- ❌ Not authoritative; no real "I couldn't find this" signal.

> Honest take: good for a fast demo and for disambiguation, **not trustworthy
> on its own as the source of final coordinates.**

### Approach B — Dedicated geocoder (no LLM)

Call a real geocoding API per place: **Nominatim/OpenStreetMap** (natural fit —
we already render OSM tiles), or Mapbox/Google Geocoding.

- ✅ Accurate, authoritative coordinates with bounding boxes / match quality.
- ✅ Nominatim is free and OSM-aligned with our existing map stack.
- ❌ Not "AI" — doesn't satisfy the team's stated interest on its own.
- ❌ Struggles with vague/colloquial input ("ramen place near Shibuya").
- ❌ Nominatim usage policy: ~1 req/sec, attribution, no heavy bulk — needs
  throttling/caching or a paid provider for scale.

### Approach C — Hybrid: Workers AI normalizes, geocoder resolves ⭐ Recommended

1. **Workers AI** cleans + enriches each `Location` using plan context:
   "lunch near the Colosseum" → `"Colosseum, Rome, Italy"`; infers
   city/country from the plan when the user was lazy. Optionally returns 1–3
   candidate query strings per place in one batched call.
2. **Geocoder** (Nominatim/Mapbox) resolves the normalized string to
   **authoritative** coordinates + a confidence/match score.
3. Optionally, Workers AI picks the best candidate when the geocoder returns
   several matches.

- ✅ Best of both: AI handles messy human input + disambiguation; the geocoder
  guarantees the actual numbers are real.
- ✅ Real confidence signal → enables human-in-the-loop UX (below).
- ✅ Still a flagship AI feature, defensibly accurate.
- ❌ Two services, slightly more orchestration; needs caching to stay cheap.

### Approach D — Embeddings / vector search over a places dataset

Embed a curated POI dataset and match places via Workers AI embeddings + a
vector index.

- ❌ Heavy: dataset sourcing, ingestion, vector store, maintenance.
- Mentioned for completeness — **out of scope** for v1; revisit only if we
  build proprietary POI features later.

### Comparison

| | A: Pure LLM | B: Geocoder | C: Hybrid ⭐ | D: Embeddings |
|---|---|---|---|---|
| Coordinate accuracy | Low–Med | High | High | Med–High |
| Handles vague input | High | Low | High | Med |
| "AI feature" story | Strong | None | Strong | Strong |
| Build effort | Low | Low | Medium | High |
| Ongoing cost | Low | Low–Med | Low–Med | Med–High |
| Trustworthy as source of truth | ❌ | ✅ | ✅ | ⚠️ |

---

## 4. How Workers AI plugs into a Go-on-Fly.io stack

Beyond runs on Fly.io, so Workers AI is an external API. Three integration shapes:

1. **Go backend → Workers AI REST API directly**
   `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}`
   with a Cloudflare API token. Simplest; one new HTTP client in the Go service.
   Secrets via Fly secrets (`CF_ACCOUNT_ID`, `CF_API_TOKEN`).

2. **Standalone Cloudflare Worker microservice**
   A small Worker owns the AI + geocoding logic and a **Cloudflare KV / Cache**
   layer (cache by normalized location string → coords). Go backend calls one
   tidy endpoint. Keeps AI concerns + caching off our Fly box; easy to iterate
   on prompts without redeploying Go. Recommended if we expect volume.

3. **Cloudflare AI Gateway in front**
   Proxy through AI Gateway for caching, rate limiting, retries, analytics, and
   provider fallback (Workers AI today, swap models later). Pairs well with #1
   or #2; low effort, high observability payoff.

> Suggested path: start with **#1** for a spike, move to **#2 + #3** once we
> like the UX and want caching/observability.

---

## 5. Recommended end-to-end design (Approach C)

**New endpoint:** `POST /v1/plans/{id}/geocode`

- Auth + ownership check (reuse existing `user_id`-scoped pattern).
- Loads the plan, collects all `PlanItem`s where `latitude IS NULL OR
  longitude IS NULL` (idempotent — **never overwrite user-set coords** unless
  `?force=true`).
- One batched Workers AI call to normalize/disambiguate all pending items using
  plan name/dates as context.
- Geocode each normalized string (cached lookups first).
- Persist results; return per-item status:
  `{ itemId, lat, lng, confidence, source, status: "resolved" | "low_confidence" | "not_found" }`.

**Idempotency & safety**
- Only fill blanks by default; manual pins are sacred.
- Optional new columns (nice-to-have, not required):
  `geocode_source TEXT`, `geocode_confidence REAL`, `geocoded_at TIMESTAMP`
  (one Goose migration) for auditing and "AI vs human" UI badges.

**Human-in-the-loop UX**
- "✨ Auto-add coordinates" button on the plan detail page header.
- After the run: map flies to the new pins; low-confidence/not-found items are
  visually flagged (e.g. dashed marker / list badge) so the user can confirm or
  drag them. We surface uncertainty rather than silently trusting AI.
- Per-place "locate" button in `PlanItemModal` for one-off fixes.

**Sync vs async**
- Plans are small (handful → few dozen items). Start **synchronous** with a
  progress spinner. Only move to a background job/queue if we hit large plans
  or provider rate limits.

**Caching**
- Key on the normalized location string. Cloudflare KV (Approach #2) or a small
  Postgres `geocode_cache` table. Massively cuts cost and latency for common
  places (everyone geocodes "Eiffel Tower").

---

## 6. Implementation sketch

**Backend**
- `backend/internal/geocode/` package: `Normalizer` (Workers AI client) +
  `Resolver` (geocoder client) + `Cache`.
- New handler `GeocodePlan` wired in `cmd/server/main.go` alongside existing
  plan routes; reuse the ownership-check pattern from `handlers/plan_items.go`.
- Secrets as env/Fly secrets: `CF_ACCOUNT_ID`, `CF_API_TOKEN`, geocoder key.

**Frontend**
- `useGeocodePlan(planId)` React Query mutation → `POST /v1/plans/{id}/geocode`,
  invalidate `usePlan(id)` on success.
- Button + progress state on `app/plans/[id]/page.tsx`; confidence badges in
  the day/item list and on `OSMRoute` markers.

**No breaking changes:** lat/lng already nullable; existing manual flow untouched.

---

## 7. Cross-cutting concerns

- **Accuracy / hallucination:** the headline risk for any LLM-coord path; the
  hybrid + confidence flagging + human confirm is our mitigation.
- **Cost:** Workers AI billed by "neurons"; batching one call per plan + caching
  keeps it negligible. Track via AI Gateway.
- **Rate limits:** Nominatim ~1 req/sec + attribution; throttle + cache, or use
  a paid geocoder if we scale.
- **Privacy:** place names are low-sensitivity but we'd be sending user trip
  data to Cloudflare (+ geocoder). Worth a line in the privacy policy; avoid
  sending names/notes beyond the location string.
- **Failure handling:** partial success is normal — return per-item status,
  never block the whole plan on one bad place.
- **Security:** ownership-scoped like all plan writes; API tokens in Fly
  secrets, never client-side.

---

## 8. Open questions for the team

1. Geocoder of choice: **Nominatim** (free, OSM-aligned) vs **Mapbox/Google**
   (better quality + bulk, paid)?
2. Are we OK sending plan/place text to Cloudflare + a geocoder (privacy
   policy update)?
3. Auto-run on plan save, or explicit button only? (Recommendation: button only
   for v1 — predictable + cost-controlled.)
4. Do we want the audit columns (`geocode_source`/`confidence`) in v1, or keep
   it schema-free?
5. Integration shape: direct-from-Go spike first, or jump straight to a
   Worker + AI Gateway?

---

## 9. Suggested phasing

- **Phase 0 — Spike:** Approach A, direct Go → Workers AI, one plan, no cache.
  Validate UX and "wow" factor. ~1–2 days.
- **Phase 1 — v1:** Approach C (hybrid), `POST /v1/plans/{id}/geocode`,
  idempotent blanks-only, confidence flagging, Postgres cache.
- **Phase 2 — Harden:** Move AI/geocode + cache into a Worker behind AI
  Gateway; analytics, rate-limit handling; optional async for big plans.
