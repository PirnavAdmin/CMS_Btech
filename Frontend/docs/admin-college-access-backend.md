# Backend handoff: Admin college context returns 403

The Admin settings page cannot load its college context. Its dependency sequence is:

1. `GET /api/auth/me/access` — obtain the authenticated account's effective access and authoritative primary college ID.
2. `GET /api/v1/colleges/{primaryCollegeId}` — read that assigned college only.
3. College-scoped academic-year and hierarchy APIs.

Frontend no longer requires a Super Admin college directory/list request for a College Admin. Do not solve this by granting SUPER_ADMIN or disabling middleware.

Please reproduce using the affected Admin account and inspect which request actually returns 403. Check the response body and correlation/trace ID, active user role codes, live role permissions, primary college assignment, college/settings active state, and whether role labels ADMIN/Administrator are mapped to the intended canonical College Admin role. The effective access response must agree with controller/repository authorization for the same primary college ID.

The checked-in ModulePermissionMiddleware recognizes `/api/v1/colleges/{id}` and explicitly permits College Admin GET requests, subject to repository ownership. Verify the deployed version and the actual active canonical role code. If `/api/auth/me/access` fails, inspect that authentication/access handler separately before investigating college CRUD permissions.

Expected: this Admin can read its own college profile and permitted academic configuration without Super Admin routes. Other-college access must still be rejected. Inactive/removed assignments must still be rejected. Database/service outages should return 503, not 403. Return the failing path, status, safe reason, trace ID and corrected Swagger response so the frontend can verify it.

Swagger was reachable with HTTP 200 during the previous check. That does not verify these authenticated Admin requests. No authenticated request trace has been available in this task.
