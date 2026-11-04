> Current reset-password route and R7 deployment marker: PASSWORD_SETUP_RESET_ROUTE_R7.md.

> Current invitation flow/build marker and REQUIRED R6 migration: COLLEGE_ADMIN_EMAIL_R6.md.

> Current build and authorization-failure deployment notes: AUTHORIZATION_503_R5.md.

> For the current invitation URL configuration and R4 build marker, see PASSWORD_SETUP_CONFIG_R4.md.

# User access and college onboarding — R3

Build marker: `cms-backend-20261102-user-onboarding-r3`.

## Root cause and delivery status
The supplied R2 package contains users GET/list/lookups only. It has no POST onboarding route and no onboarding migration. This release adds the route and supporting workflows below. It does not prove the reported running instance used the same source.

Implementation is provided for review/deployment. A .NET build, actual MySQL execution, SMTP delivery and authenticated proxy requests could not be run here (no .NET/MySQL runtime or deployment credentials). Do not call it production-verified. The frontend source/payload was not supplied; match its requests to this contract.

## Required deployment order
1. Back up the API's actual database. Read the effective DefaultConnection including environment overrides. In Workbench select that exact server/schema.
2. Run the entire `Database/AdminManagement/User_Access_Onboarding_Migration.sql`. It is re-runnable on the supplied schema, uses conditional column adds and CREATE TABLE IF NOT EXISTS, and never drops business data. MySQL DDL autocommits. Existing tables with incompatible definitions need manual comparison; IF NOT EXISTS does not repair incompatible tables.
3. The migration adds users.profile_completed, internal_identifier, academic_year_restricted and access_version, plus user_module_permissions, user_academic_year_access, user_access_audits, user_access_profiles and user_access_invitations. Existing accounts default to profile complete/unrestricted; new invited accounts explicitly start incomplete. Verify the existing global COLLEGE_ADMIN role is active. No role elevation or account deletion is performed by migration.
4. Set `PasswordSetup:BaseUrl` to the frontend origin (HTTPS; HTTP localhost allowed only for development). Configure the existing `SmtpSettings` host/port/username/password/from fields in secrets/environment. Do not put SMTP secrets in the repository. Existing email service requires STARTTLS. Frontend must serve `/activate-account` and submit the email/token/passwords to the completion endpoint below.
5. Merge/publish this Backend while retaining any newer unrelated host changes. Run `dotnet restore`, `dotnet build BTech.csproj -c Release`, then `dotnet publish BTech.csproj -c Release -o ./publish-onboarding` as separate commands. Only deploy after a successful build. Restart the correct API process; point ngrok at its actual port.
6. Verify `/api/auth/me/access` buildId and isSuperAdmin. Set CMS_BASE_URL to the frontend proxy origin and CMS_SUPERADMIN_TOKEN locally, then run `python Verification/UserOnboarding/check_proxy.py`. This performs GETs and invalid/unauthenticated POSTs only; it does not create accounts or send mail. A 400 for the empty authenticated POST proves route/model validation is reachable, not successful onboarding.
7. Perform the end-to-end acceptance checks below using a controlled test college and recipient email. No live requests were performed in this delivery.

## Exact onboarding contract
POST `/api/v1/admin/users/onboard-college`, authenticated database-verified Super Admin only:
```json
{
  "collegeCode": "TESTCOLLEGE01",
  "collegeName": "Test College",
  "collegeType": "Engineering College",
  "adminName": "College Administrator",
  "adminEmail": "admin@example.org"
}
```
No Employee ID or plaintext password field is accepted/required. An internal SYS_ identifier is generated server-side and omitted from new-user login, JWT employee identifier, profile response and admin list. Sign-in accepts the registered email as loginId.

Success: HTTP 201 `{success:true,data:{collegeId,userId,email,profileCompleted:false,invitationStatus,nextAction},correlationId}`.
College, user, role, settings, mapping, invitation hash and audit commit together. Email is sent AFTER commit. Status `sent` means SMTP accepted the message, not guaranteed inbox delivery. `failed`/`unknown` means the account still exists: use resend-invitation, never re-onboard. Unique college/email constraints prevent duplicate accounts on a repeated request. SQL errors before commit roll back the transaction. Existing COLLEGE_ADMIN role permissions remain the ceiling; configure permitted modules before handing over the account.

## APIs
All admin routes below require a live active Super Admin. College Admin/other-role management access is deliberately not introduced. Existing mapped college/module rules remain.

| Method | Route | Body / purpose |
|---|---|---|
| GET | /api/v1/admin/users | Existing pagination/search/college filter; includes profileCompleted |
| GET | /api/v1/admin/users/lookups | Active colleges/roles/status options |
| POST | /api/v1/admin/users/onboard-college | Contract above |
| POST | /api/v1/admin/users/invite | `{collegeId,fullName,email,roleIds:[2]}`; use actual role IDs from lookups |
| PUT | /api/v1/admin/users/{id} | `{fullName,roleIds:[2]}`; replaces active role assignments; email/college transfers are excluded |
| PATCH | /api/v1/admin/users/{id}/status | `{status:0}` or `{status:1}`; status is required |
| GET | /api/v1/admin/users/{id}/access | Profile/year restriction flags, user permission rows and year IDs |
| PUT | /api/v1/admin/users/{id}/permissions | `{collegeId,permissions:[{moduleKey,canView,canCreate,canEdit,canDelete,canExport}]}`; replaces overrides for the assigned college |
| PUT | /api/v1/admin/users/{id}/academic-year-access | `{restricted:true,academicYearIds:[10]}`; only years belonging to the user's college. Empty list with restricted=true denies all year access. `{restricted:false,academicYearIds:[]}` restores unrestricted year mode |
| POST | /api/v1/admin/users/{id}/resend-invitation | No body; only users awaiting password setup; minimum 60 seconds between issuances |
| POST | /api/v1/admin/users/{id}/password-reset | No body; sends a fresh reset link; does not disclose/change the password before redemption |
| GET | /api/v1/admin/users/{id}/activity | pageNumber/pageSize; onboarding/access audit history |
| GET | /api/v1/admin/users/export | CSV, first 10,000 non-deleted accounts in user ID order; formula-leading text escaped |
| GET | /api/v1/admin/roles/{roleId}/permissions?collegeId=82 | Explicit college-scoped role permission rows |
| PUT | /api/v1/admin/roles/{roleId}/permissions | Same body shape as user permissions; upserts specified module rows for that college. Unspecified modules remain unchanged |
| GET | /api/v1/account/profile | Authenticated user's own completion fields; works while incomplete |
| PUT | /api/v1/account/profile | Complete/update required self-profile fields below |

Existing global role-definition management remains available through the existing access-governance/roles APIs; this patch does not grant SUPER_ADMIN via invitation or update. Super Admin accounts and self-edits are protected from college-user management mutations.

## Password setup and profile
The email links to `/activate-account?loginId=<email>&token=<opaque-token>`. Frontend sends:
POST `/api/v1/auth/complete-account-setup`
```json
{"loginId":"admin@example.org","token":"<token-from-email>","newPassword":"<chosen-password>","confirmNewPassword":"<same-password>"}
```
New invitations use a 256-bit random token, stored as a SHA-256 hash, 24-hour expiry, one current invitation per user. Redemption locks the account and atomically consumes the token; replay/expired tokens fail. Resend replaces the hash. Passwords use BCrypt cost 12, at least 12 characters and at most 72 UTF-8 bytes. Completion revokes refresh tokens and increments access_version to reject old access JWTs. Deactivation also revokes sessions/invitations. Existing legacy setup links remain supported.

Then sign in with `{loginId:"admin@example.org",password:"<chosen-password>"}` at the existing login endpoint. Login/access responses include profileCompleted, academicYearRestricted and assignedAcademicYearIds. The access response continues to expose effective college scope and module permissions. Incomplete profiles receive 403 PROFILE_COMPLETION_REQUIRED on module requests. Auth/access and the new self-profile route remain usable.

PUT `/api/v1/account/profile`:
```json
{"fullName":"College Administrator","mobile":"9876543210","jobTitle":"College Admin","addressLine1":"College Road","city":"Hyderabad","state":"Telangana","postalCode":"500001"}
```
All fields are required. Email cannot be changed through this completion route. Completion and its audit are committed together.

## Permission and year-scope semantics / material limitation
Per-user module settings INTERSECT the live role permission ceiling. Missing overrides inherit the role. Explicit false denies; true cannot grant beyond role permissions. Super Admin retains the live-role bypass. Access responses reflect the intersection.

**Academic-year-restricted accounts currently support assigned academic-year GET list/detail only, plus auth/access/profile.** Other legacy module routes are denied with ACADEMIC_YEAR_SCOPE_REQUIRED because their existing queries do not consistently enforce a year boundary. Adding a client academicYearId query parameter is not sufficient proof of row isolation. Full operation of courses/classes/admissions/reports and other modules under a restricted year assignment still requires route-by-route repository filtering and tests. Do not enable restricted mode expecting those legacy modules to work. Unrestricted accounts retain the existing college/module restrictions. This is a safe implementation boundary, not completed integration across every academic module.

## Failure responses
- 400: invalid payload, role/college/year mismatch or invalid/expired setup token.
- 401: missing login, inactive/deleted account or invalidated access version.
- 403: unauthorized role, incomplete profile, denied permissions or unsupported restricted-year module.
- 409: duplicate college/email/mobile or resend cooldown; inspect existing records before retrying onboarding.
- 503: missing migration prerequisite or missing invite configuration. SQL exception logs retain correlation ID and server-side error details; client does not receive SQL secrets.
- SMTP failure after commit: 201 creation response with invitationStatus failed/unknown. Fix SMTP and resend.

## Validation performed and remaining acceptance tests
Performed: 52 extracted SQL statements checked against dump column/table names using SQLite EXPLAIN after removing MySQL-only interval/locking/upsert clauses. Static checks verify transaction-before-email ordering, hashed-token consumption predicates, profile defaults, generated identifiers, permission ceiling and middleware ordering. These are not a .NET build or MySQL execution.

Required on a disposable test DB:
1. Run migration twice; verify unchanged pre-existing business data and existing account access.
2. Build/publish; run proxy smoke test at both backend origin and frontend proxy origin. Test invalid JWT and ordinary-role rejection.
3. Onboard test college. Verify one college/user/role/settings/mapping/invitation/audit; verify only the intended recipient gets the invitation and no internal identifier/hash appears in public responses.
4. Force a duplicate email with a new college code; verify the attempted college insert rolls back. Simulate SMTP failure; verify one account remains and resend works without duplicate college creation.
5. Complete invitation; try reuse, expiry and concurrent redemption (only one succeeds). Verify email login and old-session rejection after reset.
6. Before profile completion, modules must deny. Complete profile; check active role permissions allow intended modules. Validate duplicate mobile and missing fields do not mark completion.
7. Add a per-user deny while using an existing token; verify immediate denial. Set a true override on a role-denied module; verify it remains denied. Check College Admin cross-college rejection.
8. Assign restricted years; verify list/detail only contain allowed years, unassigned year detail denies, and unsupported legacy routes deny even with a forged allowed-year query.
9. Deactivate/reactivate user: old tokens stay invalid. Check all mutation audits and safe CSV content.
10. Compare frontend request/response contracts. If it uses nested college/admin objects or other URL names, update its adapter to this documented contract before rollout.
