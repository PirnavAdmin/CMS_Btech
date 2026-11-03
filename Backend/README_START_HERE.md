# Updated backend and data correction — V2

Use this V2 package instead of the earlier ZIP. It includes the course/leave college-scoping fixes, faculty account-matching fixes, and the authorized faculty ownership correction.

## Run now

1. Back up your database and stop the backend.
2. In MySQL Workbench, select your existing `cms_btech` database (`USE cms_btech;`).
3. Run the complete standalone `CMS_BTech_All_Fixes_V2.sql`. It contains the schema/procedure patch, the faculty data correction, and read-only verification. It is safe to rerun if you already applied the earlier college-validation patch. Stop on any SQL error.
4. Extract `CMS_BTech_Corrected_Backend_V2.zip` to a fresh folder, configure your existing database connection, and open `BTech.csproj` in Visual Studio. Restore packages, build, and run. Command-line equivalent: `dotnet restore`, `dotnet build`, `dotnet run`.
5. Sign out and sign in again so college-related login context is refreshed. Open Faculty for college 87: the existing faculty 16 record should now be returned.

If running files from inside the ZIP instead of the combined SQL, run these files in order:
- `Database/ValidationFix_20261001/01_College_Validation_Fix.sql`
- `Database/ValidationFix_20261001/03_Faculty_Ownership_Correction.sql`
- `Database/ValidationFix_20261001/02_Verify_College_Validation.sql`

Use the patch against the existing database; do not reimport an old full dump over current data. No EF migrations are needed. Do not subsequently execute historical SQL files elsewhere in this project, because older definitions can overwrite the fixes.

## Data decisions and corrections

You authorized us to select the correction based on the related records.

| Record | Correction | Evidence |
|---|---|---|
| Faculty 16 / user 21 | Both assigned to college 87; keep department 29. | Your selected college is 87, and department 29 already belongs to college 87. The old creation action ignored the query collegeId. |
| Faculty 11 / user 17 | Both stay in college 82; faculty points to college 82's CIVIL department. | Faculty and user already agree on college 82; their old department 5 belongs to college 1. |

The correction creates a Civil Engineering department in college 82 from department 5's code/name/description if one does not already exist. The new department is active because it supports the existing active faculty record. Its generated ID is not hardcoded. An existing active CIVIL department in college 82 is reused. Original department 5, its status and HOD assignment remain unchanged; a HOD is not copied to the new department.

This is an explicit inferred correction based on the supplied dump and your authorization. The script preserves faculty/user IDs, usernames, passwords, contact details, profiles, attendance and history. It does not create a second faculty for user 21. Changes are recorded with before/after ownership values and database executor in `backend_data_repair_audit`.

The repair runs in one transaction and rolls back on failure. It checks the exact faculty/user identities, expected departments, and conflicting profile/access/academic links before changing rows. If live records have changed incompatibly since the supplied dump, the correction stops instead of overwriting them. DDL for the schema patch/audit table auto-commits in MySQL; the data repair itself is transactional.

## Backend fixes

- Courses: uniqueness is collegeId + courseCode, including inactive/deleted records. The selected query college is honored. Same code in another college is allowed. The DB key and stored-procedure/service checks agree; concurrent duplicates return 409.
- Leave types: uniqueness is collegeId + name and collegeId + code. New records require a real college. Existing shared leave records retain NULL ownership and existing policy/request references. Inactive leave types still reserve their names/codes. There is no leave-type soft-delete column.
- Faculty creation: automatic reuse requires email and mobile to identify the same user. Single-contact and split-account matches return clear conflicts. Explicit user IDs are verified. A new user and faculty commit atomically; a failed create cannot leave an orphan user.
- Faculty list/detail/search: the service now calls the existing stored-procedure repository instead of returning empty/null placeholders, so corrected records can be retrieved.
- Query/body college IDs must match when both are supplied. Departments must belong to the selected college.
- The existing global one-faculty-per-user rule remains enforced. A repeat create for user 21 correctly returns 409 because faculty 16 already exists. Open the existing record; new unlinked users can be created normally.
- Development responses and application logs identify conflicting user/faculty IDs, college IDs and record status. No passwords are logged by the added diagnostic code.

## Verified source records

The latest `sql dump.sql` contains college 87, but no BTECH course in it. BTECH belongs to college 1. Casual Leave / CL exists in the original global leave table, which had no college column. These cross-college/shared records no longer wrongly block college 87 creation.

## Validation

All 101 targeted database/API checks passed using the latest dump on local MySQL 8.0.46. The backend compiled with 0 errors and 9 existing unrelated warnings using .NET 8 and the dependency DLLs supplied in your ZIP. The original project file and package versions are unchanged; normal NuGet restore is required on your machine.

Tests cover the ownership correction, refusal of changed identities, forced transaction rollback, safe reruns, preservation of 87 other database tables, faculty list/detail/search, new faculty creation, user rollback, cross-college course/leave creation, same-college duplicates, inactive records and concurrent duplicates. Swagger loaded 322 paths. All original route/HTTP attributes and C# files are retained.

No live database was changed here. Apply the SQL to update yours. SMTP was directed at a local closed test port; no external messages were sent. Browser/UI and unrelated module workflows were not exhaustively tested. Detailed results are in `Validation/TEST_REPORT.md`.

## Additional timetable SQL

The supplied `Timetable_Validation_Changes.sql` remains unchanged under `Database/Provided_Timetable_20261001/`. It is not required for these fixes. It defines generate/publish procedures twice; its later lifecycle definitions overwrite earlier daily-limit checks. Review that separate script before relying on its daily-limit behavior. Timetable source code was not changed by this package.
