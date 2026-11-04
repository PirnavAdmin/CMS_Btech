# Invitation frontend URL configuration — R4

Root cause in supplied R3: appsettings.example.json has PasswordSetup:BaseUrl, while active appsettings.json has no PasswordSetup setting. The new user-access service only reads the explicit key. Legacy setup service used different fallback logic. An example settings file is not loaded automatically by ASP.NET Core.

## Changes
- Added appsettings.Development.json with PasswordSetup:BaseUrl = http://localhost:5173. All supplied launch profiles already run in Development.
- Both invitation services now use Services/PasswordSetupUrl.cs. PasswordSetup:BaseUrl takes precedence, then Frontend:BaseUrl. Development without either value uses http://localhost:5173. Multiple CORS origins are not used to guess an email destination.
- Both flows build `/activate-account?loginId=<encoded-email-or-legacy-login>&token=<encoded-token>` from the same normalized origin.
- The legacy service validates URL configuration before persisting/replacing setup tokens.
- Production/staging require a configured HTTPS non-loopback frontend origin. URLs containing paths, user information, query strings or fragments are rejected. Do not use the backend ngrok API address unless it actually serves the frontend.
- Marker: cms-backend-20261102-user-onboarding-r4.

## Local development
Use the provided Development launch profile (dotnet run --launch-profile http). If starting the API manually, set ASPNETCORE_ENVIRONMENT=Development in the process environment. The included appsettings.Development.json then selects http://localhost:5173. Vite must be running there and have an /activate-account route.

For an existing R3 checkout without applying source changes yet, adding the following to the active configuration also addresses the reported missing-key error in local development:
```json
"PasswordSetup": { "BaseUrl": "http://localhost:5173" }
```
Merge this property into the existing JSON root; do not replace connection strings or SMTP settings. Rebuild/restart for source changes; restart for configuration changes.

## Production/staging
The actual frontend origin was not supplied and is not present in the uploaded config. Set the deployment environment variable `PasswordSetup__BaseUrl` to that actual HTTPS frontend origin, then restart the API process/service. The double underscore maps to the colon in .NET configuration. Environment settings override JSON. Merely changing a developer's terminal variable does not update an already-running service; set it in the service/deployment configuration.

No production URL or running service was changed here. An ngrok API URL by itself does not identify where the frontend is hosted.

## Verification and retry
1. Build: dotnet build BTech.csproj -c Release. Build and runtime verification were not possible in this environment because the .NET SDK is absent.
2. Run standalone URL tests: dotnet run --project Tests/PasswordSetupUrl/PasswordSetupUrl.Tests.csproj. These exercise the actual resolver, environment precedence, production validation and link encoding without database/email/network calls. Test source is supplied; it has not been executed here.
3. After deployment, verify buildId cms-backend-20261102-user-onboarding-r4 at /api/auth/me/access.
4. Retry the failed onboarding with a unique college code/email, or use resend-invitation for an already-created account. R3 checks the URL before inserting college/account data, so this specific configuration failure occurs before creation. Check existing records if another attempt had a different result.
5. In a controlled test invitation, confirm invitationStatus=sent, receive the message and inspect its link. Expected local format: `http://localhost:5173/activate-account?loginId=...&token=...`. In production the prefix must be the configured frontend HTTPS origin. Do not share real tokens in logs/screenshots.
6. Complete setup in the frontend and sign in by email. SMTP acceptance does not prove inbox delivery or frontend routing; verify those separately.

The R3 database migration remains required for R3/R4 deployments. This configuration fix adds no database changes. Existing R3 restricted-academic-year module limitations still apply (see USER_ONBOARDING_R3.md).
