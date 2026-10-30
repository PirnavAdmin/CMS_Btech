# Roles / Rooms / Staff Assignment - Swagger Regression Tests

Run `Database/AdminManagement/Admin_Roles_Designations_Rooms_Migration.sql` first.

## 1. Verify existing role can be saved with same name

Use an existing role from `GET /api/roles`, for example Faculty (usually ID 5 in the supplied dump).

`PUT /api/roles/5`

```json
{
  "roleName": "Faculty",
  "roleCode": "FACULTY",
  "category": "Academic",
  "level": "Level 4 (Academic Staff)",
  "description": "Faculty member responsible for teaching and academic activities - updated test",
  "status": true
}
```

Expected: HTTP 200. It must NOT return "Role name already exists".

## 2. Verify true duplicate is rejected

If role ID 5 is Faculty, update another non-system test role using `roleName: Faculty`.
Expected: HTTP 400 with "Another role with name 'Faculty' already exists."

## 3. Verify create duplicate is trimmed/case-insensitive

`POST /api/roles`

```json
{
  "roleName": "  faculty  ",
  "roleCode": "FACULTY_DUP_TEST",
  "category": "Academic",
  "level": "Level 4 (Academic Staff)",
  "description": "Duplicate test",
  "status": true
}
```

Expected: HTTP 400 with "Role name already exists."

## 4. Create valid custom role

`POST /api/roles`

```json
{
  "roleName": "Lab Coordinator API Test",
  "roleCode": "LAB_COORD_API_TEST",
  "category": "Administrative",
  "level": "Level 4 (Administrative Staff)",
  "description": "Lab and room coordination",
  "status": true,
  "permissions": {
    "sections": { "view": true, "create": false, "edit": true, "delete": false, "export": true },
    "timetable": { "view": true, "create": false, "edit": true, "delete": false, "export": true }
  }
}
```

Expected: HTTP 200 and generated numeric `id`/`roleId`.

## 5. Staff role + designation assignment

Create a designation first through the existing `/api/v1/access-governance/designations` endpoint, then:

`POST /api/roles/assign`

```json
{
  "employeeProfileId": 6,
  "roleId": 5,
  "designationId": 1,
  "scope": "Department-scoped"
}
```

Use the actual created designation ID. Expected: HTTP 200.

## 6. Room allocation

`PUT /api/v1/rooms/{classroomId}/allocation?collegeId=1`

```json
{
  "sectionId": 2,
  "sectionName": "Section B"
}
```

Expected: HTTP 200, `sectionId=2`, `sectionName=Section B`, status Allocated.

Then deallocate:

`DELETE /api/v1/rooms/{classroomId}/allocation?collegeId=1`

Expected: HTTP 200, status Available.
