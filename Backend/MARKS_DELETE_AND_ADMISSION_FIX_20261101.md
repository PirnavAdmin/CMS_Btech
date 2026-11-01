# Marks Delete and Student Admission backend update — 1 November 2026

This package updates the backend only. Frontend source was inspected to confirm the request payload and was not changed.

## Install

1. Back up the MySQL database. Briefly pause marks writes while applying the SQL because the index change uses ALTER TABLE.
2. In MySQL Workbench, select your existing `cms_btech` schema. Run the complete `Database/Sql/Marks/Marks_Soft_Removal_20261101.sql` file. It requires the existing marks workflow schema/procedures already present in the supplied 1 November dump. It is safe to reapply. It does not import the dump, delete records, or grant permissions.
3. Deploy this backend source using your existing connection string, CORS and JWT configuration, then restart the API. No EF migration is needed.
4. Users need their existing marks module `delete` permission. College Admin does not gain a permission bypass. The script does not automatically grant delete to any role.

The admission fix changes backend JSON parsing and needs no admission schema or data changes. The separate SQL download is the same script included inside this ZIP. Do not run older marks setup scripts after this update; they contain the previous unique indexes and procedure definitions.

## Delete endpoint and frontend contract

`DELETE /api/v1/marks/{markId}`

Header: `Authorization: Bearer <accessToken>`

No request body. `markId` is `student_marks.mark_id`, not an approval ID.

Successful removal returns **200 OK**:

```json
{
  "success": true,
  "message": "Mark removed successfully.",
  "data": {
    "markId": 123,
    "removed": true,
    "previousWorkflowStatus": "DRAFT",
    "removedBy": 9,
    "removedAt": "2026-11-01T13:30:00.123456Z",
    "versionNo": 2
  }
}
```

Only DRAFT and REJECTED marks can be removed. The route uses the same entry roles as Edit: SUPER_ADMIN, COLLEGE_ADMIN, PRINCIPAL, HOD and FACULTY. Existing live module permissions still apply. The database revalidates the active account and role, college, and the same faculty ownership/allocation policy as Edit. Non-administrators, including HOD under the existing Edit policy, must own the mark and have the matching active faculty allocation.

| HTTP status | Meaning / frontend action |
|---|---|
| 200 | Close confirmation, remove the row and refresh the current list/counts. |
| 400 | Invalid mark ID; show the validation message. |
| 401 | Missing/invalid/expired authentication; use the existing sign-in flow. |
| 403 | Role, live delete permission, ownership, allocation or account scope denied. |
| 404 | Missing, already removed, or outside the authorized college. Refresh the list. |
| 409 | Submitted/approved workflow, invalid exam mapping, or concurrent change. Show the message and refresh. |

Controller-handled error example for a submitted/approved mark:

```json
{
  "success": false,
  "message": "Only DRAFT or REJECTED marks can be removed. SUBMITTED/APPROVED marks are locked.",
  "code": "MARK_DELETE_CONFLICT",
  "correlationId": "<request trace identifier>"
}
```

Other controller error codes are `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, and `CONCURRENT_CHANGE`. The existing permission middleware returns `{ "success": false, "message": "...", "statusCode": 403 }`; framework JWT/role authorization can return an empty 401/403 body. Frontend error handling must use the HTTP status and an optional server message, with a fallback such as “You do not have permission to remove this mark.”

```javascript
await axios.delete(`/api/v1/marks/${markId}`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
// On 200, close the confirmation and reload the existing list.
```

## Removal, audit and re-entry

The procedure locks the active mark, checks permission and workflow, and commits removal plus an audit event atomically. It sets `status=0`, `removed_by`, `removed_at`, `updated_by`, `updated_at`, and increments `version_no`. It retains marks values, the original workflow status, the approval row and its review metadata. Approval history gets an attributed DRAFT/REJECTED → REMOVED event.

Normal list/detail, summary/student/subject reports, CSV/JSON/XLSX downloads and exports, approval lookups, bulk preview, bulk duplicate checks and upserts exclude inactive marks. Existing workflow/Edit procedures already reject inactive marks. Audit history remains deliberately accessible through the existing authorized `GET /api/v1/marks/{markId}/approval-history` route.

The old unique keys are replaced with equivalent active-only keys, using a generated slot that is 1 for active rows and NULL for inactive rows. This preserves existing exam-ID and exam-name uniqueness for active marks while allowing multiple retained removals. A fresh entry receives a new mark ID and approval row; removed records are never reactivated. Database uniqueness also protects concurrent requests. A duplicate active single entry returns 409.

## Admission error fixed

The provided frontend uses `FS-STANDARD` as its default fee structure placeholder and sends it both as `feeStructureId` and under `formData.fees`. The previous nullable-integer DTO rejected that string during model binding; nested validation also rejected it.

The new admission-specific converter accepts null, blank and the exact `FS-STANDARD` placeholder as no shared plan selected. Positive numeric IDs and numeric strings continue to work. Unknown local IDs, zero/negative/fractional IDs, conflicting real IDs, unpublished plans and college/scope mismatches remain rejected. The placeholder cannot invent a shared fee plan or override a selected numeric plan. Existing snapshot assignment/immutability and transaction rollback checks remain enforced.

Verified a real admission save using the frontend placeholder with no selected shared plan. It creates the admission and no fabricated fee snapshot. Real selected plans still use the server's published plan and authoritative amount/schedule.

## Tests and verification

MySQL 8.0.46: restored the supplied dump into an isolated test database, applied this patch, and verified reapplication without losing marks/history.

- 46 marks checks passed, including real signed JWT requests through the production controller/service/repository and permission middleware: unauthenticated requests, role/live permission denial, inactive roles/assignments, college isolation, faculty ownership/allocation, DRAFT/REJECTED removal, SUBMITTED/APPROVED conflicts, 404 after removal, approval/audit retention, report and CSV/JSON/XLSX exclusion, bulk preview/upload/upsert, re-entry and database uniqueness, double delete, concurrent re-entry and submit/delete races.
- 97 fee/admission checks passed, including placeholder model binding and a real admission transaction, rejection of invalid IDs, published plan selection, scope isolation, snapshot retention and rollback.
- All backend C# sources (with the project's existing exclusions) and both test executables compiled with the .NET 8 C# compiler. Existing source warnings remain. The environment's SDK CLI could not inspect process metadata, so compilation used the SDK's compiler directly with resolved package/framework references, rather than claiming a successful `dotnet build`.

The tests ran against a local disposable clone, not your running API server. No live server deployment or production database update was performed.

Run in your normal .NET 8 environment after restoring the dump and applying this SQL to an isolated database whose name includes `test`:

```powershell
$env:CMS_MARKS_TEST_CONNECTION = "Server=localhost;Port=3307;Database=cms_marks_test;User ID=root;Password=<test-password>;"
dotnet run --project Tests/MarksRemoval/MarksRemoval.Tests.csproj
$env:CMS_FEE_TEST_CONNECTION = $env:CMS_MARKS_TEST_CONNECTION
dotnet run --project Tests/AcademicFeePlans/AcademicFeePlans.Tests.csproj
Remove-Item Env:CMS_MARKS_TEST_CONNECTION
Remove-Item Env:CMS_FEE_TEST_CONNECTION
```

These suites create their own fixtures and retain them for inspection. Do not point them at production.
