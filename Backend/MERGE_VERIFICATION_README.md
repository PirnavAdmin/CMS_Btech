# Merge Verification

This project merges the two supplied CMS BTech Phase 4 archives.

## Authoritative files from the first archive

The following files were copied byte-for-byte from the first archive:

- `Controllers/V1/TimetableEntriesController.cs`
- `DTOs/Faculty/TimetableEntryDtos.cs`
- `Repositories/Implementations/TimetableEntryRepository.cs`
- `Exceptions/FacultyDoubleBookingException.cs`
- `appsettings.json`

The timetable-entry routes therefore remain exactly:

- `POST /api/v1/timetable-entries`
- `PUT /api/v1/timetable-entries/{timetableEntryId}`
- `GET /api/v1/timetable-entries`
- `DELETE /api/v1/timetable-entries/{timetableEntryId}`

## API merge result

- All non-timetable controller APIs from both archives are included.
- The second archive's attendance/Ticket159 implementation is included.
- There are no duplicate method-and-route registrations in the merged controllers.
- The second archive's additional `GET /api/v1/timetable-entries/{id}` route is intentionally not included because the first archive's timetable-entry API was required to remain unchanged.
- Generated `bin`, `obj`, and `.vs` directories were excluded from the final package.

## Verification

Static route inventory and byte-for-byte comparisons passed. A .NET build was not run because the .NET SDK was unavailable in the packaging environment. Run `dotnet restore` and `dotnet build` after extraction in a .NET development environment.
