# List booking requests

`GET /api/bookings?profileId={profileId}`

Returns pending, confirmed, declined, and cancelled booking requests for a profile. Requests are created only after the public booking form passes availability and duplicate-slot checks.

The endpoint requires a verified Pro or Agency workspace and profile-level manager access.
