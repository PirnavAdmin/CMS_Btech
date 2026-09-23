# API and SQL test report — 8 September 2026

**422 checks passed; 0 failed.** These are executed tests against a local MySQL import and a running ASP.NET Core application, not a static review alone.

| Check | Result |
|---|---|
| Original API operations preserved | 195 of 195; none removed |
| Updated API operations exercised | 244 |
| HTTP requests made | 350 |
| Additional data/content assertions | 72 |
| CSV and JSON datasets checked | 20; both formats |
| SQL patch on fresh supplied dump | Passed |
| Same combined SQL patch applied again | Passed |
| Record counts across 9 original core tables | Preserved after both applications |
| .NET source compilation | Passed using Roslyn C# 12 and .NET 8 reference assemblies |
| Live backend runtime | ASP.NET Core 8.0.30 |
| Live test database | MySQL 8.0.46 |

## What was exercised

Every OpenAPI GET route was requested with sample IDs/required query parameters. Other operations were checked with invalid/missing input or nonexistent IDs; the existing bodyless academic-year-generation operation was exercised normally. A correct 400, 401, 403, 404, 409, or 415 can therefore represent a passing negative test. Successful CRUD was not exhaustively performed for every legacy endpoint.

Focused successful workflows covered college/department/course/branch/semester/student creation; course/branch edits; specialization persistence; semester-to-course resolution; section creation/allocation/removal; promotion and assignment/history consistency; missing-status rejection; blocked parent deactivation; permitted deactivation after dependencies are inactive; blocked child reactivation below an inactive parent; retained student history; employee and student house/permanent-address updates; nested profile forms; admission aliases and academic fields; real BCrypt login, refresh rotation, reused refresh rejection and wrong-password rejection; multipart document upload, byte-identical download and delete; Aadhaar duplicate create/update conflicts, NULL normalization and migration rerun; all 20 CSV/JSON exports, row counts, CSV headers/BOM, filename headers, filters, authorization and college scoping; API activity and status history.

The extra ZIP contained a password-strength validation change, a connection setting change, and a changed generated log. The code/configuration changes were merged. Its controller routes are unchanged from the original 195-operation baseline. The weak-password rule was tested.

The SQL test reset only an isolated local test database, imported the supplied dump, applied the exact delivered combined patch, reapplied it, compared original table record counts, then ran the portable Python suite included in this package. Production connections and real outgoing email were not used.

## Fixes confirmed by runtime testing

- Mixed MySQL collations in stored-procedure parameters and a promotion local-variable comparison no longer produce the observed 500 responses.
- Malformed mapping/status payloads are rejected before unintended writes.
- Academic hierarchy rules apply to existing mutation paths and new status aliases.
- Admissions preserve frontend field aliases, nested addresses and selected academic references.
- Profile/address changes round-trip and retain audit history.
- Exports preserve filenames, complete filtered data, and access restrictions.
- Aadhaar uniqueness returns a useful 409 response instead of a generic 500.

## Build and test limits

The environment's .NET CLI/MSBuild process could not initialize because of its process-metadata restriction. Therefore, a normal `dotnet build` was **not** verified here. The full active source set was compiled successfully with the installed Roslyn compiler against .NET 8 and the exact dependency versions from your archive, then that assembly was run for the HTTP tests. It is included in `Runtime/`. The project remains a normal .NET 8 project for restore/build in Visual Studio or a standard SDK environment.

The compile produced no errors and four warnings: one pre-existing nullable DbSet warning, two unused exception-variable warnings, and a BCrypt framework-reference compatibility warning. Real BCrypt login/refresh was successfully exercised.

SMTP delivery, OTP delivery, external postal lookup, deployment through your ngrok domain, browser click-through, load testing, concurrency stress testing, and every valid/invalid business permutation of every legacy API were not tested. Attendance, marks, and results remain future/static frontend modules with no corresponding operational tables in the supplied dump. Frontend-only fee data and unwired download handlers require frontend integration; no frontend files were changed.

## Evidence

- `Verification/api-test-results.json`: each executed request/assertion, expected case, response status, and pass/fail.
- `Verification/sql-test-results.json`: database version, repeated-application result and record counts.
- `Verification/route-preservation.json`: original and updated operation counts, with an empty missing list.
- `Verification/baseline-openapi.json` and `openapi.json`: the original and updated API contracts.
- `Verification/frontend-integrity.json`: unchanged supplied frontend source verification.
- `Tests/run_integration_tests.py`: portable rerunnable test driver; see `Tests/README.md`.
