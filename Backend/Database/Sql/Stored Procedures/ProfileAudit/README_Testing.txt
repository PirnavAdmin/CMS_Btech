PROFILE CHANGE AUDIT - TESTING

1. Execute ProfileChangeAuditStoredProcedures.sql in cms_btech.
2. Start the API and authorize Swagger.
3. GET /api/v1/profile and note current values.
4. PATCH /api/v1/profile and change one or more fields.
5. GET /api/v1/profile/change-history.

Each history item contains:
- userId: profile owner
- changedBy: authenticated user who performed the update
- changedAt: UTC database timestamp
- changedInformation: fieldName, oldValue, newValue

Existing APIs are not removed or renamed.
