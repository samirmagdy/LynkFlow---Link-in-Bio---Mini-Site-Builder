# Send email campaign

`POST /api/campaigns/{campaignId}/send`

Sends a saved draft to up to 500 active, consented subscribers for its profile. The server adds an unsubscribe link to each message and records recipient and delivery counts.

Campaigns are single-send resources. A campaign already in `sending` or `sent` state returns `409` so client retries cannot duplicate the send.

## Response

```json
{
  "data": {
    "id": "cmp_…",
    "recipientCount": 42,
    "sentCount": 42,
    "status": "sent"
  }
}
```
