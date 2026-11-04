# R10 backend update: onboarding, invitation recovery and safe SMTP diagnostics

3 November 2026. Build: `cms-backend-20261103-invitation-diagnostics-r10`.

**The code changes are validated. The live SMTP incident is NOT established as fixed. No real invitation was sent and no live configuration/database was changed.**

## Incident evidence and remaining access

The supplied `Dumpfile2026Nov3rd.sql` contains the exact correlation `a212f14f2017446dacd443bca8be859e` in both the invitation row and preparation/failure audit rows. Its snapshot shows:

| Check | Snapshot result |
| --- | --- |
| Account | user 41, Pravallika Chinnaluru; active, not deleted |
| Primary college | 106 / REC / raghavendra engineering college; active |
| Association | active college_user_mappings -> active college_settings for college 106 |
| Role | active COLLEGE_ADMIN assignment |
| Initial setup | must_change_password=1; profile_completed=0; not completed |
| Invitation | setup; failed; two tracked attempts; failed token expired/invalidated |
| Failure category | SMTP_AUTHENTICATE_FAILED |
| Provider acceptance | smtp_accepted_at is NULL; no confirmed SMTP acceptance |
| Snapshot recipient | chinnalurupravallika678@gmail.com; re-read the LIVE record before approval |

The archive's earlier READ_FIRST/SMTP-check notes describe a MailKit `SmtpProtocolException` at AUTH against smtp.gmail.com:587, with no provider status. Original application exception logs, SMTP/provider logs and the checker output for this attempt were not supplied. That description is historical evidence, not an independently verified current exception or proof of an incorrect password. A protocol exception and an authentication rejection are distinct outcomes; see the [MailKit API documentation](https://mimekit.net/docs/html/M_MailKit_Net_Smtp_SmtpClient_AuthenticateAsync_1.htm).

The provided ngrok service was checked directly, without logging in: Swagger exposed onboarding, invitation list, resend and GET/PATCH profile routes; an anonymous invitation-list request returned 401 and `X-CMS-Build: cms-backend-20261103-invitation-recovery-r9`. This verifies the exposed build marker/routes and authorization requirement only. It does not prove binary/source equivalence or expose effective SMTP settings, live user state, sender verification or provider restrictions.

No host shell, authenticated deployment-log connection, provider console, current Super Admin session or service secrets were available. Source SMTP credentials are blank and no SMTP secrets were injected into this workspace; this does NOT establish that deployed credentials are missing. Credentials were never guessed, printed or supplied as mock production values.

## What changed

- `POST /api/v1/admin/users/email-diagnostics`: checks the options/configuration loaded by this API process, using mandatory TLS and the exact SMTP authentication overload used by real invitations. No MAIL/RCPT/DATA, message, token creation, account change or resend. Requires current database-verified Super Admin authorization. One check per process every 120 seconds, no overlap; operation bounded to 60 seconds. Normal API activity logging still applies.
- Safe diagnostics report host/port/TLS, credential-presence booleans and configuration-provider type, sender/username equality, frontend-origin/template validation, negotiated TLS, authentication mechanism, exception TYPE, allowlisted failure category, numeric SMTP/enhanced codes, and whether a partial reply was incomplete. They never return username/password values, arbitrary provider text, invitation URLs, AUTH payloads or message bodies. They cannot establish sender verification, provider sending restrictions or inbox delivery without a later approved message.
- Real email sends now use the same bounded safe metadata parser. Correlated file/console logs distinguish AUTH rejection, disconnect, malformed protocol, TLS, network and timeout failures. Previous-phase replies are cleared so an EHLO response is not presented as an AUTH failure. Error categories are saved in the existing delivery_error_code column. No transcript logging or TLS bypass was introduced.
- SMTP port 465/587 and TLS-mode mismatches, and malformed SMTP host values, fail before connecting. Provider credentials remain operator-owned settings; this is not a speculative Gmail credential fix.
- Onboarding atomically registers a non-redeemable pending invitation together with the college, administrator, role, mapping and permissions. SMTP remains after commit. A registration failure rolls the transaction back; post-commit delivery failures preserve the account. No onboarding replay, reassignment or automatic conflict resend.
- Flat fields, PascalCase JSON fields, `adminFullName`, and a nested `college` object are supported. Existing flat-field behavior is preserved. Conflicting flat/nested college codes and administrator names are rejected.
- Persisted resend cooldown is 60 seconds, including failures. A sending attempt holds a five-minute lease. Database user-row locking plus one invitation row per user serializes claims across instances; expired leases can recover. 429 returns `Retry-After` and `retryAfterSeconds`.
- Reservation rechecks active college mapping and college-compatible roles. New tokens bind to the college at issuance. Redemption rechecks the current college/mapping/roles; expiry, SHA-256 storage, secure rotation, BCrypt password handling, refresh-token revocation and atomic single-use consumption remain enforced. Legacy token bindings remain NULL until an explicit new issuance; the patch does not overwrite existing token material.
- Failed/expired/legacy invitations remain discoverable. `invitationId=userId`. List timestamps with known UTC provenance serialize with Z; unknown historical registration times stay null. `createdAt` now means tracked invitation registration time. Setup-complete accounts without an acceptance audit are labelled `Setup Complete`, not claimed invitation acceptance. They cannot resend setup invitations.
- Success/failure/list payloads distinguish SMTP acceptance from `inboxDelivery: Unverified`. No inbox-delivery webhook or mailbox observation is claimed.
- Existing GET/PATCH `/api/v1/profile` is now available during required profile completion after password setup. Responses include the authoritative `profileCompleted` flag. A missing profile row for a pending College Admin is created on its first real profile save, without creating faculty identity, reviving deleted profiles or changing college. Validated saves update the completion flag. Existing completed users retain their flag on partial edits. The established account/profile completion fields are reused: full name, current email, mobile, designation/job title, address, city, state and PIN. Birth date/gender remain optional under that existing policy.
- No frontend, fee-management or unrelated module implementation changes. No cancellation operation is advertised.

## API examples and compatibility

Use Swagger Authorize with an existing Super Admin session. Do not share the token.

1. `GET /api/v1/admin/users/invitations` retains the deployed R9 envelope `success:true, data:{items:[...],totalCount,pageNumber,pageSize}, correlationId`.
2. `GET /api/v1/admin/users/invitations?responseFormat=array` supports the additional requested `success:true, data:[...], correlationId` envelope. This opt-in preserves existing clients that read data.items. The frontend source was not supplied, so its current parser must be checked before changing its requested format.
3. `POST /api/v1/admin/users/email-diagnostics`, with no body, authenticates only and sends no invitation. HTTP 200 is a completed diagnostic; inspect `data.authenticationConfirmed`, `configurationValid`, `frontendConfigurationValid` and `result`. Authentication success is not message acceptance.
4. Only AFTER current-recipient verification and explicit approval: `POST /api/v1/admin/users/41/resend-invitation`, with no body. Never repeat onboard-college for this incident.

Example safe diagnostic failure shape (illustrative, not claimed live evidence):

```json
{"success":false,"data":{"result":"SMTP_SERVER_DISCONNECTED","phase":"authenticate","exceptionType":"SmtpProtocolException","authenticationConfirmed":false,"emailSent":false,"smtpAccepted":false,"inboxDelivery":"Unverified"},"correlationId":"<diagnostic correlation>"}
```

Real controlled-provider rejection captured by the updated backend had `ErrorType=AuthenticationException`, `FailureCode=SMTP_AUTHENTICATION_REJECTED`, `LastReplyCode=535`, `LastReplyComplete=True`, `EnhancedCode=5.7.8`, `AuthMechanism=LOGIN`. This validates the diagnostic path on the isolated provider; it is not the live Gmail incident.

The original `ACCOUNT_INVITATION_DELIVERY_FAILED` fields are retained: saved user/college IDs, accountCreated, data.accountSaved, invitation/email state, retryAllowed, smtpAccepted, nextAction and correlationId. Added acceptance/inbox fields do not turn a failed send into success.

## Deployment order and SQL

1. Keep a backup and retain the current service's PRIVATE configuration and secrets. The deliverable appsettings.json is intentionally secret-free: DefaultConnection, Jwt:Key and the pre-existing configured default password are empty. Keep your current legitimate values privately or supply them through the existing configuration providers BEFORE starting this replacement. SMTP username/password/sender are not supplied. Do not deploy the blank secret settings over an existing working private configuration.
2. Confirm the actual running API database (server, port, database) using its startup log and your deployment procedure. Stop/quiet invitation requests while deploying; avoid an old process completing an in-flight send across the upgrade.
3. In MySQL Workbench, select that database and run the entire `Database/AdminManagement/User_Access_Invitation_Diagnostics_R10.sql`. No EF migrations. The standalone delivered SQL is the same file. Do NOT import the full dump over live data.
4. The repeatable SQL includes R9 prerequisites plus two nullable columns on user_access_invitations: `college_id` (issuance binding) and `registered_at` (known UTC registration time). No backfill, deletion, account/college update, password/token reset, reassignment or email send. DDL autocommits; use the team's deployment procedure.
5. Build `Backend/BTech.csproj`, deploy it through your normal mechanism, restart the ACTUAL service and verify `X-CMS-Build` equals the R10 marker above. Keep the existing Development UserSecretsId `BTech-CMS-Backend-2026`. A different service account/environment may load different providers. ASP.NET Core does not automatically load a plain .env file.
6. Run the authorized email-diagnostics endpoint and read the current invitation row using GET invitations or the read-only SQL. Do not invoke resend yet.
7. Share the diagnostic JSON plus sanitized application/provider evidence for the incident, without credentials or tokens. Correct the identified runtime/provider cause; restart/recheck as needed. Verify the actual FRONTEND origin independently of the ngrok API origin.
8. Show the current recipient/user/college and obtain approval before one real resend. Retain the new correlation ID. Report SMTP acceptance first; confirm external inbox receipt separately.

Configuration keys (environment variables use double underscores):

| Keys | Requirement |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | Existing legitimate API database settings; never share the value |
| `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` | Preserve the actual existing authentication configuration |
| `CredentialSettings__DefaultPassword` | Preserve legitimate existing unrelated provisioning configuration privately, if used |
| `SmtpSettings__Host`, `__Port`, `__SecurityMode` | Provider endpoint with mandatory StartTls or SslOnConnect |
| `SmtpSettings__Username`, `__Password` | Valid provider-authorized credentials from existing secret mechanisms |
| `SmtpSettings__FromEmail`, `__FromName` | Provider-authorized sender and display name |
| `PasswordSetup__BaseUrl` | Actual frontend origin; HTTPS outside Development; never infer it from the API URL |
| `PasswordSetup__LoginUrl`, `__SupportEmail` | Same-origin login URL and support address |

For an eligible Gmail password-based SMTP account, privately check the account/provider's app-password policy; do not assume that this is the incident cause. Provider guidance: https://support.google.com/accounts/answer/185833 . Never disable TLS or paste credentials into source/chat. The bundled Development configuration script prompts securely; it does not send mail.

Logs use existing ILogger console/file providers: by default `Logs/backend-YYYYMMDD.log`. Search for the exact correlation ID. Updated log metadata contains no credentials/tokens. Old logs cannot retroactively recover omitted exception details. Provider-side access is still needed if the server disconnects without a complete status reply.

Rollback: restore the R9 application binaries/configuration through the normal process. Leave the two nullable columns in place; R9 ignores them. Do not drop the invitation table or restore the entire dump to undo this additive update. Previously sent messages cannot be recalled; that is why no external test invitation was sent during preparation.

## Validation and practical limits

See `Verification/Invitations/R10_Validation.json`, `R10_HTTP_Test_Results.json`, `R10_Changed_Files.json` and `R10_Route_Preservation.json` for this run. R6-R9 files and SMTP checker Test_Results.json are historical supplied evidence, not newly executed claims.

Backend was built with .NET 8.0.427; disposable MySQL 8.0.46 was imported from the supplied dump. The SQL patch was applied twice with existing business/token data fingerprints preserved. Real MailKit used mandatory STARTTLS and authentication against a controlled local SMTP inbox with test-process-only certificate trust. Production certificate validation was not bypassed.

55 integration checks passed, including atomic registration rollback, concurrent duplicate onboarding, legacy discovery, exact saved-account recovery, current database authorization, both list envelopes, persisted cooldown/lease, duplicate resend protection, auth rejection, missing mapping/schema/database failures, rotation/expiry/replay, password setup and profile/module gating. Controlled SMTP messages stayed local; none was sent to an external recipient. Four .NET suites passed, including 14 new diagnostic/policy checks. The full build has zero errors and four pre-existing warnings.

Frontend tests/build were not run because no frontend source is attached. Pending View/Resend controls, click disabling and UI refresh therefore remain unverified; the API exposes status/retry metadata and enforces concurrency server-side. No frontend files were modified. Live SMTP authentication, provider restrictions/sender verification, the original protocol-error reason, deployment configuration changes, recipient freshness and external inbox delivery remain unverified. Multi-instance database locking uses the shared database and was exercised concurrently against one API process, not a multi-node production cluster.
