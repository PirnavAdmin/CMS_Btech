# Task 13 — Marks approval workflow

Backend-only update, 7 October 2026. Implements the Phase 4 backend task “Faculty submit; HOD approve/reject” for Marks Management. Existing HTTP routes remain present. No frontend files or EF migrations are included.

## Run these steps

1. Use your database that already contains `dump 7-10.sql`. Select that database in MySQL Workbench.
2. Execute `Database/MarksWorkflow_Task13/01_Marks_Workflow_Update.sql` in full, then `02_Marks_Workflow_Preflight.sql`. The separately supplied `CMS_BTech_Task13_Marks_Workflow.sql` combines these two files, so executing that one file is sufficient. This patch must run after any older marks scripts. It replaces five existing marks procedures and creates seven supporting procedures. It does not delete tables, marks, users, or other module procedures.
3. Open `BTech.slnx` or `BTech.csproj`. Check your existing connection string and JWT configuration. Their supplied contents were preserved.
4. From the `CMS_BTech` directory, run:

   ```powershell
   dotnet restore BTech.csproj
   dotnet build BTech.csproj -c Release
   dotnet run --project BTech.csproj
   ```

5. Use the actual listening URL shown in the console. Test through Swagger or `Task13_Marks_Workflow.http`, using separately authenticated faculty and HOD accounts. Replace the zero IDs and token placeholders in that file before sending requests.

## Required mappings in your data

The supplied dump contains a legacy mark with `exam_id=NULL` and `entered_by=NULL`. It cannot be submitted as an exam-linked faculty entry. Create a valid entry through the existing marks API using the actual exam, student and subject. The update does not guess its exam or owner.

The supplied CSE department has no assigned HOD. The existing exams reference CSE Semester 2, while the supplied CSE Semester 2 faculty allocation lacks a subject. Complete the actual mappings before testing the faculty/HOD path:

- Faculty: active user with the FACULTY role, active faculty/profile mapping, and an active allocation matching the exam's branch, semester, academic year, subject and section. An allocation with a NULL section covers sections within that academic scope; NULL subject/year values are incomplete mappings.
- HOD: active HOD role, active employee profile in the exam branch's department, and that department's `hod_user_id` pointing to the actual user. Use the existing department HOD assignment endpoint `PUT /api/v1/departments/{departmentId}/hod` with the correct `employeeProfileId`.
- Faculty submissions must reference entries created by that faculty. IDs come from the authenticated token and verified database mappings; the request cannot choose its actor.

The preflight SQL lists missing mappings and inconsistent states without changing your records. It does not assign roles or substitute employee, faculty, user, or department IDs.

## Endpoints

All paths below start with `/api/v1/marks`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/workflow/submit` | Submit a batch of owned DRAFT/REJECTED marks |
| GET | `/approvals/pending?examId=...` | Assigned HOD's pending review queue, including marks, student details and version |
| PATCH | `/approvals/{id}` | New spreadsheet contract: approve/reject one **approval ID** |
| POST | `/workflow/approve` | Existing batch approval route |
| POST | `/workflow/reject` | Existing batch rejection route |
| PUT | `/{markId}` | Existing edit route; permits DRAFT/REJECTED corrections |
| GET | `/{markId}/approval-history` | HOD/admin history; faculty can now view their own history |

Batch request fields: `examId` (positive integer), `markIds` (1–1000 unique positive integers), optional `sectionId`, optional `subjectId`, optional `remarks` (up to 500 characters). Rejection requires nonblank remarks.

PATCH request:

```json
{
  "status": "REJECTED",
  "remarks": "Correct the total and resubmit.",
  "expectedVersion": 2
}
```

Copy `approvalId` and `versionNo` from the pending queue. `expectedVersion` is optional; supplying it rejects stale decisions. `status` accepts APPROVED or REJECTED, case-insensitively.

## Behavior and compatibility

- DRAFT → SUBMITTED → APPROVED or REJECTED. Faculty can edit REJECTED marks back to DRAFT and resubmit, or directly resubmit a rejected entry. Submitted/approved marks cannot be edited.
- Every workflow batch uses one transaction and locks marks in ID order. If any ID fails validation, all mark, approval and history changes roll back.
- HOD decisions are restricted to the department attached to the exam's branch. A section's optional department field is not required.
- Existing SUPER_ADMIN, COLLEGE_ADMIN and PRINCIPAL oversight access is retained. College administrators/principals stay within their college. Even administrators cannot review their own entries or submissions.
- Wrong roles/scope return 403; missing or out-of-scope records return 404; invalid inputs return 400; invalid transitions/stale versions return 409. Errors include a correlation ID.
- Counts describe the current batch. `processedCount` is the number transitioned. For rejection, `rejectedCount` is the number returned for correction. Failed atomic batches return an error response.
- Rejected-entry bulk correction retains the existing upload endpoint. It now avoids duplicate insertion, locks existing entries, enforces ownership, resets review metadata, and records the correction in history.
- Dapper mapping was corrected for marks DTOs so snake_case database columns map to their C# properties. Other modules' mapping behavior is unchanged.

## Logs

New marks controller and repository logs record actor, operation, college, outcome and correlation information. Existing request logging remains enabled across the application. Daily files are under `Logs/backend-YYYYMMDD.log`; database request logs use the existing `api_activity_logs` procedure/table. State transitions are persisted transactionally in `marks_approval_history`. New operational messages do not include tokens or marks payloads.

```sql
SELECT * FROM api_activity_logs
WHERE route LIKE '/api/v1/marks%'
ORDER BY log_id DESC LIMIT 50;

SELECT * FROM marks_approval_history
ORDER BY history_id DESC LIMIT 50;
```

## Verification status

Source/contract checks passed: 708 original deliverable files retained, 79 controller files checked, all 490 original HTTP attributes preserved, one PATCH route added. Only six original C# files changed, all in the marks controller/DTO/service/repository layers. The five replaced procedure signatures remain compatible.

**The updated application was not compiled or run here.** This environment has no .NET SDK or MySQL client/server, and the SDK download could not connect. Database behavior, HTTP behavior and concurrent execution therefore remain unverified at runtime. Older test reports elsewhere in this supplied project predate this change and are not evidence for Task 13.

Included verification:

- `Verification/MarksWorkflow_Task13/verification_report.json`: exact checks completed and checks not run.
- `verify_static.py`: repeatable preservation/contract checks; no external Python packages required.
- `test_mysql_workflow.py`: 23 MySQL integration cases covering successful transitions, rollback, scope, self-review, invalid IDs, stale versions, competing decisions and rejected-entry bulk correction. These tests have **not been executed here**.

To run the database tests on your development machine with Python and a MySQL 8 client:

```powershell
python Verification/MarksWorkflow_Task13/test_mysql_workflow.py --run
```

The test runner creates a randomly named `cms_task13_verify_*` database, installs the actual patch twice to test re-execution, uses synthetic test accounts/marks, and deletes only that database afterward. It requires permission to create/drop its disposable database. If needed, set `MYSQL_TEST_DEFAULTS` to a MySQL client option file containing your test connection settings. The fixture SQL files are for the disposable database only; do not execute them in your application database.
