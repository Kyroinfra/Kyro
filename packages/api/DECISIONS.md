## ADR-002: Rate limiting scoped to /files only

Currently rate limiting and usage logging only apply
to file routes as they are the only billable actions.
Auth and org routes are excluded intentionally.
Revisit when search and summarize endpoints are added.
