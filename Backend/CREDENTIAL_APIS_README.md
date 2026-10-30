# Credential APIs - implementation notes

This change adds credential creation flows without removing or renaming existing API routes.

## Endpoints

All three endpoints require an authenticated `SUPER_ADMIN` or `COLLEGE_ADMIN` token.

- `POST /api/v1/credentials/students`
  ```json
  { "studentId": 5 }
  ```
- `POST /api/v1/credentials/teaching-faculty`
  ```json
  { "facultyId": 1 }
  ```
- `POST /api/v1/credentials/non-teaching-staff`
  ```json
  { "employeeProfileId": 19 }
  ```

The APIs assign the existing `STUDENT` and `FACULTY` roles, and the new `NON_TEACHING` role. They use `CredentialSettings:DefaultPassword` from `appsettings.json`, store only a BCrypt hash, set `must_change_password`, and email the temporary login ID/password with change-password instructions. SMTP delivery failures are logged and reported in the response; the account changes are not rolled back by a mail-server failure.

The login response includes `mustChangePassword`. A JWT issued for an account that must change its password includes a matching claim, and middleware blocks other authenticated API calls until the password is changed. After changing it, refresh the token (or sign in again) to get a token without the restriction.

## Important setup notes

1. Run `DATABASE_CREDENTIALS_ADDITIVE.sql` against the supplied `cms_btech` dump before testing. The dump already has `students.user_id` and `users.must_change_password`; the SQL only adds a unique student link, its foreign key, and the non-teaching role.
2. Set `CredentialSettings:DefaultPassword` to the college-approved temporary password before testing. Do not use the sample value in production; use a secret/configuration provider and rotate it regularly.
3. Configure SMTP with approved credentials. Do not send test messages to real users unless authorized.
4. These APIs reset the selected account to the common temporary password when called. Test only with development records.
5. The uploaded environment does not have the .NET SDK installed, so a `dotnet build` could not be run in this workspace. Please run `dotnet build` in Visual Studio/Developer PowerShell before merging or deploying.
