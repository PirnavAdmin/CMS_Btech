# CMS User Access Onboarding Repair R8 — 3 November 2026

The backend code and MySQL repair were tested in an isolated copy of the uploaded database. Your Windows/deployed API database has NOT been changed remotely. Apply the SQL repair there before using this backend.

## Confirmed root cause

Original correlation ID: `d2f205d1e3a54e8e989bf9a1e725252d`.
Uploaded log: `Backend/Logs/backend-20261103.log`, lines 2052–2088, at 2026-11-03 05:34:50 UTC.

- `PUT /api/v1/admin/users/39` returned 200.
- `POST /api/v1/admin/users/39/reset-password` resolved `users.user_id=39`, college 104, initial setup required.
- MySQL then reported **1054: Unknown column 'recipient_email' in 'field list'**, from `MySqlAccountInvitationStore.ReserveAsync`.
- This happened BEFORE SMTP sending. The email provider was not the cause of this particular 503.
- The supplied MySQL 8.0.46 dump confirms the R3/base schema is present, but the R6 invitation upgrade is missing. The existing invitation table lacks `recipient_email VARCHAR(150) NULL`, `delivery_error_code VARCHAR(80) NULL`, and `smtp_accepted_at DATETIME NULL`.
- The old error message named only the base migration. Its `CREATE TABLE IF NOT EXISTS` could not upgrade an existing invitation table, so rerunning only that old file did not add the R6 columns.

The dump contains the five base access tables (`user_module_permissions`, `user_academic_year_access`, `user_access_audits`, `user_access_profiles`, `user_access_invitations`) and the four added user columns (`profile_completed`, `internal_identifier`, `academic_year_restricted`, `access_version`). This proves schema state, rather than the execution history of a particular SQL file. No EF migration-history entry records these hand-written patches.

## Architecture and actual target

ASP.NET Core/.NET 8; EF Core 8 with Pomelo plus Dapper/MySqlConnector; MySQL 8.0.46 in the supplied dump; MailKit SMTP 4.17.0.
Source `DefaultConnection` targets localhost:3306 / `cms_btech`; the dump identifies 127.0.0.1 / `cms_btech`. Deployment environment variables and User Secrets can override source settings. The uploaded failure proves the running request lacked the column; active environment overrides were not available for remote inspection.

The R8 startup log prints Build, Environment, Server, Port and Database without credentials, and checks the schema on that same connection. Confirm that target before running SQL.

## Apply the fix on your PC / API host

1. Stop the existing API: Visual Studio **Shift+F5**, or **Ctrl+C** in its terminal. Use one launch method at a time to prevent the previously observed BTech.exe file lock.
2. Extract this replacement ZIP into a fresh folder. Open `Backend/BTech.csproj` or the solution in that folder. No frontend replacement is needed.
3. Back up the actual API database. In MySQL Workbench connect to the same server/port shown by the API configuration/startup log. Select `cms_btech` only if it is the actual configured target.
4. Open and execute the ENTIRE `Backend/Database/AdminManagement/User_Access_Onboarding_Repair_R8.sql`. This single file includes the base prerequisites, missing R6 delivery columns and R8 attempt tracking. Do not re-import the full dump over live data.
5. Run `User_Access_Onboarding_Preflight_R8.sql` on the same database. Its missing-column result must be empty. It also shows types, defaults and indexes for inspection.
6. Rebuild and start the new backend once. Confirm `X-CMS-Build: cms-backend-20261103-onboarding-schema-email-r8` and `User access schema verified` in the new startup log.
7. Retry the existing account, **do not create it again**: `POST /api/v1/admin/users/39/reset-password` with the authorized Super Admin token. Retain its new `X-Correlation-ID`. Confirm `smtpAccepted:true` and the recipient inbox separately.

The migration is MySQL-specific, additive and repeatable. It does not drop tables, delete users, reset passwords, overwrite grants, seed permissive roles or modify existing invitation token values. DDL autocommits, so use a backed-up database and a deployment window. It adds missing columns, rather than assuming CREATE IF NOT EXISTS updates tables. Existing primary keys, unique token index and foreign keys are retained; their signed BIGINT types match the supplied dump. Unexpected type/index drift on another database needs review using the preflight results rather than a destructive automatic conversion.

CLI alternative (replace the user and target with the real API connection):

```powershell
mysql --host=127.0.0.1 --port=3306 --user=YOUR_DB_USER --password --database=cms_btech
```

At the MySQL prompt, using the actual extracted path with forward slashes:

```sql
SELECT DATABASE(), @@hostname, @@port;
SOURCE C:/path/to/Backend/Database/AdminManagement/User_Access_Onboarding_Repair_R8.sql;
SOURCE C:/path/to/Backend/Database/AdminManagement/User_Access_Onboarding_Preflight_R8.sql;
```

## Email configuration

Keep provider credentials in deployment secrets/environment variables. Local Development can reuse the existing `.NET UserSecretsId` **BTech-CMS-Backend-2026** under the same Windows user. Replacing/extracting the source does not transfer or erase that user's secrets. Restart the actual API process after configuration changes.

| Setting | Required value |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | Actual MySQL connection, when supplied through secrets/environment |
| `SmtpSettings__Host` | Provider SMTP host |
| `SmtpSettings__Port` | Provider port; Gmail STARTTLS normally 587 |
| `SmtpSettings__SecurityMode` | `StartTls` or `SslOnConnect`, matching the provider port |
| `SmtpSettings__Username` | Authorized sender/provider SMTP account |
| `SmtpSettings__Password` | Provider SMTP secret; for this Gmail password-based flow use an eligible account's App Password |
| `SmtpSettings__FromEmail` | Provider-authorized sender address |
| `SmtpSettings__FromName` | Sender display name |
| `PasswordSetup__BaseUrl` | Frontend origin; HTTPS outside Development; never production localhost |
| `PasswordSetup__LoginUrl` | Actual frontend login URL on the same origin; explicitly configure in production |
| `PasswordSetup__SupportEmail` | Support contact; falls back to configured sender if absent |

Development may use `http://localhost:5173` and its `/login` page. Production must use the real frontend URL. Configuration does not come from an arbitrary .env file unless the deployment loads it. A separate PowerShell window cannot update an already-running IIS/Visual Studio/API process. No SMTP credentials were added to source; the stale committed sender default was cleared.

The optional local setup helper also prompts for login URL/support email. If script execution is restricted, use Visual Studio **Manage User Secrets** or individual `dotnet user-secrets set` commands; no machine execution-policy change is required.

## Backend behavior changes

- Read-only schema checks use the actual open MySQL connection and block onboarding/edit mutations before writes when prerequisites are missing. Logs include the missing objects, target database and correlation ID; clients receive an actionable migration code.
- Existing edit requests now persist supplied email/mobile and optional module grants, rather than silently ignoring them. Duplicate email/mobile is rejected by existing global identity constraints. An email change invalidates outstanding setup invitations. College transfer through this edit operation is rejected for an explicit access review.
- Both new-college onboarding and existing-college invitations save the user, role, college mapping and supplied module grants transactionally. Employee IDs remain internal and generated.
- Email uses the current saved account address and includes recipient, college, role, login email, configured login URL, support contact, secure setup link and 24-hour expiry. HTML values are encoded.
- Tokens remain cryptographically random, hash-only in storage, single-use, scoped to the account/current recipient and expiring after 24 hours. Superseded tokens are replaced. Legacy OTP completion remains available. Old R3 invitation rows lacking a bound recipient must receive a new invitation.
- Per-account attempt count, last-attempt time, delivery state and correlation ID are recorded. The access response exposes safe status fields, never raw tokens or token hashes.
- Immediate/concurrent resend requests are throttled; a competing request receives 429. An eligible pending Active account with an existing random hash can still receive initial setup. Resend refuses completed setup; the separately authorized reset route sends a reset link without changing the current password until redemption.
- SMTP is synchronous through the existing MailKit service. Connection establishment has at most three attempts with bounded backoff. AUTH/DATA are not automatically retried after a potentially ambiguous send. No background queue existed in this module; R8 does not claim an email is queued.
- Success requires SMTP acceptance and invitation activation. Failure preserves saved account data, invalidates the failed token and returns a clear 503 with account/delivery status. Acceptance followed by a DB activation failure is `unknown`, never false success.
- Authentication, live Super Admin checks, profile readiness, role ceilings, per-user restrictions and college scope remain enforced.

Failed reset emails on a completed account now point to `/reset-password` for retry; pending invitations point to `/resend-invitation`. Failed sending does not change a completed account's password or setup flag.

Existing response fields are retained. Success adds `accountSaved:true`, `emailStatus:"SENT"` and `setupRequired` under `data`. This means provider acceptance, not a guarantee of external inbox placement. Delivery failures retain `userId`, `collegeId`, `accountCreated`, `invitationStatus`, `smtpAccepted`, `nextAction` and correlation ID, and add `data.accountSaved`, `data.emailStatus`, `data.retryAllowed`. A schema failure is not reported as a successful save.

## Executed verification

- Backend build: **0 errors, 4 pre-existing warnings** (unused catch variables and EventStore nullability).
- Actual MySQL **8.0.46**: reproduced 1054 against the supplied dump; applied repair twice; all 36 existing users and the existing role/permission/mapping data were preserved. Also tested a fresh pre-onboarding schema and its existing-user defaults without losing the legacy user.
- .NET unit suites: AccountInvitations, PasswordSetupUrl, ResetPasswordRoute **passed**. The MySQL component suite **passed**, using real transactions with a fake sender; its pre-existing test compilation issue was corrected.
- HTTP/SMTP integration: **25 checks passed across 33 requests**. The real EmailService/MailKit used STARTTLS and SMTP AUTH with normal certificate validation against a locally controlled SMTP server. **7 messages reached the controlled inbox.** The TLS test certificate was trusted only in the test process; no runtime certificate bypass was introduced.
- Original failing route on the repaired clone: `POST /api/v1/admin/users/39/reset-password` returned **200**, with SMTP acceptance and receipt at the controlled inbox for the account's saved address. Test correlation ID: `cfb477772e4d48568920b4af9b776c45`. This is a new test ID, not a fabricated production retry.
- Tested new/existing-college invitations, duplicate prevention, current-email edit/resend, role/module assignment, hashed token/expiry, initial password setup, replay/expiry rejection, profile completion, email login, allowed reads, denied writes/cross-college/admin access, concurrent throttling, provider AUTH rejection, failure-token invalidation, safe resend, schema drift before writes and database outage 503 behavior.

Evidence: `Verification/Invitations/R8_Validation.json`, `R8_SQL_Test_Results.json`, `R8_HTTP_Test_Results.json`. The isolated Linux regression harness is `Verification/Invitations/run_isolated_r8.py`; it creates its own disposable MySQL server/data folder, imports a copy of the dump and uses a controlled SMTP inbox. It verifies ownership of that server before writes/shutdown. Requirements: .NET SDK 8, MySQL 8 server/client binaries, OpenSSL, Python `pymysql requests bcrypt aiosmtpd`. Set `CMS_TEST_DUMP_PATH`; optional `CMS_TEST_MYSQLD`, `CMS_TEST_MYSQL`, `CMS_TEST_MYSQL_BASEDIR`, `CMS_TEST_DOTNET` select installed binaries. Run from the Backend folder:

```bash
python Verification/Invitations/run_isolated_r8.py
```

The execution environment required a test-only /proc visibility adapter for .NET tooling; it is not part of the delivered backend and did not replace DB, SMTP, authentication or authorization behavior.

## Routes verified

`GET /api/auth/me/access`; `GET /api/v1/admin/users`; `GET /api/v1/admin/users/lookups`; `POST /api/v1/admin/users/onboard-college`; `POST /api/v1/admin/users/invite`; `PUT /api/v1/admin/users/{userId}`; `GET /api/v1/admin/users/{userId}/access`; `POST /api/v1/admin/users/{userId}/reset-password`; `POST /api/v1/admin/users/{userId}/resend-invitation`; `POST /api/v1/auth/complete-account-setup`; `POST /api/v1/auth/login`; `PUT /api/v1/account/profile`. Department routes were used to verify allowed/denied module and college scope. The existing password-reset alias is retained and route-tested. No duplicate APIs were created.

## Remaining environment verification

Your live database still needs this patch, and the actual API needs restart/redeployment. External Gmail/provider authentication and receipt at your real test mailbox were NOT verified here because deployment access/secrets were unavailable. The test validated the frontend link URL and completed setup through the real backend API; the frontend page itself was not opened or modified. Existing academic-year restrictions on legacy modules remain enforced; this repair does not rewrite all repositories to add year-level filtering. No backend can promise that provider/network outages will never return an error; these cases now have truthful, retryable results.

## Source files modified/added

- `Configure_CMS_SMTP_Development.ps1`
- `appsettings.example.json`
- `Program.cs`
- `appsettings.json`
- `UserAccess/UserAccessManagement.cs`
- `UserAccess/UserAccessService.cs`
- `UserAccess/Requests.cs`
- `UserAccess/ModuleGrantsConverter.cs`
- `UserAccess/UserAccessController.cs`
- `Middleware/ExceptionMiddleware.cs`
- `Services/BackendBuild.cs`
- `Database/AdminManagement/User_Access_Onboarding_Preflight_R8.sql`
- `Database/AdminManagement/User_Access_Onboarding_Migration.sql`
- `Database/AdminManagement/User_Access_Onboarding_Repair_R8.sql`
- `Verification/Invitations/run_isolated_r8.py`
- `Services/Invitations/MySqlAccountInvitationStore.cs`
- `Services/Invitations/InvitationContracts.cs`
- `Services/Invitations/AccountInvitationService.cs`
- `Services/Invitations/AccountInvitationEmail.cs`
- `Services/Invitations/UserAccessSchema.cs`
- `Services/Implementations/EmailService.cs`
- `Tests/PasswordSetupUrl/PasswordSetupUrl.Tests.csproj`
- `Tests/AccountInvitationMySql/Program.cs`
- `Tests/AccountInvitations/Program.cs`

Additional deliverables are this report and the R8 verification evidence. Runtime Logs, bin/obj, IDE state and test credentials/certificates are excluded from the source ZIP. The original SQL dump is not repackaged or replaced.

Provider references: [Google App Passwords](https://support.google.com/accounts/answer/185833), [Gmail SMTP settings](https://support.google.com/mail/answer/7104828), [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-8.0).
