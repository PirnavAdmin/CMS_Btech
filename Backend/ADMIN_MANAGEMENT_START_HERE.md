# Roles, Designations, Rooms/Classrooms - Integration Notes

This package is additive. Existing controllers/routes were preserved.

## Before running
1. Keep your existing local `appsettings.json` (it is intentionally not included in this package).
2. Run `Database/AdminManagement/Admin_Roles_Designations_Rooms_Migration.sql` against `cms_btech`.
3. Run `dotnet restore`, `dotnet build`, `dotnet run`.
4. Use Swagger to test the new `AccessGovernance` and `Rooms` APIs.

## New API groups
- `/api/v1/access-governance/...` for roles, permission matrix, designations and staff access assignments.
- `/api/v1/rooms/...` for room directory CRUD, allocation and deallocation.

## Existing APIs preserved
The existing `/api/roles` routes and existing timetable/classroom routes are not removed or renamed.

## Logging
New controllers/services/repositories use `ILogger`. The project's existing request logger and daily file logger continue to write to the configured `Logs` directory.
