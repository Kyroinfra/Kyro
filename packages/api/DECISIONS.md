# DECISIONS.md

## ADR-002: Rate limiting scoped to the API-key surface

Rate limiting and usage logging apply to the shared API-key mount chain:
`/files`, `/search`, `/ask` (the billable surface — upload, retrieval and
generation). `/collections` deliberately skipped them historically and
keeps that behavior. Session (JWT) routes — auth, org, keys, usage,
webhooks — are excluded intentionally.

Since #29 one auth middleware accepts both credentials, so usage rows are
written for dashboard (JWT) traffic on the keyed surface too (`apiKeyId`
null). If plans/accounting ever need logging on non-billable endpoints,
extend the mount chain in `src/routes/index.ts` — nowhere else.

## ADR-003: Usage logging via res 'finish'; usage_daily dropped

`usageLoggerMiddleware` hooks `res.once('finish')` (#31): it fires once
the response is fully flushed for every completion shape — `res.json()`
bodies, piped file downloads, and SSE streams (`POST /ask`) alike. The
earlier `res.send` monkey-patch never logged those streaming shapes.

- `bytesOut` comes from the `Content-Length` response header when present;
  streams without it (SSE) log 0. Capturing actual written bytes is out of
  scope until a consumer needs it.
- The `usage_daily` table was dropped (migration 0010): it had zero
  writers, and `/usage` + `/usage/daily` aggregate live from `usage_logs`.
  The table exists in context only if someone later adds true
  roll-up storage (e.g. via pg_cron) — do not reintroduce it speculatively.
