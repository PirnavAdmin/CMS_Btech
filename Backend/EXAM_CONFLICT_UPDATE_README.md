# Exam / hall / time conflict update — 6 October 2026

## What changed
Only `Repositories/Implementations/ExamManagementRepository.cs` is changed;
`Repositories/Implementations/ExamConflictGuard.cs` is added. All existing
API routes, controllers, DTOs, configuration, and unrelated modules are preserved.
The original upload and SQL dump are untouched. This is a separate complete backend copy.

The original backend already checks hall/section time clashes, validates dates and
times, rejects duplicate subject schedules, returns HTTP 409 for conflicts, and
logs failures. This update adds a MySQL named lock across validation and
exam/schedule writes, closing the simultaneous-request race.

This update also handles whole-cohort schedules with null sectionId, checks
reactivation, and preserves omitted status on PUT when deciding whether to
reserve time. It closes the gap between that backend and the supplied SQL dump:
active, non-deleted `exam_hall_allocations` now count as hall reservations alongside
`exam_schedules.classroom_id`. Updating a schedule's date/time or reactivating an
exam rechecks its allocated halls. Changing the primary classroom replaces the
old primary classroom while retaining any additional active allocations.
Older schemas without the allocations table continue to use primary classrooms.
No migration or stored procedure installation is needed for the supplied dump.

## Behavior
- Same date + overlapping times + same hall: HTTP 409, even across different cohorts.
- Same date + overlapping times + same academic cohort and section: HTTP 409.
- A null section means every section of that cohort.
- Exact, partial, and containing time overlaps are blocked.
- Adjacent intervals are allowed: an exam ending at 11:30 does not conflict with
  another starting at 11:30. Reporting time is validated but is not reserved hall time.
- Inactive or deleted schedules/exams/allocations do not reserve time.
- PUT excludes its own schedule ID. Reactivation revalidates against other active
  exams and active schedules within the exam being reactivated.
- Existing duplicate-subject rules remain unchanged, including inactive records.
- Existing invalid-time/date responses remain HTTP 400; existing conflict responses
  keep their `success`, `message`, `errors`, and `correlationId` shape.

## Run and check in Swagger
1. Extract this ZIP to a new folder and open its `BTech.csproj` in Visual Studio.
2. Keep your current database; the provided October SQL schema needs no alteration.
3. Check your existing `DefaultConnection` locally, then build and run.
4. Authorize Swagger with your JWT and GET `/api/v1/exams/1/schedules`.
5. With the supplied dump's original sample rows, PUT
   `/api/v1/exams/1/schedules/2` using the body below. Schedule 1 reserves hall 6
   on November 12 from 09:30 to 11:30; expect HTTP 409. The rejected write does
   not modify schedule 2. If your database has changed, use IDs from the GET results.

```json
{
  "subjectId": 5,
  "sectionId": 2,
  "classroomId": 6,
  "examDate": "2026-11-12",
  "startTime": "10:00",
  "endTime": "11:00",
  "reportingTime": "09:30",
  "instructions": "Conflict test",
  "status": true
}
```

6. To test an allowed adjacent interval, use the same PUT with startTime `11:30`,
   endTime `13:30`, and reportingTime `11:00`. Expect HTTP 200 if no other
   reservation overlaps. This successful test changes schedule 2: restore its
   original November 14, 09:30–11:30 values afterward.
7. PUT schedule 1 with its unchanged values (subjectId 4, sectionId 2, classroomId 6,
   November 12, 09:30–11:30) to confirm that it does not conflict with itself.

## Verification and limits
`Verification/verify_exam_conflicts.py` executes the actual generated overlap query
against SQLite fixtures with 27 assertions, including primary/allocated halls,
cohort/section conflicts, updates, reactivation, legacy schema fallback, interval
boundaries, and inactive/deleted rows. Run with Python 3 from any directory.
All 27 assertions passed. Archive comparison confirms that original source files other than
ExamManagementRepository.cs are preserved. Visual Studio caches and bin/obj
build outputs are omitted from this clean package; Visual Studio regenerates them.

The execution environment has no .NET SDK or MySQL server, so a .NET build and
live MySQL/Swagger/concurrent-request tests could not be run here. SQLite tests
verify overlap query behavior, not MySQL driver integration or named lock behavior.
Build and perform the Swagger checks on your machine before deployment.

The supplied backend has no exam-hall-allocation write API. This update checks
existing allocation records when exam/schedule APIs write; it does not add a hall
allocation workflow. Direct SQL writes or external allocation writers bypass the
API guard and must use the same validation and MySQL lock protocol. The lock
protects API instances using this repository on the same MySQL server/database.
Timetable room bookings, individual-student cross-cohort conflicts, invigilation,
and seating capacity are outside this exam schedule conflict task.
