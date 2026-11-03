# Merged backend — Ticket 176 + exam conflict protection

Open `BTech.csproj` in Visual Studio after extracting this ZIP to a new folder.

## Preserved APIs
All API route annotations in both supplied projects are retained, including APIs
outside the main Controllers folder. The existing route checker reports 470
unique routes inside Controllers, zero removed routes from either input, and all
123 checked frontend contract routes present. No route or request DTO was renamed.

Ticket 176's seven additional endpoints are included:
- GET /api/v1/exam-schedules/views
- GET /api/v1/exam-schedules/views/hall-summary
- GET /api/v1/exam-schedules/hall-allocations
- GET /api/v1/exam-schedules/hall-allocations/{allocationId}
- POST /api/v1/exam-schedules/hall-allocations
- PUT /api/v1/exam-schedules/hall-allocations/{allocationId}
- DELETE /api/v1/exam-schedules/hall-allocations/{allocationId}

Existing exam, schedule, rules, academic, admissions, attendance, roles, rooms,
faculty, student, timetable, and other API source files remain included.

## Merge decisions
- ExamManagementRepository.cs and ExamConflictGuard.cs use the conflict-protected
  version from the Exam Conflicts ZIP.
- Ticket 176's hall controller, DTOs, SQL, and documentation are included.
- Hall allocation create/update/delete share the exam scheduling MySQL named lock.
- Hall allocation create/update check primary classrooms AND allocated halls of
  other active schedules. Their own schedule is excluded. Adjacent slots are allowed.
- Inactive allocation writes skip time reservation checks. Conflicts return 409 and
  are logged. Existing capacity, seat-range, ownership, and uniqueness checks remain.
- DefaultConnection in appsettings.json is retained from Ticket 176; check its
  database credentials on your machine. Other configuration keys match both inputs.
- Program.cs, project references, and all other common C# files are preserved.
- Generated .vs, bin, obj and .git folders are omitted; Visual Studio regenerates
  its caches and build outputs. The two uploaded ZIPs are untouched.

## SQL setup
The conflict guard itself requires no migration. Ticket 176's views endpoints
require its SQL views. If not already installed, run the INCLUDED file in MySQL
Workbench before testing:

`Database/ExamManagement/Ticket_Schedules_Views_Hall_Allocation.sql`

The script targets `cms_btech`; change its USE statement only if your database
name differs. It creates the hall allocations table if missing and defines the
schedule/hall views. It is the same SQL script supplied in Ticket 176. Do not
re-import a full dump over your working database just to apply this merge.

Hall allocation endpoints require a JWT containing a valid collegeId or college_id
claim, as in the original Ticket 176 controller.

## Validation
- Both input ZIPs passed archive integrity checks.
- All input API route annotations are unchanged in the merged source.
- 470 unique Controller routes: no missing routes from either input.
- All 123 frontend routes checked by the supplied verifier are present.
- 453 C# files passed the supplied delimiter/structure check.
- 27 schedule overlap query cases passed.
- 12 hall overlap query cases and shared lock wiring assertions passed.
- Output ZIP is extracted and checked for CRC errors before delivery.

Detailed merge results: `Verification/Merge_Verification_20261006.json`.
Python query checks: `Verification/verify_exam_conflicts.py` and
`Verification/verify_hall_merge.py` (Python standard library only).

These are source and SQLite query checks. A .NET build, live MySQL integration,
Swagger, and parallel HTTP request tests could not be run in this environment
because the .NET SDK and MySQL server are unavailable. Build locally and test the
schedule and hall allocation workflows before deployment. Direct SQL writers
bypass API validation and locking.
