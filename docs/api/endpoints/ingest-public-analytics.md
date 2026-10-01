# Ingest public analytics

`POST /api/public/analytics`

Records a privacy-preserving event for a published profile. The server resolves workspace ownership from the published profile, validates block references, filters common bots, sanitizes referrers, creates a daily visitor hash, and enforces a per-IP/profile rate limit.

The endpoint does not use cookies or require visitor authentication. Creator dashboards and API analytics read the resulting Supabase events with the workspace's plan retention limit.
