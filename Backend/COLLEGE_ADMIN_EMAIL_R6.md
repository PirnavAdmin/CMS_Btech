> Current reset-password route and R7 deployment marker: PASSWORD_SETUP_RESET_ROUTE_R7.md.

# College Admin setup email repair — R6

Current marker: `cms-backend-20261102-college-admin-invitation-r6`.

## Findings in the available R5 backend
- College onboarding existed in `UserAccess/UserAccessController.cs` (POST /api/v1/admin/users/onboard-college). `Controllers/V1/AdminUsersController.cs` contained list/lookups. If these files are absent locally, the local checkout does not match this package; the running branch/assembly cannot be inferred from a ZIP.
- Onboarding bypassed IAccountSetupService and used its own sender. Setup token redemption did not require confirmed delivery, and SMTP failure could return success:true with invitationStatus failed. These defects are corrected.
- The active packaged settings contained nonblank SMTP credentials, while the example credentials were blank. The current package removes SMTP Username/Password values. Rotate the previously stored SMTP secret and supply a replacement through deployment secrets. The sender address is not a password and remains a separately configured provider-authorized identity.
- R4 Development configuration supplies http://localhost:5173. No real production frontend origin, live SMTP deployment credentials or controlled test mailbox was provided, so production configuration, provider authentication and inbox receipt were not verified here.

## Flow now implemented
1. Validate frontend origin and presence/format of SMTP configuration before creating data. This is a configuration check, not a provider connection test.
2. Create and commit college, initial College Admin, COLLEGE_ADMIN assignment, settings/mapping and audit in one transaction.
3. Call `IAccountSetupService.SendSetupLinkAsync(userId, "College Administrator")` after that commit. Invite/resend use the same service. Reset uses its reset-link method.
4. Load the saved account email. Newly onboarded pending accounts are status=1, must_change_password=1, profile_completed=0. That intended pending state is eligible. Status=0, deleted, missing email, no active role, or completed-setup accounts are rejected for setup; inactive accounts are never reactivated by the sender.
5. Reserve a cryptographically random 256-bit token as a SHA-256 hash with 24-hour expiry and delivery_status=sending. The raw token exists only in process memory and the email. Resend replaces the previous hash. Tokens are not in response bodies or logs. Only the recipient email entered during onboarding (trimmed, case preserved) is used; no sample, SMTP sender or fallback recipient is substituted.
6. Send a link under `<frontend-origin>/activate-account?loginId=<email>&token=<opaque-token>` using the existing IEmailService. No default/generated password is emailed. The stored initial password is an unshared random hash.
7. Only after SMTP SendAsync succeeds is the matching reservation marked sent and activated. Disconnect failure after successful SendAsync does not turn provider acceptance into rejection. A concurrent account deactivation/address change/superseding invitation prevents activation.
8. SMTP failure expires/consumes the attempt and records failed. If that DB update fails, the reservation remains sending and still cannot be redeemed: completion requires delivery_status=sent. If SMTP accepted but activation persistence is uncertain, return failure with smtpAccepted=true and require a resend/check rather than falsely reporting successful activation.
9. Completion locks the account/invitation, checks sent + unused + expiry + intended email + eligibility, consumes once, hashes the chosen password with BCrypt, revokes refresh tokens and invalidates older access JWTs. Previously issued legacy OTP links retain compatibility; their consumption now also uses an atomic SQL predicate.

## Delivery failure response
HTTP 503, handled outside MVC result sanitization:
```json
{
  "success": false,
  "code": "ACCOUNT_INVITATION_DELIVERY_FAILED",
  "message": "The password setup email could not be sent. The account is saved and remains pending...",
  "userId": 123,
  "collegeId": 456,
  "accountCreated": true,
  "invitationStatus": "failed",
  "smtpAccepted": false,
  "nextAction": "POST /api/v1/admin/users/123/resend-invitation",
  "correlationId": "<actual-request-id>"
}
```
IDs above are examples, not actual created accounts/logs. `unknown` indicates delivery-state persistence could not be confirmed; `not_started` indicates sending could not start after account commit. A failing resend has accountCreated=false because it uses an existing account. Frontend must retain the IDs and offer resend; it must not blindly repeat college creation. The earlier success:true/failed behavior is superseded.

GET `/api/v1/admin/users/{id}/access` now includes `invitation` with deliveryStatus, deliveryErrorCode, smtpAcceptedAt, createdAt, expiresAt and consumedAt. No hash/raw token is returned. The existing Super Admin-only resend and activity endpoints remain available. Resends have a 60-second cooldown and a two-minute in-flight guard.

## Database/deployment
1. Confirm the effective DefaultConnection points to the intended server/schema. Back up first.
2. If not already applied, run `Database/AdminManagement/User_Access_Onboarding_Migration.sql` (R3).
3. Run the new `Database/AdminManagement/College_Admin_Invitation_Delivery_R6.sql`. It adds recipient_email, delivery_error_code, smtp_accepted_at; R6 rejects previously unconfirmed pending/failed attempts at redemption. Existing accounts/passwords and successful sent invitations are preserved. DDL autocommits. Deploy during a pause in onboarding/resend traffic.
4. Supply the settings below in the actual API process/service environment or secrets manager. A `.env` file is not automatically read by ASP.NET Core. Never paste real credentials into Git, screenshots or this chat.

| Environment key | Required value |
|---|---|
| PasswordSetup__BaseUrl | Actual HTTPS FRONTEND origin in production/staging; http://localhost:5173 only with Development |
| SmtpSettings__Host | Provider's SMTP host |
| SmtpSettings__Port | Usually 587 with StartTls or 465 with SslOnConnect; use provider requirements |
| SmtpSettings__SecurityMode | StartTls or SslOnConnect |
| SmtpSettings__Username | Provider-authorized SMTP login from deployment secrets |
| SmtpSettings__Password | SMTP/app password from deployment secrets |
| SmtpSettings__FromEmail | Provider-verified sender address; must be authorized for the configured login |
| SmtpSettings__FromName | Intended sender display name |

The current SMTP client uses username/password authentication over TLS. If your provider requires OAuth-only authentication, use an approved SMTP relay/app credential or implement OAuth with that provider; a blank/ordinary mailbox password will not make that policy work. No provider-specific app password was invented or configured here.

5. Verify the local checkout contains both UserAccess/UserAccessController.cs and Controllers/V1/AdminUsersController.cs, along with the Invitations service folder. Build `dotnet build BTech.csproj -c Release`, publish and restart the correct API process. Confirm X-CMS-Build and /api/auth/me/access buildId match R6.
6. Retain existing SMTP-safe logging settings; do not enable raw SMTP protocol logging, which could expose authentication commands or email bodies.

## Test status and how to verify
Performed here: source invariants for commit-before-shared-send, exact saved recipient, hashed 24-hour tokens, sent-only redemption and failure invalidation; removed original SMTP password from the new source; SMTP auth settings blank; schema checks for 58 extracted statements using SQLite EXPLAIN with MySQL-only clauses removed. One MySQL multi-table activation UPDATE is explicitly excluded from that lightweight check.

NOT performed here: .NET build, C# component tests, MySQL integration tests, real SMTP authentication/acceptance, test inbox receipt or live proxy retry. The SDK/MySQL runtime and deployment/inbox access are unavailable. No real email/account was created by this work.

Tests supplied:
- `dotnet run --project Tests/AccountInvitations/AccountInvitations.Tests.csproj`: actual invitation service with memory store/fake mail. Tests exact recipient, expiry, replay, SMTP failure, failed persistence, activation failure and resend replacement; no network/email/account writes.
- `dotnet run --project Tests/PasswordSetupUrl/PasswordSetupUrl.Tests.csproj`: actual frontend-origin resolver tests.
- `Tests/AccountInvitationMySql/AccountInvitationMySql.Tests.csproj`: actual onboarding + shared setup service + real MySQL store, fake mail. Requires CMS_INVITATION_TEST_CONNECTION whose database name ends `_invitation_test`. Use a disposable MySQL server/schema with the baseline/R3/R6 prerequisites. The original dump contains CREATE DATABASE/USE statements: adjust those in a test copy before restoring so it targets only the disposable schema. The test creates unique fixtures and attempts cleanup. It does not contact any SMTP provider.

Live acceptance test on the deployed API:
1. Set CMS_BASE_URL, CMS_AUTH_TOKEN and CMS_TEST_INBOX to a mailbox you control locally. Use the intended frontend proxy origin as CMS_BASE_URL to test that routing too.
2. Run `python Verification/Invitations/onboard_test_account.py`. This creates exactly one test college/admin and asks the API to send the real invitation. It never retries automatically.
3. Check HTTP 201, invitationStatus sent, smtpAccepted true and the returned correlation ID. A provider acceptance log does not prove inbox delivery. If HTTP 503/accountCreated true, fix the indicated configuration and resend for that user ID instead of rerunning onboarding.
4. Find matching server logs. Safe metadata includes correlation ID, user ID, connect/authenticate/send phase, provider status/error enum, SMTP host/port/sender, acceptance and activated-state result. Arbitrary provider text, credentials, email body and token are intentionally excluded. For example, a 535/authenticate failure needs provider credentials/policy review; sender/recipient rejection codes need sender authorization/delivery review. These are diagnostic examples, not captured logs.
5. Receive the message at the test inbox, verify its frontend URL, set a chosen password and confirm email sign-in. Verify replay fails, failure attempts are not redeemable and resend works for a pending account. Check spam/quarantine and provider delivery events if accepted but not received.
6. Share only the request correlation ID and sanitized provider status/phase if further diagnosis is needed. No actual correlation ID or provider-acceptance/inbox confirmation can be supplied from this environment.

Existing academic-year-restricted legacy module limitations in R3/R5 still apply; this release changes invitation delivery, not that scope integration.
