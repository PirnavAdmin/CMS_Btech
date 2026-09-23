# CMS BTech backend — 8 September 2026

This package combines the two supplied backend ZIPs with the backend changes for `Frontend 5.zip`. The frontend archive and its source files have not been changed. All 195 original API operations remain available; the updated API has 244 operations.

The package contains the complete source in `BTech/`, a runnable .NET 8 application in `Runtime/`, SQL changes, a Postman collection, and the executed integration tests. This guide supersedes the older integration/run-order documents retained with the original source.

## 1. Apply the SQL changes

Use MySQL 8.x and back up your database first. For a new installation, import your supplied `dump noe.sql` into `cms_btech`. For an existing installation, use the existing database.

Run **only** `BTech/Database/CMS_BTech_SQL_Changes_20260908.sql` for this update. The separately supplied `CMS_BTech_SQL_Changes_20260908.sql` is identical. In MySQL Workbench, open this file and execute the complete script with stop-on-error enabled. The account applying it needs permission to create/alter tables, routines, views, and triggers.

Do not run every historical SQL file in the project. No Entity Framework migration is needed. The combined patch includes the numbered files under `Database/Integration_20260908/` in the correct order and can be rerun.

The patch adds missing employee/student house and permanent-address columns without overwriting existing address values. Your supplied address UPDATE statements are also included in `Database/Integration_20260908/OPTIONAL_User_Provided_Address_Values.sql`; run that optional file only if those exact values still need to be loaded.

The Aadhaar change preserves the specified number on admission 7, clears that number from other admissions when admission 7 owns it, normalizes blank identifiers to NULL, and creates a unique index if one is not already present. It stops if other duplicate ownership remains unresolved. Review such duplicates using:

```sql
SELECT AadhaarNumber, COUNT(*) AS DuplicateCount
FROM studentadmissions
WHERE AadhaarNumber IS NOT NULL AND TRIM(AadhaarNumber) <> ''
GROUP BY AadhaarNumber
HAVING COUNT(*) > 1;
```

Duplicate Aadhaar create/update requests return HTTP 409 with a clear message. Multiple NULL Aadhaar values are allowed. The constraint also covers inactive/deleted admissions, matching your requested table-wide uniqueness rule.

## 2. Configure and start

The backend configuration includes the database connection setting from your latest `CMS_BTech-sep8 2.zip`. Review `ConnectionStrings:DefaultConnection`, `Jwt`, `SmtpSettings`, and `Cors:AllowedOrigins` for the environment where you run it. Environment variables can override these, for example `ConnectionStrings__DefaultConnection` and `Jwt__Key`.

To run the supplied application, install the **ASP.NET Core Runtime 8.x**, open a terminal in `Runtime/`, and run:

```bash
dotnet BTech.dll --urls http://localhost:5084
```

Open `http://localhost:5084/swagger`. The runnable folder contains the assembly used for the API tests and the same dependency versions as your project. Test database settings are not copied into its application configuration.

To build and run the source, install the .NET 8 SDK and open a terminal in `BTech/`:

```bash
dotnet restore BTech.csproj
dotnet build BTech.csproj --configuration Release
dotnet run --project BTech.csproj --launch-profile http
```

The existing HTTPS launch profile uses `https://localhost:7174`. The application needs write access to `Logs/` and `Uploads/`. Preserve your existing uploaded document files when deploying a new backend folder.

Your unchanged Vite configuration forwards `/api` to `https://abreast-curling-tutor.ngrok-free.dev`. That existing tunnel/domain must forward to this backend for the supplied frontend to reach it. Starting a different local backend URL alone does not change that proxy.

## 3. Download APIs

Use an authenticated `SUPER_ADMIN` or `COLLEGE_ADMIN` bearer token. `GET /api/v1/exports` lists all 20 datasets, available columns, supported filters, and download URLs. Every dataset supports `format=csv` (default) or `format=json`. CSV opens in Excel; these endpoints do not produce XLSX or PDF reports.

Examples:

```http
GET /api/v1/courses/download?format=csv&collegeId=1&status=active
Authorization: Bearer <accessToken>

GET /api/v1/departments/download?collegeId=1
Authorization: Bearer <accessToken>

GET /api/semester/download?branchId=1
Authorization: Bearer <accessToken>
```

See `DOWNLOAD_APIS.md` for every screen URL. Responses include `Content-Disposition`, `X-Total-Count`, and `X-Correlation-ID`; the headers are exposed through CORS. Downloads include all matching rows, independent of directory pagination. Add filters if an export exceeds 100,000 rows; the API rejects an oversized export instead of returning a partial file.

College administrators are restricted to their token's college for college-scoped datasets. Global academic years, levels, and roles are readable by administrators. The unscoped hostel/transport fee datasets require `SUPER_ADMIN`. User exports omit password hashes and authentication tokens.

The existing multipart student-document upload and authenticated binary download routes are preserved and tested.

## 4. Deactivation rules

Existing status, edit, and soft-delete routes keep their URLs. Database rules apply to those routes, so an edit cannot bypass the relationship check. An active child must have an active parent when created, reactivated, or reassigned.

| Entity being deactivated | Active dependencies that block it |
|---|---|
| Department | Courses, branches, sections, linked students and admissions |
| Course | Branches, semesters, sections, linked students and admissions |
| Branch | Semesters, sections, linked students and admissions |
| Semester | Sections, linked students and admissions |
| Section | Linked students and admissions |
| Student | Student becomes inactive; academic/profile/promotion history remains |

Reassign or deactivate the dependencies first. Cancelled, withdrawn, rejected, inactive, or deleted admissions do not block deactivation. Records are not cascade-deleted by status changes. Course/branch/semester/student relationships are checked against student records, current section assignments, and admissions; distinct student counts avoid double counting across those relationships.

Use `GET /api/v1/{entity}/{id}/dependencies` or `/deactivation-impact` for `courses`, `departments`, `branches`, `semesters`, `sections`, or `students`. The result includes `canDeactivate`, student counts, active admission counts, and child counts. Status rejection returns HTTP 400 or 409 with the reason, depending on the preserved route's implementation.

The supplied Course confirmation dialog currently counts rows from the admissions API. Its course filter and response fields are fixed, but that UI count is still an **admission count**, not the distinct-student count provided by the dependency endpoint. The backend enforces the full relationship rules regardless of the dialog text.

## 5. Logging and profile changes

Every `/api` request is logged with its controller/action, actor, route, HTTP status, duration, and correlation ID. File logging uses `Logs/backend-YYYYMMDD.log`; database activity uses `api_activity_logs`. Database logging can be configured with `Logging:Database:Enabled`. If its write fails, the middleware retains file logging.

`GET /api/v1/activity-logs` supports `screen`, `correlationId`, and `limit`. It requires `SUPER_ADMIN`. `GET /api/v1/activity-logs/status-history/{entity}/{id}` reads status history; use singular entity names such as `course` or `student`. Profile history and existing audit routes are preserved.

Employee addresses are accepted by the existing `/api/v1/profile` PATCH. Student addresses are accepted by `/api/v1/students/{studentId}/profile/personal-information`. JSON property names use camelCase, for example `houseNumber`, `permanentHouseNumber`, `permanentAddress`, `permanentCity`, `permanentDistrict`, `permanentState`, `permanentCountry`, and `permanentPincode`.

Admissions accept the frontend registration/mobile/address aliases and retain extra form fields. Academic details now retain college, department, course, branch, semester, academic year, admission/entry type, regulation, and batch. Full profile saves retain nested contact, parents, and other submitted form sections. Dedicated academic, fee, document, and promotion APIs remain the authoritative operational endpoints.

## 6. Test evidence and integration boundaries

Read `API_TEST_REPORT.md`, `Verification/`, and `Tests/README.md`. The tests run against an isolated MySQL import, not your production server. The Postman collection and actual OpenAPI specification are in `Verification/`.

The supplied frontend contains static/mock attendance, marks, results, and faculty pages; fee management uses browser localStorage. The backend exports database records and cannot export unsent browser-only data. There are no real attendance/marks/result tables in the supplied dump, so this package does not invent those records. Logs can cover requests that reach the backend; browser-only actions cannot produce server activity entries.

The supplied course/department source does not wire a download HTTP request. The new download endpoints are available for those buttons, but frontend handlers that do not call them still need wiring. No frontend file or button handler has been modified. SMTP/OTP delivery and actual browser clicks have not been verified in this environment.
