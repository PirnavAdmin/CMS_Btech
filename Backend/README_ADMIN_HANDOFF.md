# CMS_BTECH Admin backend handoff

## Status

This is a **limited, unbuilt patch**, not a verified end-to-end Admin implementation. The workspace has neither a .NET SDK nor MySQL server/client. No database was restored or changed and no HTTP request was run. Do not deploy it as a completed Admin integration without the checks below. The original frontend is not included or edited.

The attached snapshots were `btech frontend(2).zip`, `CMS_Backend_changes 10 11(2).zip`, and `local db 11 1 (1)(2).sql`. The backend ZIP contains the backend source from that snapshot with the changed files listed in `ADMIN_CHANGED_FILES.txt`; build output, user secrets, previous verification logs, samples with user data, and the original dump are excluded.

## Implemented in this patch

- `GET /api/semester` now uses Dapper and `sp_admin_semester_lookup` to filter by the authenticated, selected college, active/non-archived academic mapping, course, branch, and optional status. An exact course/branch/year query defaults to active semesters; general management lists can still include inactive semesters. The response retains `success`, `message`, and `data`, with ID/name/status fields used by the frontend.
- Multi-college College Admin requests still go through the existing live mapping check in `ModulePermissionMiddleware`. The semester lookup uses that selected effective college.
- Nested `collegeId` values and nested academic references are now examined before actions execute; DTO references in nested bulk rows are checked by `ForeignRecordScopeFilter`.
- College Admin detail, update and list requests now use the verified selected college and active mapped colleges. The previous unconditional `/api/v1/colleges` permission bypass was removed. The list/search procedures retain their signatures and result shapes while adding active mappings.
- No table or historical record was changed. SQL ZIP adds one semester procedure and changes two college directory procedures, with read-only preflight/verification queries.

## Setup and SQL order

1. Restore the supplied original dump into an **isolated MySQL 8 database** using Workbench, then select that database. Ensure its existing procedures and triggers are restored. Do not run these scripts against production first.
2. Run SQL ZIP `001_preflight.sql`. Check the result rows and confirm the selected IDs for your environment.
3. Run `002_semester_lookup.sql` in Workbench with `DELIMITER` directives enabled. This script drops/recreates *only* `sp_admin_semester_lookup`. Back up an existing definition first if one has since been added.
4. Run `003_college_directory_scope.sql`; it replaces only `sp_College_GetAllVisible` and `sp_College_SearchVisible`. Back up existing definitions first.
5. Run `004_verify.sql`. For the supplied dump, the semester call should include IDs 247 and 248; the deliberately mismatched mappings should return zero rows. Set `@admin_user_id` to a newly created disposable College Admin to check primary and secondary mapped-college visibility.
6. Set private connection, JWT and SMTP settings in a local `appsettings.json` or .NET user secrets. `appsettings.example.json` contains placeholders only. Open `BTech.slnx` in Visual Studio 2022, restore NuGet packages, run `dotnet build BTech.csproj`, then start the API.
7. Call `GET /api/semester?collegeId=111&academicYearId=63&courseId=35&branchId=33` with an authorized Admin token. Test a Super Admin, a newly invited/activated College Admin, a two-college College Admin, and a user lacking `semesters:can_view`. Check `/api/v1/colleges` list and detail for mapped and unassigned colleges. Run the same semester query with a different college, branch, year, and nested body IDs; verify 403 or no rows according to the endpoint contract. Run all workflows in the matrix with real test users and verify persistence.

Rollback for this patch: stop the updated API, run `rollback/003_restore_college_directory_scope.sql` to restore the two original definitions from the supplied dump, then `rollback/002_rollback.sql` if the semester procedure did not exist before, and redeploy the previous backend. Restore any later pre-existing procedure definitions from your own backup. The read-only scripts need no rollback.

## Actual checks in this workspace

| Check | Command | Result |
| --- | --- | --- |
| Dump mapping | `python3 work/check_dump_mapping.py` | PASS: year 63 active and not archived; course 35 / branch 33; semesters 247/248 active; 2026-2030 fee plan present. |
| Route inventory | `python3 work/generate_audit.py` | 102 Admin route patterns extracted; 86 import modules resolved. This is an inventory, not per-action coverage. |
| Adapter/procedure structure | `python3 work/verify_static.py` | 198 of 202 literal/template endpoint shapes matched a **7 November baseline** OpenAPI; four dynamic factories need contextual expansion. All 37 declared timetable lifecycle paths match current controller attributes. College procedure signatures match the dump. A procedure name missing from the dump occurs only in comments. This is static compatibility evidence, not current OpenAPI or runtime verification. |
| Frontend JavaScript syntax | `node --check work/frontend/src/api/apiEndpoints.js` and `node --check work/frontend/src/api/timetableLifecycleApi.js` | Both exit 0. |
| MySQL listener | Python socket connection to `127.0.0.1:3306` and `localhost:3306` | Neither reachable. |
| Tool availability | `command -v dotnet; command -v mysql; command -v mysqld; command -v docker` | None present. Build, SQL apply, and HTTP tests **not run**. |
| Source provenance | Compare C# files to the attached backend ZIP | Six modified C# files and one new C# file; see `ADMIN_CHANGED_FILES.txt`. This does **not** establish compilation. |

## Code findings and unresolved work

- The fee structure screen in `src/pages/fees/FeeManagement.jsx` calls `getSemesters({ courseId, branchId, academicYearId })`; `src/auth/collegeApi.js` supplies the selected `collegeId`. The dump contains the expected mapping. The new stored procedure still requires real SQL execution and the UI response to verify the dropdown.
- `src/App.jsx`, `src/components/ProtectedRoute.jsx`, and `src/auth/ScreenPermissionBoundary.jsx` guard Admin screens, while the API middleware enforces live permissions. The college list procedures previously returned only primary/created colleges. The current patch adds active mappings; the two-college allow/deny test remains unrun. `ADMIN_STATIC_VERIFICATION.json` records source-only contract counts.
- `src/pages/admin-management/UserAccessManagement.jsx` uses invitation and directory APIs. The existing `api/v1/admin/users` write controller permits only verified Super Admin. College Admin delegation is therefore **not implemented** in this patch. No permission or college grant beyond the creator's authority was tested.
- The existing faculty create flow in `Controllers/V1/FacultyManagement/FacultyCreateController.cs` still uses EF. `users.uq_users_email` and `users.uq_users_mobile` apply globally even to soft-deleted accounts; `FacultyAccountResolver` looks them up. A same-college active, unlinked account can be selected explicitly; historical account reuse and student readmission need a separately specified workflow and tests. Hard deleting users or clearing unique contacts was not done.
- Marks download uses the same `ListAsync` as the filtered list in `Controllers/V1/MarksController.cs`, but file rows were not compared to live list rows. Deletion status, audit and cross-college rules were read but not runtime-tested.
- Fee payment creation calls `sp_fc_payment_create_validated`; the dump shows a transaction and unique non-cash `transaction_reference`, plus unique receipt per payment. `src/services/verifiedFeeCollection.js` blocks concurrent/uncertain repeats in one browser session, but repeated CASH API submissions have no server idempotency key and may create another partial payment if a balance remains. The payment handlers in `src/pages/fees/FeeManagement.jsx` would need to send one stable key per intent; backend and schema changes for that key remain outstanding.
- Routes in `ADMIN_ROUTE_INVENTORY.csv` were enumerated from `src/App.jsx`; the matrix records a small set of traced actions and marks the rest unverified. Hidden permission actions, route guard edge cases, dashboards, faculty/student approval, electives, timetable, results, library, meetings and all exports require a full contract audit and integration suite.
- `src/services/feeStructureService.js` persists some hostel/transport configuration in browser storage; `src/services/resultsService.js` has a local fallback; `src/services/portals/serviceProvider.js` uses a mock portal service. A backend-only patch cannot make those actions authoritative. The corresponding frontend actions and contracts need to be changed and tested.
- Older `Verification/FrontendContractAudit_R15` records in the input archive describe tests of a different 7 November frontend/dump/backend snapshot. They were not rerun against these 11 November inputs and are not counted as current test passes.
- The new procedure enforces academic consistency but is not itself an authorization boundary. Call it only through an authenticated endpoint with live college/permission checks. Existing EF code and raw SQL in unrelated modules were retained; the requested complete SP-only conversion was not completed.

No claims of full Admin functionality or runtime success are made for this package.
