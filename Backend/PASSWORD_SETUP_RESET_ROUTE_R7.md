# Frontend reset-password route correction — R7

Build ID / X-CMS-Build: `cms-backend-20261103-password-setup-route-r7`.

## Confirmed source cause
The R6 source registers POST `/api/v1/admin/users/{userId}/password-reset`. The frontend-reported request is POST `/api/v1/admin/users/{userId}/reset-password`. The latter route was missing from that package. This explains a route-level 404 before a user lookup. It is a confirmed package defect, not proof of the running deployment's exact failure: no specific user ID, live response headers or request log was supplied.

R7 adds the exact reset-password URL and retains password-reset as an alias. Both invoke one controller action and the shared account setup service. The canonical route permits model binding to return 400 for a nonnumeric user ID instead of silently rejecting the route as a generic 404.

## ID, scope and account eligibility
- The parameter is the account primary key `users.user_id`, returned as `data.items[].userId` by GET /api/v1/admin/users and as userId by onboarding/invite responses.
- It is NOT employeeProfileId, collegeId, user_role_id or an employee login identifier. Numeric IDs from different tables can overlap; there is no fallback lookup that could select another person's account.
- Optional body userId must equal the route. Optional collegeId may be supplied in query or body; they must agree. If supplied, the user's primary college assignment must match. The assigned college must be active/non-deleted. This route remains database-verified Super Admin-only; ordinary roles keep their restrictions.
- Lookup uses `FROM users WHERE user_id=@userId AND deleted_at IS NULL FOR UPDATE`. A missing/deleted record returns USER_ACCOUNT_NOT_FOUND with instructions identifying the correct ID field and a correlation ID.
- The action reads the live must_change_password flag. If true, it calls IAccountSetupService.SendSetupLinkAsync. Active status and the presence of a password hash do NOT disqualify an account that still needs initial setup.
- If setup is complete, it calls SendPasswordResetLinkAsync. Neither action emails an existing/default/generated password.
- Inactive, deleted, missing-email, inactive-college or role-ineligible accounts are still rejected. User management does not reactivate accounts or modify Super Admin/self accounts to bypass these restrictions.

## Endpoint contract
```http
POST /api/v1/admin/users/<users.user_id>/reset-password
Authorization: Bearer <Super-Admin-token>
Content-Type: application/json
```
No body, `{}`, or the following optional consistency checks are accepted:
```json
{"userId":123,"collegeId":82}
```
123/82 above are examples; use IDs returned by your actual API. You may alternatively supply `?collegeId=82`. If both body and query specify collegeId they must match. No recipient email or password is accepted from this request; the service reloads the account's current email when preparing the invitation.

Success is HTTP 200:
```json
{"success":true,"data":{"userId":123,"invitationStatus":"sent","smtpAccepted":true,"linkPurpose":"setup","setupRequired":true},"correlationId":"<actual-ID>"}
```
A completed account returns linkPurpose reset / setupRequired false. Success means SMTP accepted and the delivery state was activated, not confirmed inbox receipt.

R6 protections remain: 256-bit token, hash-only storage, 24-hour expiry, one active invitation per account, single-use redemption, failed/unactivated tokens rejected, correlation-aware SMTP failure response. A recent/in-flight invitation still has a resend cooldown. If onboarding already sent the email, the frontend should use that success response instead of immediately requesting a second send. Repeating clicks cannot guarantee another immediate delivery.

## Error distinctions
- 400: invalid/nonnumeric ID, body/route ID mismatch, inconsistent scope inputs.
- 401/403: missing authentication or unauthorized role/scope. USER_COLLEGE_SCOPE_MISMATCH identifies the explicit target-college mismatch.
- 404 USER_ACCOUNT_NOT_FOUND: the provided users.user_id has no non-deleted account. Inspect the actual lookup; do not guess an employee/profile ID or create duplicates.
- 409: account/college ineligible, setup-only resend after completion, or resend cooldown. Messages identify the condition.
- 503 configuration: frontend origin/SMTP missing, or schema/database unavailable.
- 503 ACCOUNT_INVITATION_DELIVERY_FAILED: SMTP/send activation failed; account remains saved. Client must not treat it as sent. Match the correlation ID to safe provider status/phase logs.

Successful lookup log template (NOT a captured runtime log):
`Password link account resolved. CorrelationId=<ID>, Lookup=users.user_id, UserId=<ID>, CollegeId=<ID>, InitialSetupRequired=<bool>`.
Missing account/scope log template:
`User account request rejected. CorrelationId=<ID>, Path=<path>, Lookup=users.user_id, UserId=<ID>, CollegeId=<ID>, Code=<specific code>`.
No actual current correlation ID or SMTP failure cause can be supplied without a live request/log.

## Deploy and verify
1. Merge this package into the checkout that actually builds/runs the API. The action is in `UserAccess/UserAccessController.cs`, service in UserAccess/UserAccessService.cs. Do not apply only the GET AdminUsersController file.
2. Build `dotnet build BTech.csproj -c Release`, publish and restart the process serving ngrok/frontend proxy. Confirm X-CMS-Build equals R7 even on a diagnostic error response. A still-generic 404 can indicate the old assembly, wrong proxy target or wrong request URL.
3. No new SQL is introduced by R7. R3 and R6 migrations must already be applied. Do not reimport a full dump.
4. Preserve actual deployment secrets and frontend origin from the R6 instructions. Production requires the real HTTPS frontend origin; Development uses http://localhost:5173. Do not put SMTP credentials into source files. A configuration value in an example file does not configure a running service.
5. Pick a pending user from the users list (must_change_password=1) and a completed user in a controlled test environment. For each, set CMS_BASE_URL, CMS_AUTH_TOKEN, CMS_USER_ID and optionally CMS_EXPECTED_COLLEGE_ID locally; run `python Verification/Invitations/reset_password.py`. It requests a real email via the exact new URL, prints safe result fields/correlation and never retries automatically.
6. Verify purpose setup for the pending account and reset for the completed account. Receive the email at the current account address, verify the frontend origin, complete once and verify replay fails. Test a nonexistent users ID and wrong college to confirm explicit lookup/scope errors before email.
7. If an error remains, collect the actual URL/method/route userId, X-CMS-Build, response body/correlation ID and matching server exception/provider status. Provider acceptance and inbox receipt cannot be inferred from the source patch.

## Tests and limits
Completed here: static route/alias, correct ID table/field, body/scope validation, flag-based setup/reset selection, no password-hash eligibility filter, structured errors and SQL identifier/parser checks (59 statements through SQLite EXPLAIN; MySQL-only clauses excluded and one activation UPDATE deferred). Python retry-script syntax and ZIP integrity checked.

Included but NOT executed here (.NET/MySQL unavailable):
- Tests/ResetPasswordRoute/ResetPasswordRoute.Tests.csproj checks the registered route/alias, unauthorized guard, invalid ID/body/scope validation and correlation before any DB/email call.
- Extended Tests/AccountInvitationMySql/AccountInvitationMySql.Tests.csproj calls the actual reset controller action/shared service for a completed existing test account and a newly invited pending account, current-email changes and wrong-college rejection, using real MySQL and mocked email. It requires a disposable migrated schema ending `_invitation_test`; see R6 setup/cleanup notes.
- R6 invitation lifecycle/URL component tests remain included.

No live user was looked up or emailed here, no build/test runtime is claimed, and the user's specific existing/new account request is not verified. The exact frontend source was not supplied; its adapter must send the userId from the account API.
