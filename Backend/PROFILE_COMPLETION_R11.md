# Employee profile completion — R11

Build: `cms-backend-20261104-profile-completion-r11`

`GET /api/v1/profile`, `PATCH /api/v1/profile` and successful `POST /api/v1/auth/login` responses include the boolean `data.profileCompleted`.

For non-student accounts, completion is calculated from saved user and active employee-profile data:

- Nonblank full name.
- Valid email address.
- Valid Indian mobile: ten ASCII digits beginning with 6–9; optional +91, 91 or 0 prefix. Surrounding whitespace is ignored.
- Nonblank current `houseNumber`.

Designation, street address, city, state and PIN are optional for this completion rule. An existing completion cache cannot force an incomplete employee profile to appear complete. PATCH rereads saved values and stores both true and false completion outcomes. Supplying `profileCompleted` in the request cannot override the calculation. Partial PATCH updates preserve omitted values. The first employee profile save can create the current active user's employee-profile row, without reviving deleted profiles. Existing student completion rules are preserved.

Employees with academic-year restrictions can GET/PATCH their own profile. Existing college and module authorization for other routes is unchanged.

## Start on your computer

The uploaded archive does not provide access to your computer, IIS, Visual Studio or deployed API. The restart verified here was an isolated local test process. Restart your actual API after replacing its backend files:

1. Stop the existing backend with Ctrl+C, Visual Studio Stop, or your configured host's normal stop action.
2. Extract this archive. Preserve your environment-specific connection string, JWT, SMTP and frontend URL settings.
3. For the rebuilt output, open a terminal in `PublishedBackend` and run:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = 'http://localhost:5084'
dotnet BTech.dll
```

Alternatively, in the extracted `Backend` source folder, use the .NET 8 SDK:

```powershell
dotnet run -c Release --launch-profile http
```

The published output requires the .NET 8 ASP.NET Core runtime. Use your existing production hosting configuration for IIS or a deployed server. Check the response header `X-CMS-Build` for the R11 build ID above.

## Database

No schema change, stored-procedure replacement or EF migration is needed for the supplied `dump 4-11.sql`. It already contains `users.profile_completed`, `employee_profiles.house_number` and the employee-profile read/update procedures. Do not restore the dump over your live database to apply this code change.

## Verification

- Release build and publish succeeded with zero errors. Four warnings remain in existing, unrelated source files.
- 39 completion-policy and JSON response-contract checks passed. Run with `dotnet run --project Tests/ProfileCompletion/ProfileCompletion.Tests.csproj -c Release`.
- 35 real HTTP, database-persistence and restart checks passed against an isolated MySQL 8.0.41 server restored from all 6,538 statements of the supplied dump. See `Verification/ProfileCompletion/R11_HTTP_Test_Results.json`.
- Covered a missing employee-profile row, four-field save, optional fields, partial updates, invalid mobile/email/name, blank house number, stale cached flags in both directions, restricted academic-year account access, ignored client-supplied completion flags, and successful login/GET after stopping and starting the API process. Student login completion behavior was also checked.
- The actual user computer/deployed API was not accessed or restarted. No real invitation emails were sent.

To verify after your restart using a designated test account, run the PowerShell script in `Verification/ProfileCompletion/Verify_Profile_Completion.ps1` with `-LoginId`, `-FullName`, `-Email`, `-Mobile` and `-HouseNumber`. It prompts for the password, saves those profile values, then checks PATCH, GET and a fresh login without printing passwords or tokens. Set `-BaseUrl` if the API uses another address. Complete any mandatory password change before testing the profile.
