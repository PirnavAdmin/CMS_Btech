# Faculty Double Booking - Existing Timetable Tables

## Important correction

Use the existing tables from `time table 1.sql`:

- `timetables`
- `timetable_slots`
- `timetable_entries`
- `timetable_publish_history`

Do not create a separate `faculty_timetable_bookings` table. Do not run the
earlier `Faculty_Double_Booking_SAFE_PATCH_20260922.sql` output.

## What this corrected output changes

No existing source file or database table is changed. These files are added:

1. `DTOs/Faculty/TimetableEntryDtos.cs`
2. `Exceptions/FacultyDoubleBookingException.cs`
3. `Repositories/Implementations/TimetableEntryRepository.cs`
4. `Controllers/V1/TimetableEntriesController.cs`
5. `Timetable_Double_Booking_Tests.http`

No `Program.cs` change is needed because `AddControllers()` and
`MapControllers()` already exist.

## API endpoints

- `POST /api/v1/timetable-entries`
- `PUT /api/v1/timetable-entries/{timetableEntryId}`
- `GET /api/v1/timetable-entries`
- `DELETE /api/v1/timetable-entries/{timetableEntryId}`

## Conflict rule

Before POST or PUT, the repository joins `timetable_entries` with
`timetable_slots` and checks:

1. Same faculty
2. Same day
3. Same academic year
4. Overlapping timetable effective dates
5. Overlapping slot times
6. Active entry and active slot

Time overlap uses:

```sql
existing_slot.start_time < requested_end_time
AND existing_slot.end_time > requested_start_time
```

This detects partial overlap and full overlap even when the two timetables use
different `timetable_slot_id` values. Adjacent slots are allowed.

## Step-by-step

1. Confirm your four existing timetable tables have already been created.
2. Do not run any new table script for this task.
3. Open this corrected project in Visual Studio.
4. Run `dotnet restore` and `dotnet build`.
5. Run the API.
6. Test the new endpoints through Swagger or
   `Timetable_Double_Booking_Tests.http`.
7. First create a valid non-conflicting entry; expect `201 Created`.
8. Create an overlapping entry for the same faculty; expect `409 Conflict`.

Expected conflict response:

```json
{
  "success": false,
  "message": "Faculty is already assigned during this day and time. Conflicting timetable entry ID: 1."
}
```

## Existing-functionality protection

- Existing tables are reused, not altered.
- Existing rows are not changed during installation.
- Existing controllers and routes are unchanged.
- The new controller has its own route.
- DELETE only deactivates the selected timetable entry.
- MySQL named locks serialize writes for the same faculty, preventing two
  simultaneous API requests from both passing the conflict check.
