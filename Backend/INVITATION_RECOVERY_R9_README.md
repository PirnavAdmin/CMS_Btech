# College onboarding and invitation recovery — R9

3 November 2026. Build: `cms-backend-20261103-invitation-recovery-r9`.

## Confirmed causes

The supplied frontend already has Pending Invitations, View Existing Invitation, Resend Invitation, loading/error states and duplicate-click protection. It calls **GET /api/v1/admin/users/invitations**, which is missing from the supplied R8 backend. Recovery after a failed onboarding request could not retrieve the authoritative saved records.

The latest dump already has the R8 columns. It also proves that earlier accounts/colleges were saved before delivery failed:

| User | College | Initial setup | Invitation | Recorded cause |
| --- | --- | --- | --- | --- |
| 39 | 104 / NEC | Required | Failed | Provider detail absent |
| 40 | 105 / DNR | Required | Failed | Provider detail absent |
| 41 | 106 / REC | Required | Failed, token invalidated | SMTP_AUTHENTICATE_FAILED |

User 41's attempt was recorded at 2026-11-03 06:27:11; failure was recorded at 06:27:15. Correlation ID: **19a9e384c66f4e0f83752b20c60b30af**. This identifies failure during SMTP authentication. The underlying provider exception/log was not supplied, so an exact wrong-password/provider-policy reason is not asserted.

Users 39/40 have no saved mobile or last-attempt metadata. These are not guessed or backfilled. Their verified invitations can be resent from Pending Invitations. The wizard's strict mobile match cannot recover them from a nonmatching entered number; an authorized administrator can first save the real number through the existing edit flow.

## Backend changes

- Added the exact GET invitations endpoint already requested by the frontend. Existing authentication and the live-database Super Admin check protect it. No frontend files were changed.
- Reused one invitation per user: **invitationId equals users.user_id**, matching the existing resend route. The list also represents eligible pending accounts whose token has not yet been created.
- List fields include administrator, current email/mobile, verified college code/name, role, original account creation date, tracked last email attempt, expiry, attempts and provider-acceptance status. It never returns password hashes, raw tokens or token hashes. Untracked legacy dates stay null.
- Statuses match the existing UI: Pending Invitation, Expired, Email Failed, Not Created, Sending, Accepted and Unavailable. A failed consumed token is not mistaken for accepted setup.
- Onboard-college now detects conflicts before inserts or SMTP configuration-dependent sending. Safe recovery requires the same college code, email and nonblank mobile, an eligible College Admin account, and its existing active primary-college mapping. College names never infer ownership.
- Duplicate requests return structured 409 without creating, attaching, resending or resetting anything. Concurrent uniqueness conflicts are re-read after rollback; college creation is never automatically retried.
- Unrelated duplicates have separate COLLEGE_CODE_CONFLICT, ADMIN_EMAIL_CONFLICT and ADMIN_MOBILE_CONFLICT messages and no recoverable invitation.
- The existing resend endpoint validates the active user/college mapping. It retains the secure hash-only, single-use, 24-hour token, rotation and row-lock/cooldown checks. Concurrent sends yield one acceptance and one 429. Completed setup cannot be restarted through invitation resend.
- Persisted the college contact, university and address fields already sent by the frontend; college contact and administrator sign-in details stay separate.
- Added college/mobile/status/role IDs/names and actual module overrides to the existing user-list response. Its unchanged edit UI can now round-trip permissions without erasing them because the old list omitted them.
- Reused the existing welcome email, SMTP service, password setup, profile completion and permissions. No default password, fake email success, background queue, cancellation API or unrelated module change was introduced.

## Contracts used by the unchanged frontend

`GET /api/v1/admin/users/invitations` returns `success:true, data:{items:[...],totalCount,pageNumber,pageSize}, correlationId`. The frontend reads data.items. Default page size is 1000; larger installations can use the optional pagination parameters. The supplied UI fetches its default page.

`POST /api/v1/admin/users/onboard-college` remains 201 on actual saved account plus accepted email. A verified duplicate returns 409 with `code:ONBOARDING_ALREADY_EXISTS`, the requested review message, and data containing existingInvitation, canResend:true, creationRetried:false and emailAttempted:false. accountSaved:false means this duplicate request did not make a new save; the existing persisted record is returned explicitly. Unrelated conflicts have existingInvitation:null and canResend:false.

The frontend then fetches invitations, checks the confirmed email/mobile/college-code match and exposes View Existing Invitation / Resend Invitation / Back. It waits for an explicit resend click. View uses the safe row already retrieved; no details API is needed.

`POST /api/v1/admin/users/{userId}/resend-invitation` accepts the existing invitationId/userId. Success requires real provider acceptance and token activation, and refreshes list status. Failed delivery preserves the account and invalidates the unusable token. Failed/expired attempts rotate securely on a subsequent authorized resend. Completed accounts use the separate existing reset-password flow. A 429 prevents repeated sends; inactive/unmapped accounts and non-Super-Admin users are refused. Provider acceptance is not a guarantee of external inbox placement. No cancellation action is supported or advertised.

## Database / SQL

No new business-record edits or database objects are required on the supplied R8 schema. **User_Access_Invitation_Recovery_R9.sql** includes repeatable prerequisites and a read-only investigation query. It performs no user/college reassignment, deletion, password change or email sending. Applied twice to a copy of the latest dump, it preserved snapshots of users, colleges, roles, assignments, mappings, invitations and module permissions.

Back up and select the actual API database in MySQL Workbench, then execute the entire supplied SQL file. Source DefaultConnection points to localhost:3306 / cms_btech; environment/User Secrets can override it. Confirm the startup log's Server/Port/Database. On the supplied schema the prerequisite DDL is a no-op and the final query shows existing onboarding records. Do not re-import the full dump over live data.

CLI alternative:

```powershell
mysql --host=127.0.0.1 --port=3306 --user=YOUR_DB_USER --password --database=cms_btech
```

At the MySQL prompt, using the actual extracted path:

```sql
SELECT DATABASE(), @@hostname, @@port;
SOURCE C:/path/to/Backend/Database/AdminManagement/User_Access_Invitation_Recovery_R9.sql;
```

## SMTP and deployment still required

The REC record has a genuine authentication failure. R9 enables recovery but cannot supply valid provider credentials. Configure these in the running API's deployment secrets/environment, or the existing Development User Secrets ID `BTech-CMS-Backend-2026`:

| Settings | Purpose |
| --- | --- |
| SmtpSettings__Host / SmtpSettings__Port / SmtpSettings__SecurityMode | Actual host and matching StartTls or SslOnConnect mode |
| SmtpSettings__Username / SmtpSettings__Password | Authorized sender SMTP credentials; Gmail password-based SMTP needs an eligible sender's App Password |
| SmtpSettings__FromEmail / SmtpSettings__FromName | Provider-authorized sender |
| PasswordSetup__BaseUrl | Frontend origin; HTTPS outside local Development |
| PasswordSetup__LoginUrl | Actual login page on that origin; configure explicitly in production |
| PasswordSetup__SupportEmail | Support contact; configured sender remains the fallback |

Never commit/share the SMTP password. SMTP credentials belong to the sender account; the invitee's current saved email is the recipient. Source extraction under the same Windows user retains User Secrets, but the actual API must restart to reload settings.

Stop the old backend, extract/open the new Backend/BTech.csproj and start one instance using Visual Studio F5 or a terminal. Keep the frontend files unchanged. Point its existing ngrok/proxy at that instance's port and verify X-CMS-Build is the R9 marker above. Then view the existing REC invitation and explicitly resend after verifying SMTP authentication. Retain the new correlation ID; confirm provider acceptance and actual inbox receipt separately.

## Executed verification

- Backend build: **0 errors**, 4 pre-existing warnings. .NET 8, MySQL 8.0.46, EF/Pomelo plus Dapper/MySqlConnector and existing MailKit SMTP.
- **45 backend/MySQL/HTTP checks passed across 51 HTTP requests**, including the unchanged frontend recovery resolver consuming real backend JSON.
- Existing .NET AccountInvitations, PasswordSetupUrl and ResetPasswordRoute unit suites passed. The real-MySQL component suite passed in the integration run.
- Frontend: **7 invitation tests + 2 profile/session tests passed**; production build passed with its existing bundle-size warning.
- **405 original frontend files checked; zero source changes.** All 818 existing route attributes were preserved. The only added API is the required invitations GET.
- Real EmailService/MailKit used normal STARTTLS validation and SMTP AUTH against a controlled server. **9 messages reached its test inbox.** No certificate bypass or mock acceptance was added to runtime code.

| Required case | Result |
| --- | --- |
| First college onboarding | 201; account/mapping/role/details saved; email accepted |
| Existing college conflict | 409; no inferred association or send |
| Existing admin email/mobile conflict | Specific 409; unrelated recovery excluded |
| Onboarding committed, email failed | Saved record discoverable; exact retry yields verified recovery |
| Pending resend / original REC user 41 | Reuses account; updates status/attempt count; no duplicate user/college |
| Expired invitation | Listed as Expired; expiry and secure rotation enforced |
| Already accepted invitation | Listed Accepted; invitation resend rejected |
| Multiple/concurrent clicks | One accepted send, competing 429; one current token |
| Provider failure | SMTP AUTH rejection returns failure; token invalidated and account retained |
| First login and profile | One-use setup, email login, mandatory profile and college/module restrictions passed |
| Permission preservation | Unchanged directory/edit round trip retained module overrides |
| Mapping/auth/schema/outage | Safe rejection with 409/403/401/503 and correlation IDs |

Original user 41's successful **test** resend correlation: **58c92ee584eb4e9f80ddf58cb5f9fc85**. This is an isolated test ID, not a claimed production retry.

Evidence is under Verification/Invitations/R9_*. The Linux harness run_isolated_r9.py creates its own disposable MySQL server and controlled SMTP inbox, verifies ownership before writes/shutdown, imports a copy of the dump and applies SQL twice. Requirements: .NET SDK 8, MySQL 8 server/client, OpenSSL, Python pymysql requests bcrypt aiosmtpd. Set CMS_TEST_DUMP_PATH and optionally CMS_TEST_FRONTEND_ROOT; optional CMS_TEST_MYSQLD / CMS_TEST_MYSQL / CMS_TEST_MYSQL_BASEDIR / CMS_TEST_DOTNET select binaries. Run `python Verification/Invitations/run_isolated_r9.py` from Backend. The execution environment used a tooling-only /proc adapter; it is not included in the backend and did not replace DB/SMTP/auth behavior.

Live deployment, Windows secrets and real external/Gmail inbox delivery were unavailable here and are not claimed verified. Genuine provider/network errors remain truthful failures. The source-only ZIP excludes generated binaries/logs/IDE state and includes all original backend source files. The original SQL dump and frontend ZIP were not overwritten.

## Modified/added files

- `Controllers/V1/AdminUsersController.cs`
- `Database/AdminManagement/User_Access_Invitation_Recovery_R9.sql`
- `INVITATION_RECOVERY_R9_README.md`
- `Middleware/ExceptionMiddleware.cs`
- `START_HERE_FULL_REPLACEMENT.md`
- `Services/BackendBuild.cs`
- `Services/Invitations/UserAccessSchema.cs`
- `UserAccess/Requests.cs`
- `UserAccess/UserAccessController.cs`
- `UserAccess/UserAccessInvitations.cs`
- `UserAccess/UserAccessService.cs`
- `Verification/Invitations/R9_Frontend_Integrity.json`
- `Verification/Invitations/R9_HTTP_Test_Results.json`
- `Verification/Invitations/R9_Route_Preservation.json`
- `Verification/Invitations/R9_Validation.json`
- `Verification/Invitations/run_isolated_r9.py`

No frontend source was changed. R9_Changed_Files.json contains the checksums.
