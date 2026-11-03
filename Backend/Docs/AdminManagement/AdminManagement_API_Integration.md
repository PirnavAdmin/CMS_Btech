# Roles, Designations, Rooms/Classrooms API Integration

This implementation is additive. Existing `/api/roles`, timetable, section, faculty, and other APIs are not removed or renamed.

## Run first
Execute:

`Database/AdminManagement/Admin_Roles_Designations_Rooms_Migration.sql`

The migration:
- extends the existing `roles` table with frontend-only metadata (`category`, `hierarchy_level`, `is_system`)
- adds `role_permissions`
- adds the missing `designations` master
- adds `staff_access_profiles` while continuing to use the existing `user_roles` table for actual user-role mapping
- extends the existing Phase-5 `classrooms` table with building/floor/facilities/status/section-allocation fields

## Roles & Designations
Base route: `/api/v1/access-governance`

- `GET /bootstrap?collegeId=1` - roles + designations + staff assignments in one request
- `GET /roles?search=&category=&status=`
- `GET /roles/{roleId}`
- `POST /roles`
- `PUT /roles/{roleId}`
- `DELETE /roles/{roleId}` - blocks system roles and roles assigned to active users
- `GET /roles/{roleId}/permissions`
- `PUT /roles/{roleId}/permissions`
- `GET /designations?collegeId=1&search=&category=&status=`
- `GET /designations/{designationId}?collegeId=1`
- `POST /designations`
- `PUT /designations/{designationId}`
- `DELETE /designations/{designationId}?collegeId=1` - blocked while assigned to staff
- `GET /staff-assignments?collegeId=1&search=`
- `PUT /staff-assignments/{employeeProfileId}?collegeId=1`

Response field names intentionally match `RolesAndDesignations.jsx`: `id`, `name`, `code`, `category`, `level`, `description`, `status`, `isSystem`, `userCount`, `permissions`, and designation `title/defaultRole` fields.

## Rooms & Classrooms
Base route: `/api/v1/rooms`

- `GET /api/v1/rooms?collegeId=1&search=&roomType=&buildingBlock=&status=`
- `GET /api/v1/rooms/options`
- `GET /api/v1/rooms/{classroomId}?collegeId=1`
- `POST /api/v1/rooms`
- `PUT /api/v1/rooms/{classroomId}`
- `DELETE /api/v1/rooms/{classroomId}?collegeId=1`
- `PUT /api/v1/rooms/{classroomId}/allocation?collegeId=1`
- `DELETE /api/v1/rooms/{classroomId}/allocation?collegeId=1`

Room response fields match `RoomsManagement.jsx`: `id`, `roomNumber`, `roomName`, `buildingBlock`, `floor`, `roomType`, `capacity`, `facilities`, `department`, `status`, `assignedSection`, and `description`.

### Room governance enforced by backend
- room code unique per college
- a section can be allocated to only one room
- allocated-room deletion is blocked with HTTP 409
- maintenance/inactive transition is blocked when the assigned section has active students
- allocation/deallocation keeps the legacy `sections.room` field synchronized
- all write operations are logged using `ILogger`; existing request/file logging also captures every API call

## Frontend mapping
The current frontend still uses LocalStorage in `roomService.js` and `RolesAndDesignations.jsx`. To integrate without changing the screen UI, replace those LocalStorage operations with these APIs. The backend payload/response naming is designed to minimize mapping code.
