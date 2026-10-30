# Academic Year SuperAdmin JWT Role Fix

## What was corrected
- The database role repository returns role codes such as `SUPER_ADMIN`.
- The JWT service previously recognized only the exact string `SuperAdmin`.
- JWT creation now normalizes punctuation and case when deciding whether a role is Super Admin.
- For an assigned Super Admin role, the token preserves the original role claim and also includes a canonical `SuperAdmin` role claim for ASP.NET role policies.
- Only the actual Super Admin role is normalized. College Admin and other roles are not granted cross-college access.
- The academic-year controller's college ownership checks remain in place.

## Important authorization note
This code cannot and must not grant cross-college access to a College Admin. If the logged-in user does not have an active `SUPER_ADMIN` role assignment in the same database used by the API, the request should continue to be denied. Use `Database/Sql/AcademicYear/Check_SuperAdmin_Assignment.sql` to inspect the intended account's current assignment. The diagnostic SQL is read-only.

## Deploy
1. Back up your current backend folder.
2. Extract this ZIP.
3. Keep the project's existing `appsettings.json` and verify its connection string and JWT settings match the database/server you are deploying to.
4. From the directory containing `BTech.csproj`, run:
   ```powershell
   dotnet clean
   dotnet restore
   dotnet build
   dotnet publish -c Release -o .\publish
   ```
5. Deploy the published output and restart the backend process behind ngrok.
6. Sign in again to receive a fresh access token.
7. Test the academic-year API with the selected college ID.

No SQL schema migration is required for this JWT code change. The previously supplied academic-year tenant migration remains separate.

## Test
- A user with an active `SUPER_ADMIN` role should receive a token with a canonical `SuperAdmin` role claim and no fixed `collegeId` claim.
- A College Admin should retain their assigned `collegeId` and must receive `403` when selecting another college.
- If an account intended to be Super Admin still gets `403`, verify the actual account's active database role assignment and confirm the deployed API is running this build.
