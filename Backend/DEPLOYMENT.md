# Academic Year College-Scoping Fix — Deployment Guide

## Root cause
The supplied repository queried and modified academic years globally instead of filtering by college. The supplied `academicyears` table had no `college_id`, its academic-year name unique index was global, and its active-year guard permitted only one active year across the database. The supplied JWT service emits the Super Admin role as `SuperAdmin` and does not assign that role a fixed `collegeId` claim.

## What is included
This is a full backend source project archive. Extract it and open `PlacementValidation/CMS_BTech/BTech.csproj`. The updated academic-year controller, repository, service, DTOs, model, EF mapping, migration, and Swagger tests are included. Existing API route templates are retained. The archive omits `.vs`, `bin`, and `obj` build/editor output because those files are regenerated. It intentionally omits `appsettings.json` so it cannot overwrite your existing connection string, JWT signing key, or SMTP credentials. Keep the `appsettings.json` from your own environment.

## Before SQL execution
1. Back up the `cms_btech` database.
2. Open `Database/Sql/AcademicYear/AcademicYearTenantScopeMigration.sql` in MySQL Workbench and make sure the active schema is `cms_btech`.
3. Execute the script once. It locates B.Tech using `college_code = 'BTECH001'` (fallback: exact college name).
4. The migration maps only the five confirmed legacy B.Tech year records by exact name and dates. It preserves their names, dates, status, and archive flags.
5. If the migration reports rows whose `college_id` could not be safely mapped, stop. Inspect and explicitly map each row to its real college, then rerun the migration. Do not assign unknown rows to B.Tech automatically.
6. Do not rerun the legacy global-scope script `Database/BackendTasks/03_Single_Active_AcademicYear.sql` after this migration.

## Build
Run PowerShell from the folder containing `BTech.csproj`:

```powershell
dotnet clean
dotnet restore
dotnet build
dotnet publish -c Release -o .\publish
```

If the build fails, do not deploy until the compiler error is resolved. This package was structurally reviewed, but no successful local build is claimed because the .NET SDK was unavailable in the package-building environment.

## Deploy
Deploy the contents of `publish` to the same backend host/process that serves your API URL. Stop the existing backend process/service, replace deployed application files, and restart it. Keep your existing secure production configuration. An ngrok tunnel forwards requests; it does not deploy the updated application code.

## Expected behavior
- SuperAdmin must specify the selected college, for example `GET /api/v1/academic-years?collegeId=1`.
- Non-SuperAdmin requests use the `collegeId` claim from the JWT. A conflicting college ID returns `403 Forbidden`.
- A college does not inherit another college's academic years.
- Duplicate year names and the single-active-year rule are scoped per college.
- The supplied dump has no active academic year. This migration deliberately does not activate one or change existing statuses.
