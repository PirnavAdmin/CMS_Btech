# Phase 5 – Advanced Timetable Management

This implementation is additive. Existing timetable and master-data APIs/controllers are not removed or renamed. The Phase 5 frontend should use the new `/api/v1/timetable-management` contract for the advanced workflow.

## Existing modules reused

- Academic Year: `academicyears`
- Course: `courses`
- Branch: `branches`
- Semester: `semesters`
- Section: `sections`
- Subject: `subjects` + `subject_semesters`
- Faculty: `faculty`
- Faculty Subject Allocation: `faculty_subject_allocations`
- Student/section resolution: `students` + `student_section_assignments`
- Existing timetable source tables: `timetables`, `timetable_slots`, `timetable_entries`, `timetable_publish_history`
- Existing JWT authentication and role claims
- Existing request/file logging pipeline

## New persistence required by the frontend

The supplied database did not contain reusable master tables for academic-year period configuration, working-day/calendar exceptions, or classrooms. The migration adds only those timetable-specific gaps:

- `timetable_period_configurations`
- `academic_working_days`
- `academic_calendar_settings`
- `academic_calendar_days`
- `classrooms`
- `timetable_subject_requirements`

It also adds nullable/supporting columns to existing timetable tables:

- `timetables.revision`
- `timetable_entries.classroom_id`
- `timetable_entries.generated_source`
- `timetable_entries.schedule_group_key`

No existing column/API is deleted or renamed.

Run `Database/Phase5Timetable/Phase5_Advanced_Timetable_Migration.sql` once before using the new endpoints. It is written to be safe to re-run.

## New API contract

Base route: `/api/v1/timetable-management`

### Period setup

- `GET /periods?academicYearId={id}`
- `POST /periods/automatic`
- `POST /periods`
- `PUT /periods/{periodId}`
- `DELETE /periods/{periodId}`
- `PUT /periods/reorder`

Automatic setup creates CLASS/BREAK/LUNCH rows, validates `start < end`, rejects overlaps/duplicates, and persists working weekdays. BREAK/LUNCH rows are never copied into teaching slots.

### Calendar / holidays

- `GET /calendar?academicYearId={id}`
- `PUT /calendar`

Academic Year and Semester dates remain authoritative. The calendar stores only weekly working-day rules and date exceptions (`HOLIDAY`, `NON_WORKING`, `WORKING_OVERRIDE`). Weekly timetable rows are not deleted for a holiday.

### Classroom master

- `GET /classrooms`
- `POST /classrooms`
- `PUT /classrooms/{classroomId}`

The migration seeds classroom rows only from real room strings already present in `sections.room` and `timetable_entries.classroom`.

### Timetable draft/master

- `GET /timetables`
- `GET /timetables/{timetableId}`
- `POST /timetables`
- `PUT /timetables/{timetableId}`
- `POST /timetables/{timetableId}/sync-periods`

Creating a Phase 5 timetable validates the Academic Year/Course/Branch/Semester/Section relationship and creates a DRAFT. Active CLASS period configuration is copied to its existing `timetable_slots` source table.

### Weekly subject requirements

- `GET /timetables/{timetableId}/requirements`
- `PUT /timetables/{timetableId}/requirements`

Frequency is never hardcoded. The service first uses an explicit `timetable_subject_requirements` row. If there is no explicit row, it can reuse one unambiguous positive `faculty_subject_allocations.periods_per_week` value. Otherwise it reports frequency as not configured.

`blockSize > 1` supports consecutive-period scheduling, suitable for labs/practicals when configured by the caller.

### Generate / Generate Missing

- `POST /timetables/{timetableId}/generate`
- `POST /timetables/{timetableId}/generate-missing`

Generation loads the academic context, eligible subjects, configured weekly frequency, faculty allocations, CLASS periods, working weekdays, classrooms and existing active allocations. It produces a DRAFT and returns scheduled entries plus structured unscheduled reasons.

Generate Missing preserves existing manual/valid entries and only attempts unmet subject requirements.

Typical unscheduled reason codes:

- `WEEKLY_FREQUENCY_NOT_CONFIGURED`
- `NO_FACULTY_ALLOCATION`
- `NO_AVAILABLE_ROOM`
- `INVALID_PERIOD_CONFIGURATION`
- `NO_AVAILABLE_SLOT`

### Manual changes

- `POST /timetables/{timetableId}/entries`
- `PUT /timetables/{timetableId}/entries/{entryId}`
- `PUT /timetables/{timetableId}/entries/{entryId}/move`
- `DELETE /timetables/{timetableId}/entries/{entryId}`

Every add/edit/move validates faculty, room and section overlap using actual slot start/end times. Updating an entry excludes that entry from self-conflict.

### Validate / Publish

- `POST /timetables/{timetableId}/validate`
- `POST /timetables/{timetableId}/publish`
- `POST /timetables/{timetableId}/reopen`

Publish runs final validation and is blocked by conflicts or unscheduled/invalid required frequency. Published `timetable_entries` stay the single source of truth; no duplicate per-faculty/per-student/per-classroom rows are created.

### Published timetable views

- `GET /views/faculty/{facultyId}?academicYearId=&date=`
- `GET /views/student/{studentId}?academicYearId=&date=`
- `GET /views/classroom/{classroomId}?academicYearId=&date=`
- `GET /views/section/{sectionId}?academicYearId=&date=`

Student view resolves the student's current section assignment and returns that section's published timetable.

### Future attendance occurrence lookup

- `GET /occurrences?date=YYYY-MM-DD&sectionId={id}`
- alternatively use `facultyId` or `classroomId`

A date-specific occurrence is resolved from published weekly entries + working weekdays + calendar exceptions. Holidays do not mutate/delete the weekly template.

## Conflict and concurrency strategy

Phase 5 mutations use a MySQL named lock scoped to the academic year together with a transaction. This serializes advanced timetable writes for the same academic year while the service rechecks conflicts against current rows. Faculty, section, and classroom conflicts use overlap semantics based on slot start/end times.

The Phase 5 frontend should use these advanced mutation routes instead of the legacy direct entry APIs when conflict-safe scheduling is required. Legacy endpoints remain present for backward compatibility.

## Security

Write/generate/validate/publish operations require one of:

- `SUPER_ADMIN`
- `COLLEGE_ADMIN`
- `PRINCIPAL`
- `HOD`

Read endpoints remain authenticated and enforce token college isolation. `SUPER_ADMIN` can work across colleges.

## Frontend screen mapping

1. **Academic Setup**: continue using existing Academic Year → Course → Branch → Academic Level/Semester → Section APIs.
2. **Period Setup**: use `/periods*`, `/calendar`, and `/classrooms*`.
3. **Generate & Manage**: create/get draft, save requirements, generate, manual entry mutations, generate-missing, validate, publish.
4. **Faculty Timetable**: `/views/faculty/{facultyId}`.
5. **Student Timetable**: `/views/student/{studentId}`.
6. **Classroom Timetable**: `/views/classroom/{classroomId}`.

This replaces the frontend's current localStorage fallback for draft/period/calendar/publish capabilities.

## Seed-data note from supplied dump

Useful existing context for smoke testing:

- Academic Year `2`: 2026–2027
- Course `1`: BTECH
- Branch `1`: CSE
- Semester `2`: Semester 2
- Section `2`: Section B
- Subject `4`: EE104 Power Electronics
- Subject `5`: EE105 Control Systems
- Faculty `2`: Rahul Verma

The supplied faculty allocations have `subject_id = NULL` and `periods_per_week = 0`, so generation correctly reports missing faculty/frequency until those existing allocation records are configured for a subject or an explicit weekly requirement is saved. The implementation does not invent those academic rules.

## Verification performed in this environment

- Existing controllers/routes were not edited.
- Static C# structure check passed for the project.
- Existing frontend-contract route verification passed.
- A clean source comparison shows only new Phase 5 files plus `Program.cs` DI registration changed.
- `.NET SDK` is not installed in this execution environment, so `dotnet build`/`dotnet test` could not be executed here. Run the commands below locally.

```powershell
dotnet clean
dotnet restore
dotnet build
dotnet run
```

Then run the requests in `Phase5_Timetable_API_Test.http` and the DB queries in `Phase5_DB_Verification.sql`.
