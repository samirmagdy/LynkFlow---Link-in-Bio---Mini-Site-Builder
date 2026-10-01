# List email campaigns

`GET /api/campaigns?profileId={profileId}`

Returns campaign drafts and delivery outcomes for a profile. Requires a verified session, a Pro or Agency workspace, and manager-level access to the profile.

## Response

```json
{
  "data": [
    {
      "id": "cmp_…",
      "profile_id": "profile_…",
      "subject": "A short update",
      "body": "Plain text message",
      "status": "draft",
      "recipient_count": 0,
      "sent_count": 0,
      "created_at": "2026-10-01T00:00:00.000Z"
    }
  ]
}
```

Only active subscribers with explicit consent are eligible for delivery.
