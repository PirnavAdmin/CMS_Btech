# Roles / Staff Assignment / Rooms Frontend Integration Fix - 2026-09-27

This patch is additive. No existing API route was removed or renamed.

## Fixed `/api/roles`

- GET `/api/roles` now returns the frontend role profile with aliases (`id`/`roleId`, `name`/`roleName`, `code`/`roleCode`), user count and permission matrix.
- GET `/api/roles/{id}` returns the same complete role shape.
- POST `/api/roles` trims role names and performs a case-insensitive duplicate-name check.
- PUT `/api/roles/{id}` performs the duplicate-name check with `role_id <> currentId`; the current role no longer conflicts with itself.
- POST and PUT accept both legacy `roleName`/`roleCode` and frontend `name`/`code` fields.
- POST and PUT optionally accept a permissions JSON object/string and persist it through the existing role-permission service.
- DELETE `/api/roles/{id}` blocks system roles and roles still assigned to active users.
- Added POST `/api/roles/assign` for staff role + designation + scope assignment.

The existing `/api/v1/access-governance/...` endpoints remain unchanged and received the same role-name uniqueness fix internally.

## Rooms

Existing `/api/v1/rooms` routes remain unchanged.

- Room responses now additionally expose `sectionId` and `sectionName` aliases while preserving `assignedSectionId` and `assignedSection`.
- Allocation request accepts optional `sectionName` in addition to required `sectionId`.
- Allocation/deallocation response messages match the frontend contract.
- Existing room governance rules (unique section allocation, capacity validation, deletion block, maintenance/inactive guard) remain active.

## Logging

Role create/update/delete/permission/assignment and room write flows continue to use `ILogger`; existing request/file logging remains intact.

## Database

Run `Database/AdminManagement/Admin_Roles_Designations_Rooms_Migration.sql` before testing the integration APIs.
