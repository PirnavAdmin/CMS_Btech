# Meetings & Events backend integration status

The current workspace has no Meetings & Events CRUD, calendar, participant, registration, approval, notification, or venue API. `MeetingsEventsWorkspace` currently reads seeded records and saves updates in browser `localStorage`, scoped to the active college and academic year. This is useful for local UI work, but it is not shared persistence or an authorization boundary.

The backend currently exposes authenticated validation routes in `api/v1/meeting-event-validation` for event, meeting, and schedule validation. The schedule validation request requires a numeric `ClassroomId`; the current workspace uses a venue string and demo identifiers, so it cannot safely call this route without a venue mapping and persistent event identifiers. Client-side venue overlap checks are therefore only an early warning and do not prevent concurrent bookings.

## Required backend contract

Before production use, add college-scoped, authenticated endpoints and persistent records for:

- Meetings and events: list/search, create, read, update, cancel, publish, approve/reject, and audit history.
- Calendar and daily schedule: authorized records over a date range, with department/category/status filters and pagination.
- Venues: registry, availability, and atomic conflict-checked booking using stable venue IDs.
- Participants and invitations: server-selected recipients, responses, and visibility checks.
- Registrations, attendance, action items, minutes, feedback, and certificates.
- In-app notifications: user-scoped inbox, unread count, mark-read, and server-side recipient selection.

All create/edit/approval/booking operations must validate role, college, department, and record access on the server. Until these APIs exist, the browser workspace must not be treated as production data or as secure role-based access control.
