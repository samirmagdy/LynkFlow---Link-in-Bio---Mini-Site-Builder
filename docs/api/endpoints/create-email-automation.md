# Create an email automation

`POST /api/automations`

Creates an enabled welcome automation for consented subscribers on a profile. Automations are available to verified Pro and Agency workspaces and inherit profile permissions.

The supported trigger is currently `subscriber.created`. Each submission event is deduplicated before delivery, so retries cannot send the same automation twice for the same event.
