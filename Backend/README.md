# CMS B.Tech Complete Merged Backend

This .NET 8 Web API merges the supplied Backend/Uday, Vikas, and Suresh modules against the supplied `cms_btech` MySQL seed.

## Included functionality

- JWT login, refresh tokens, authorization, forgot-password/OTP support, and login auditing
- User profile with employee profile and department information
- College CRUD/search and Academic Year CRUD/activation
- College Settings CRUD aligned to the supplied `college_settings` table
- Role CRUD/deactivation using EF Core (the supplied database has no role stored procedures)
- MySQL tables, realistic seed rows, and College/Academic Year stored procedures

## Setup

1. Install .NET 8 SDK and MySQL 8.
2. In MySQL Workbench, create and select the database:

   ```sql
   CREATE DATABASE IF NOT EXISTS cms_btech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE cms_btech;
   ```

3. For the supplied database snapshot, import it while `cms_btech` is selected, then run
   `Database/IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql`.
   For a new local database, run
   `Database/CompleteDatabase/CMS_BTECH_COMPLETE_UPDATED.sql` instead.
4. Keep credentials out of `appsettings*.json`. Configure local secrets:

   ```powershell
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "server=localhost;port=3306;database=cms_btech;user=root;password=YOUR_PASSWORD;"
   dotnet user-secrets set "Jwt:Key" "YOUR_RANDOM_KEY_WITH_AT_LEAST_32_BYTES"
   dotnet user-secrets set "SmtpSettings:Username" "YOUR_SMTP_USERNAME"
   dotnet user-secrets set "SmtpSettings:Password" "YOUR_SMTP_APP_PASSWORD"
   dotnet user-secrets set "SmtpSettings:FromEmail" "YOUR_FROM_EMAIL"
   ```

   The checked-in development JWT key is for local testing only. Replace it before deployment.
5. From this folder run:

   ```powershell
   dotnet restore
   dotnet build
   dotnet run
   ```

6. Open `http://localhost:5084/swagger` (or the URL printed by `dotnet run`).

## Verification

Run the read-only database checks after import:

```cmd
mysql -u root -p cms_btech < Database\Validation\CMS_BTECH_POST_IMPORT_VALIDATION.sql
```

Run the source/API-contract checks from the project folder:

```powershell
node Scripts/verify-csharp-structure.mjs .
node Scripts/verify-api-routes.mjs .
node Scripts/verify-stored-procedures.mjs . "PATH_TO_ORIGINAL_DUMP.sql"
```

The completed runtime results are in `BACKEND_INTEGRATION_VERIFICATION_REPORT.md`
and `TestResults/`.

## Important database note

The complete SQL file drops and recreates its tables. Back up an existing `cms_btech` database before importing it. The dump contains test/seed password hashes; replace demo credentials before production use. Rotate the database and SMTP credentials that appeared in earlier project copies.

## Configuration

The project targets `net8.0` and uses Pomelo EF Core MySQL 8.x. The database name in the default connection string is `cms_btech`.
