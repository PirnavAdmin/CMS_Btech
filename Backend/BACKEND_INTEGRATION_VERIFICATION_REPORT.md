# Backend API and database verification report

Date: 2026-09-04  
Backend: CMS B.Tech Phase 02 integration-ready backend  
Database input: supplied `cms_btech` MySQL dump

## Final outcome

- OpenAPI paths: **129**
- OpenAPI operations exercised: **187 / 187**
- HTTP 500 responses: **0**
- Connection failures: **0**
- Full smoke response distribution: **90 x 200**, **61 x 400**, **1 x 401**, **30 x 404**, **5 x 409**
- Frontend API contracts checked: **123**, missing: **0**
- C# source files compiled: **301**, compiler errors/warnings: **0**
- Stored procedures called by C#: **93**, missing from dump + update: **0**
- Stored procedures installed after fresh import: **173**
- Required database tables checked: **38**, missing: **0**
- Combined database installer fresh-import result: **PASS**
- Post-import integrity checks: **PASS**

Every documented operation was sent to the running API against an isolated MySQL 8.4 database. The non-2xx results were intentional negative-path checks using missing fields, nonexistent IDs, a revoked refresh token, duplicate records, or file metadata whose physical upload was not included in the supplied dump. They are valid handled responses, not server crashes.

Additional successful-path tests returned HTTP 200 for:

- login and refresh-token rotation;
- promotion eligible, failed, and detained filters;
- student search;
- Academic Level create, update, and soft-delete;
- Department create, update, status, and delete;
- Section list/detail after the Semester relationship repair.

## Errors corrected

1. Course/Semester mapping duplicates raised `InvalidOperationException` and became HTTP 500. They now return HTTP 409.
2. Expected EF/MySQL uniqueness, foreign-key, null, and check-constraint failures could escape as HTTP 500. They now return safe HTTP 400/409 responses.
3. Department create/update accepted a missing department code, allowing a database `NOT NULL` exception. Required, length, ID-range, and trimming validation was added.
4. Academic Level create accepted `{}` and inserted a blank/zero record. Required, length, range, trimming, and audit-field handling was added.
5. Section detail/list/search did not reliably return Semester data for legacy rows with null or mismatched `semester_id`. The read procedures now derive the matching Semester from Course + Branch + semester number and return the complete response fields.
6. Section search used the legacy `student_sections` source and omitted response fields. It now uses `student_section_assignments` and the current response contract.
7. Nullable model/DTO initialization issues were corrected, and duplicate EF model registration from the earlier merge remains removed.
8. The supplied dump requires a selected database. A one-file installer now creates/selects `cms_btech`, loads the dump, and applies every integration procedure/schema update.
9. Plaintext database/SMTP/JWT secrets were removed from committed configuration. Local secret setup is documented in `README.md`.

No existing API route was removed.

## Database verification

`Database/CompleteDatabase/CMS_BTECH_COMPLETE_UPDATED.sql` was imported into a fresh isolated MySQL instance with exit code 0 and no stderr. The read-only post-import validation confirmed:

- all 38 required tables exist;
- all 173 procedures are installed;
- at most one active academic year;
- no missing Semester → Course references;
- no duplicate Course/Semester mappings;
- no orphan active Student/Section assignments;
- no invalid admission-form JSON.

The supplied seed contains historic relationships that are preserved and reported for review rather than silently rewritten:

- Semesters 33–40 reference the archived Bachelor of Arts course.
- Sections 3 and 4 reference Semester 1 from a different Branch.
- Section 6 has a Course/Branch mismatch in the seed.

The corrected Section read procedures return a usable derived Semester for these legacy rows without destructively changing imported records. Review the diagnostic rows from `Database/Validation/CMS_BTECH_POST_IMPORT_VALIDATION.sql` before deciding whether your business data should be migrated.

## Reproduction commands

```powershell
dotnet restore
dotnet build
dotnet run
```

For a fresh local database, import:

```text
Database/CompleteDatabase/CMS_BTECH_COMPLETE_UPDATED.sql
```

For an already restored copy of the supplied dump, run only:

```text
Database/IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql
```

Then run the read-only validation:

```text
Database/Validation/CMS_BTECH_POST_IMPORT_VALIDATION.sql
```

Static contract checks:

```powershell
node Scripts/verify-csharp-structure.mjs .
node Scripts/verify-api-routes.mjs .
node Scripts/verify-stored-procedures.mjs . "PATH_TO_ORIGINAL_DUMP.sql"
```

## Environment-dependent checks

The supplied SQL contains database rows and document metadata, not the physical logo/document files; their download routes correctly return 404 until files are uploaded into the configured `Uploads` directory. Actual outbound OTP/forgot-password email delivery requires your SMTP secrets and was not sent during this isolated test. Rotate credentials that appeared in any earlier copy before deployment.
