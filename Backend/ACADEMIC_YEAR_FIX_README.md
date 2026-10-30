# CMS_BTech — Academic Year College-Scoping Fix

This archive contains the **full backend source project** with the academic-year college-scoping fix applied. It preserves the existing source files and API routes; the academic-year code, DTOs, model, EF mapping, SQL migration, and verification guides are updated.

## Open the project
1. Extract the ZIP.
2. Open `PlacementValidation/CMS_BTech/BTech.csproj` in Visual Studio, or open that folder in a terminal.
3. Keep your existing `appsettings.json` and secrets/configuration file. It is intentionally not included in this archive so the ZIP cannot overwrite your database connection string, JWT key, or SMTP credentials.
4. Build using the commands in `ACADEMIC_YEAR_FIX_DEPLOYMENT.md`.

Visual Studio `.vs`, compiled `bin`, and generated `obj` folders are omitted intentionally. They are recreated by restore/build and can contain stale binaries from before the fix.

## SQL migration
The SQL migration is included at:
`Database/Sql/AcademicYear/AcademicYearTenantScopeMigration.sql`

A standalone copy is also supplied separately as `AcademicYearTenantScopeMigration.sql`. Back up `cms_btech` first, then run the migration once in MySQL Workbench. If the migration reports unmapped academic-year rows, stop and map those rows explicitly instead of guessing their college ownership.

## Important
The package was structurally checked, but it has not been compiled with `dotnet build` or executed against a live MySQL server in this environment. Run the build and migration in your environment, review any errors, and verify the Swagger cases before deployment.
