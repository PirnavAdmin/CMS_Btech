# Backend API Requirements - Faculty, Student and User Access Portals

**All URLs below are PROPOSED, NOT IMPLEMENTED.** They are design suggestions for backend review, not existing routes or frontend HTTP integration. This frontend change adds no backend code and calls none of these URLs. Existing production login and administrator APIs remain unchanged; reuse compatible existing endpoints after agreement rather than duplicate them.

## Common conventions

Student account creation additionally requires `courseId`, `branchId`, and `academicLevelId` alongside `departmentId` and `sectionId`. For example: `{"name":"New Student","email":"student@example.edu","role":"student","departmentId":"cse","courseId":"btech","branchId":"btech-cse","academicLevelId":"year-2","sectionId":"cse-a"}`. Return these IDs on student user records. Access references must include `courses: [{id,name}]`, `branches: [{id,name,courseId,departmentId}]`, `academicLevels: [{id,name,courseId}]`, and sections with all four parent IDs. Validate the complete mapping within the authorized college. Academic levels represent the configured study year, for example Year 2. These additions are proposed contracts only.

- Authenticated calls use a bearer session. The server must enforce role, active account, college ownership and record-level permissions on every request. Frontend role checks are not production security.
- Resolve college and user from authenticated claims. A selected college is allowed only when the backend authorizes that selection for a multi-college administrator. Never use arbitrary client userId/collegeId to bypass ownership.
- Success envelope: `{"success":true,"data":<example below>}`. Paginated lists use `data: {items,total,page,pageSize}`; the HTTP service adapter can normalize that shape for the UI.
- Error envelope: `{"success":false,"message":"Safe user-facing reason","errors":{"field":"validation reason"}}`. Use 400 for invalid input, 401 for invalid sessions, 403 for forbidden actions, 404 for inaccessible/missing records, 409 for duplicates/version conflicts. No HTML, SQL or stack traces.
- IDs are stable strings in the frontend adapter; backend numeric IDs may be normalized there. Dates are ISO `YYYY-MM-DD`, timestamps ISO UTC, times `HH:mm`. College-local timezone governs attendance and leave dates.
- `null` in an example request means no JSON body (GET/DELETE). All methods should support cancellation and predictable errors in the HTTP adapter. Mutating operations require auditing and transaction consistency; duplicate submissions must be rejected server-side.
- Faculty marks submission creates a draft. Publication/approval must use the authorized existing administrative workflow; students never receive drafts. Leave requests remain pending until the backend approval process acts.

## UI-facing service contract

`src/services/portals/serviceProvider.js` currently returns a separate mock adapter. Replace it with the agreed HTTP adapter without editing page components. `adminService`, `facultyService` and `studentService` are the UI boundaries. No request URLs below are embedded in these mocks.

`getSnapshot()` returns a module-specific object (not a proposed monolithic HTTP endpoint):

```json
{
  "mode": "mock",
  "collegeId": "college-2",
  "me": {"id":"student-1","name":"Aarav Reddy","email":"aarav@example.edu","role":"student","status":"active","departmentId":"cse","sectionId":"cse-a","phone":"9876543211"},
  "departments": [], "sections": [], "subjects": [], "assignments": [],
  "students": [], "attendance": [], "results": [], "timetable": [],
  "materials": [], "leaves": [], "notifications": [], "fees": []
}
```

The admin snapshot additionally contains `users` and all college teaching assignments/references. Faculty gets only assigned students/subjects, own leave and relevant records. Student gets only their own attendance/results/fees and enrolled subjects/resources. Decorated assignments include `{subject,section,faculty}` display objects. Mock writes return the updated record (password reset returns a simulated delivery receipt). Real implementation must use safe server responses and preserve this adapter shape.

## 1. Authentication: Authenticate and resolve portal identity

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/auth/login`
- HTTP method: `POST`
- Purpose: Authenticate and resolve portal identity.
- Required request parameters: Public credentials.
- Required role: Public.
- Validation: Reuse existing login contract if it already supports these roles; never introduce a second production login. Enforce active account, correct password, institution and role. Return no password/hash.

Example request body:

```json
{
  "identifier": "aarav@example.edu",
  "password": "<entered password>"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "accessToken": "<token>",
  "refreshToken": "<token>",
  "roles": [
    "student"
  ],
  "user": {
    "id": "student-1",
    "name": "Aarav Reddy",
    "email": "aarav@example.edu",
    "departmentId": "cse",
    "sectionId": "cse-a",
    "role": "student",
    "status": "active",
    "phone": "9876543211",
    "collegeId": "college-2"
  }
}
```

## 2. Authentication: Refresh an authenticated session

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/auth/refresh`
- HTTP method: `POST`
- Purpose: Refresh an authenticated session.
- Required request parameters: Valid refresh token.
- Required role: Authenticated.
- Validation: Rotate refresh token, revoke invalid/deactivated sessions, preserve college and roles.

Example request body:

```json
{
  "refreshToken": "<token>"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "accessToken": "<token>",
  "refreshToken": "<rotated token>"
}
```

## 3. Authentication: Revoke the current session

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/auth/logout`
- HTTP method: `POST`
- Purpose: Revoke the current session.
- Required request parameters: Authenticated current session.
- Required role: Authenticated.
- Validation: Revoke refresh token and associated session; idempotent.

Example request body:

```json
{
  "refreshToken": "<token>"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "revoked": true
}
```

## 4. Authentication: Resolve current user and assigned college

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/auth/me`
- HTTP method: `GET`
- Purpose: Resolve current user and assigned college.
- Required request parameters: Bearer session.
- Required role: Authenticated.
- Validation: Derive user and college from session; do not accept user or role override.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "student-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "cse-a",
  "role": "student",
  "status": "active",
  "phone": "9876543211",
  "collegeId": "college-2"
}
```

## 5. Authentication: Complete a verified password reset

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/auth/password-reset/complete`
- HTTP method: `POST`
- Purpose: Complete a verified password reset.
- Required request parameters: One-use reset token.
- Required role: Reset-token holder.
- Validation: Expiry, single use, password policy and session revocation; never expose token/password in logs.

Example request body:

```json
{
  "resetToken": "<one-use token>",
  "newPassword": "<new password>"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "changed": true
}
```

## 6. Admin access: Search and filter college users

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/users`
- HTTP method: `GET`
- Purpose: Search and filter college users.
- Required request parameters: Authenticated college; optional search, role, status, departmentId, page, pageSize.
- Required role: Admin.
- Validation: Scope every item to authorized college; validate pagination and filter values.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "items": [
    {
      "id": "student-1",
      "name": "Aarav Reddy",
      "email": "aarav@example.edu",
      "departmentId": "cse",
      "sectionId": "cse-a",
      "role": "student",
      "status": "active",
      "phone": "9876543211"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

## 7. Admin access: Load account and assignment form references

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/access-references`
- HTTP method: `GET`
- Purpose: Load account and assignment form references.
- Required request parameters: Authenticated college.
- Required role: Admin.
- Validation: Only return references owned by the authorized selected college.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "departments": [
    {
      "id": "cse",
      "name": "Computer Science"
    }
  ],
  "sections": [
    {
      "id": "cse-a",
      "name": "CSE A",
      "departmentId": "cse"
    }
  ],
  "subjects": [
    {
      "id": "dbms",
      "name": "Database Management Systems",
      "code": "CS301",
      "departmentId": "cse",
      "credits": 4
    }
  ]
}
```

## 8. Admin access: Create a faculty or student account

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/users`
- HTTP method: `POST`
- Purpose: Create a faculty or student account.
- Required request parameters: Authenticated college.
- Required role: Admin.
- Validation: Name 2-100 chars; valid unique email per agreed tenancy policy; faculty/student only; department belongs to college; student section matches department; backend issues invitation without returning passwords.

Example request body:

```json
{
  "name": "New Student",
  "email": "student@example.edu",
  "departmentId": "cse",
  "role": "student",
  "sectionId": "cse-a"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "student-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "cse-a",
  "role": "student",
  "status": "active",
  "phone": "9876543211"
}
```

## 9. Admin access: Assign role and student section

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/users/{userId}/role`
- HTTP method: `PATCH`
- Purpose: Assign role and student section.
- Required request parameters: Path userId.
- Required role: Admin.
- Validation: Faculty/student roles only; block administrator/self-demotion here; section belongs to department and college; preserve academic history and deactivate incompatible allocations.

Example request body:

```json
{
  "role": "student",
  "sectionId": "cse-a"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "student-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "cse-a",
  "role": "student",
  "status": "active",
  "phone": "9876543211"
}
```

## 10. Admin access: Activate or deactivate an account

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/users/{userId}/status`
- HTTP method: `PATCH`
- Purpose: Activate or deactivate an account.
- Required request parameters: Path userId.
- Required role: Admin.
- Validation: Active/inactive enum; prevent self/last-administrator lockout; invalidate deactivated sessions.

Example request body:

```json
{
  "status": "inactive"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "student-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "cse-a",
  "role": "student",
  "status": "inactive",
  "phone": "9876543211"
}
```

## 11. Admin access: Request secure password reset delivery

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/users/{userId}/password-reset`
- HTTP method: `POST`
- Purpose: Request secure password reset delivery.
- Required request parameters: Path userId.
- Required role: Admin.
- Validation: Authorized college target, rate limit, do not return passwords/tokens, send verified reset invitation through backend.

Example request body:

```json
{}
```

Expected response (`data` inside the common success envelope):

```json
{
  "userId": "student-1",
  "delivery": "queued",
  "requestedAt": "2026-10-21T09:00:00Z"
}
```

## 12. Admin access: List teaching assignments

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/faculty-assignments`
- HTTP method: `GET`
- Purpose: List teaching assignments.
- Required request parameters: Authenticated college; optional facultyId.
- Required role: Admin.
- Validation: Only college-owned subjects, sections and faculty; include stable IDs.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "assignment-1",
    "facultyId": "faculty-1",
    "subjectId": "dbms",
    "sectionId": "cse-a"
  }
]
```

## 13. Admin access: Assign faculty to a subject and section

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/faculty-assignments`
- HTTP method: `POST`
- Purpose: Assign faculty to a subject and section.
- Required request parameters: Authenticated college.
- Required role: Admin.
- Validation: Active faculty, same college and department, no duplicate assignment; enforce backend academic mapping.

Example request body:

```json
{
  "facultyId": "faculty-1",
  "subjectId": "dbms",
  "sectionId": "cse-a"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "assignment-1",
  "facultyId": "faculty-1",
  "subjectId": "dbms",
  "sectionId": "cse-a"
}
```

## 14. Admin access: Remove an unused teaching assignment

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/admin/faculty-assignments/{assignmentId}`
- HTTP method: `DELETE`
- Purpose: Remove an unused teaching assignment.
- Required request parameters: Path assignmentId.
- Required role: Admin.
- Validation: Reject deletion if attendance, marks, timetable or study materials reference the assignment; preserve history.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "assignment-1"
}
```

## 15. Faculty: Get students in assigned sections

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/students`
- HTTP method: `GET`
- Purpose: Get students in assigned sections.
- Required request parameters: Optional assignmentId, sectionId, search, pagination.
- Required role: Faculty.
- Validation: Derive faculty from session; exclude students outside assigned sections; return allowed fields only.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "student-1",
    "name": "Aarav Reddy",
    "email": "aarav@example.edu",
    "departmentId": "cse",
    "sectionId": "cse-a",
    "role": "student",
    "status": "active",
    "phone": "9876543211"
  }
]
```

## 16. Faculty: Get assigned subjects and sections

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/subjects`
- HTTP method: `GET`
- Purpose: Get assigned subjects and sections.
- Required request parameters: Authenticated faculty.
- Required role: Faculty.
- Validation: Only active, college-owned faculty assignments; no arbitrary facultyId impersonation.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "assignment-1",
    "facultyId": "faculty-1",
    "subjectId": "dbms",
    "sectionId": "cse-a",
    "subject": {
      "id": "dbms",
      "name": "Database Management Systems",
      "code": "CS301",
      "departmentId": "cse",
      "credits": 4
    },
    "section": {
      "id": "cse-a",
      "name": "CSE A"
    },
    "faculty": {
      "id": "faculty-1",
      "name": "Dr. Ananya Rao"
    }
  }
]
```

## 17. Faculty: Get attendance submission history

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/attendance`
- HTTP method: `GET`
- Purpose: Get attendance submission history.
- Required request parameters: Optional assignmentId, date range, pagination.
- Required role: Faculty.
- Validation: Only own assigned sections; valid dates; no cross-college data.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "attendance-1",
    "assignmentId": "assignment-1",
    "date": "2026-10-21",
    "records": [
      {
        "studentId": "student-1",
        "status": "present"
      }
    ]
  }
]
```

## 18. Faculty: Submit a complete attendance register

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/attendance`
- HTTP method: `POST`
- Purpose: Submit a complete attendance register.
- Required request parameters: Assigned subject-section mapping.
- Required role: Faculty.
- Validation: Valid nonfuture date, present/absent/late enum, one record per active assigned student, no duplicates; atomic submit; 409 on existing subject/section/date.

Example request body:

```json
{
  "assignmentId": "assignment-1",
  "date": "2026-10-21",
  "records": [
    {
      "studentId": "student-1",
      "status": "present"
    }
  ]
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "attendance-1",
  "assignmentId": "assignment-1",
  "date": "2026-10-21",
  "records": [
    {
      "studentId": "student-1",
      "status": "present"
    }
  ]
}
```

## 19. Faculty: Get assessment history and publication status

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/marks`
- HTTP method: `GET`
- Purpose: Get assessment history and publication status.
- Required request parameters: Optional assignmentId, assessment, pagination.
- Required role: Faculty.
- Validation: Only own assigned subjects and sections; draft/published state explicit.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "result-1",
    "assignmentId": "assignment-1",
    "assessment": "Midterm 2",
    "maxMarks": 30,
    "published": false,
    "records": [
      {
        "studentId": "student-1",
        "marks": 26
      }
    ]
  }
]
```

## 20. Faculty: Save assessment marks as a draft

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/marks`
- HTTP method: `POST`
- Purpose: Save assessment marks as a draft.
- Required request parameters: Assigned subject-section mapping.
- Required role: Faculty.
- Validation: Assessment 2-80 chars, maxMarks 1-1000, numeric marks 0..maxMarks, one record per active assigned student, no duplicate assessment; never auto-publish.

Example request body:

```json
{
  "assignmentId": "assignment-1",
  "assessment": "Midterm 2",
  "maxMarks": 30,
  "records": [
    {
      "studentId": "student-1",
      "marks": 26
    }
  ]
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "result-1",
  "assignmentId": "assignment-1",
  "assessment": "Midterm 2",
  "maxMarks": 30,
  "published": false,
  "records": [
    {
      "studentId": "student-1",
      "marks": 26
    }
  ]
}
```

## 21. Faculty: List shared learning resources

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/materials`
- HTTP method: `GET`
- Purpose: List shared learning resources.
- Required request parameters: Optional assignmentId, pagination.
- Required role: Faculty.
- Validation: Only own assigned subjects; expose safe text or authorized download metadata.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "material-1",
    "assignmentId": "assignment-1",
    "title": "Normalization notes",
    "description": "Revision notes",
    "content": "First normal form...",
    "fileName": "notes.txt",
    "createdAt": "2026-10-21T09:00:00Z"
  }
]
```

## 22. Faculty: Share text study materials

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/materials`
- HTTP method: `POST`
- Purpose: Share text study materials.
- Required request parameters: Assigned subject-section mapping.
- Required role: Faculty.
- Validation: Title 2-120 chars; description <=1000 chars; text <=200 KB; sanitize filename and render text safely; binary uploads need a separately agreed storage contract.

Example request body:

```json
{
  "assignmentId": "assignment-1",
  "title": "Normalization notes",
  "description": "Revision notes",
  "content": "First normal form...",
  "fileName": "notes.txt"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "material-1",
  "assignmentId": "assignment-1",
  "title": "Normalization notes",
  "description": "Revision notes",
  "content": "First normal form...",
  "fileName": "notes.txt",
  "createdAt": "2026-10-21T09:00:00Z"
}
```

## 23. Faculty: Remove owned study material

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/materials/{materialId}`
- HTTP method: `DELETE`
- Purpose: Remove owned study material.
- Required request parameters: Path materialId.
- Required role: Faculty.
- Validation: Verify ownership and assignment; revoke downloads; retain audit metadata.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "material-1"
}
```

## 24. Faculty: Get own leave history

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/leave`
- HTTP method: `GET`
- Purpose: Get own leave history.
- Required request parameters: Optional status, date range, pagination.
- Required role: Faculty.
- Validation: Current faculty only; validated state enum.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "leave-1",
    "facultyId": "faculty-1",
    "from": "2026-11-02",
    "to": "2026-11-03",
    "type": "Casual",
    "reason": "Family commitment",
    "status": "pending"
  }
]
```

## 25. Faculty: Request leave

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/leave`
- HTTP method: `POST`
- Purpose: Request leave.
- Required request parameters: Authenticated faculty.
- Required role: Faculty.
- Validation: Valid dates, from >= today in college timezone, to >= from, valid leave type, reason 10-500 chars, no overlapping noncancelled leave, create pending only.

Example request body:

```json
{
  "from": "2026-11-02",
  "to": "2026-11-03",
  "type": "Casual",
  "reason": "Family commitment"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "leave-1",
  "facultyId": "faculty-1",
  "from": "2026-11-02",
  "to": "2026-11-03",
  "type": "Casual",
  "reason": "Family commitment",
  "status": "pending"
}
```

## 26. Faculty: Cancel a pending leave request

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/leave/{leaveId}/cancel`
- HTTP method: `PATCH`
- Purpose: Cancel a pending leave request.
- Required request parameters: Path leaveId.
- Required role: Faculty.
- Validation: Only current faculty pending request; reject approved/rejected/already cancelled transitions.

Example request body:

```json
{}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "leave-1",
  "facultyId": "faculty-1",
  "from": "2026-11-02",
  "to": "2026-11-03",
  "type": "Casual",
  "reason": "Family commitment",
  "status": "cancelled"
}
```

## 27. Faculty: Read my weekly class timetable

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/timetable`
- HTTP method: `GET`
- Purpose: Read my weekly class timetable.
- Required request parameters: Optional day, date range, academicYearId.
- Required role: Faculty.
- Validation: Resolve current faculty allocations or student section from session; only permitted college schedule; no edit actions.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "class-1",
    "assignmentId": "assignment-1",
    "day": "Monday",
    "start": "09:00",
    "end": "10:00",
    "room": "CSE 201"
  }
]
```

## 28. Faculty: Read targeted notifications

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/notifications`
- HTTP method: `GET`
- Purpose: Read targeted notifications.
- Required request parameters: Optional unreadOnly, pagination.
- Required role: Faculty.
- Validation: Only messages targeted to current role/college/user; read state per user.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "notice-1",
    "title": "Midterm schedule",
    "message": "Review the class schedule.",
    "roles": [
      "faculty",
      "student"
    ],
    "createdAt": "2026-10-21T09:00:00Z",
    "readBy": []
  }
]
```

## 29. Faculty: Mark my notification as read

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/notifications/{notificationId}/read`
- HTTP method: `PATCH`
- Purpose: Mark my notification as read.
- Required request parameters: Path notificationId.
- Required role: Faculty.
- Validation: Verify recipient; idempotent per-user read state.

Example request body:

```json
{}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "notice-1",
  "title": "Midterm schedule",
  "message": "Review the class schedule.",
  "roles": [
    "faculty",
    "student"
  ],
  "createdAt": "2026-10-21T09:00:00Z",
  "readBy": [
    "faculty-1"
  ]
}
```

## 30. Faculty: Read my profile

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/profile`
- HTTP method: `GET`
- Purpose: Read my profile.
- Required request parameters: Authenticated session.
- Required role: Faculty.
- Validation: Current user only; academic and role fields read-only.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "faculty-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "",
  "role": "faculty",
  "status": "active",
  "phone": "9876543211"
}
```

## 31. Faculty: Update my contact number

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/faculty/me/profile`
- HTTP method: `PATCH`
- Purpose: Update my contact number.
- Required request parameters: Authenticated session.
- Required role: Faculty.
- Validation: Only phone editable; optional or valid Indian mobile number; reject academic, ID, status and role changes.

Example request body:

```json
{
  "phone": "9876543211"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "phone": "9876543211"
}
```

## 32. Student: Read my weekly class timetable

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/timetable`
- HTTP method: `GET`
- Purpose: Read my weekly class timetable.
- Required request parameters: Optional day, date range, academicYearId.
- Required role: Student.
- Validation: Resolve current faculty allocations or student section from session; only permitted college schedule; no edit actions.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "class-1",
    "assignmentId": "assignment-1",
    "day": "Monday",
    "start": "09:00",
    "end": "10:00",
    "room": "CSE 201"
  }
]
```

## 33. Student: Read targeted notifications

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/notifications`
- HTTP method: `GET`
- Purpose: Read targeted notifications.
- Required request parameters: Optional unreadOnly, pagination.
- Required role: Student.
- Validation: Only messages targeted to current role/college/user; read state per user.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "notice-1",
    "title": "Midterm schedule",
    "message": "Review the class schedule.",
    "roles": [
      "faculty",
      "student"
    ],
    "createdAt": "2026-10-21T09:00:00Z",
    "readBy": []
  }
]
```

## 34. Student: Mark my notification as read

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/notifications/{notificationId}/read`
- HTTP method: `PATCH`
- Purpose: Mark my notification as read.
- Required request parameters: Path notificationId.
- Required role: Student.
- Validation: Verify recipient; idempotent per-user read state.

Example request body:

```json
{}
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "notice-1",
  "title": "Midterm schedule",
  "message": "Review the class schedule.",
  "roles": [
    "faculty",
    "student"
  ],
  "createdAt": "2026-10-21T09:00:00Z",
  "readBy": [
    "student-1"
  ]
}
```

## 35. Student: Read my profile

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/profile`
- HTTP method: `GET`
- Purpose: Read my profile.
- Required request parameters: Authenticated session.
- Required role: Student.
- Validation: Current user only; academic and role fields read-only.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
{
  "id": "student-1",
  "name": "Aarav Reddy",
  "email": "aarav@example.edu",
  "departmentId": "cse",
  "sectionId": "cse-a",
  "role": "student",
  "status": "active",
  "phone": "9876543211"
}
```

## 36. Student: Update my contact number

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/profile`
- HTTP method: `PATCH`
- Purpose: Update my contact number.
- Required request parameters: Authenticated session.
- Required role: Student.
- Validation: Only phone editable; optional or valid Indian mobile number; reject academic, ID, status and role changes.

Example request body:

```json
{
  "phone": "9876543211"
}
```

Expected response (`data` inside the common success envelope):

```json
{
  "phone": "9876543211"
}
```

## 37. Student: Read enrolled subjects

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/subjects`
- HTTP method: `GET`
- Purpose: Read enrolled subjects.
- Required request parameters: Optional academicYearId, semesterId.
- Required role: Student.
- Validation: Resolve enrollment from authenticated student, not request studentId; read-only.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "assignment-1",
    "facultyId": "faculty-1",
    "subjectId": "dbms",
    "sectionId": "cse-a",
    "subject": {
      "id": "dbms",
      "name": "Database Management Systems",
      "code": "CS301",
      "departmentId": "cse",
      "credits": 4
    }
  }
]
```

## 38. Student: Read my attendance and subject progress

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/attendance`
- HTTP method: `GET`
- Purpose: Read my attendance and subject progress.
- Required request parameters: Optional assignmentId, date range, pagination.
- Required role: Student.
- Validation: Return only current student record per session; percentage policy and late-session treatment agreed with college.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "attendance-1",
    "assignmentId": "assignment-1",
    "date": "2026-10-21",
    "records": [
      {
        "studentId": "student-1",
        "status": "present"
      }
    ]
  }
]
```

## 39. Student: Read my published results

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/results`
- HTTP method: `GET`
- Purpose: Read my published results.
- Required request parameters: Optional assignmentId, semesterId, pagination.
- Required role: Student.
- Validation: Published only; current student records only; no draft leakage or mutation.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "result-1",
    "assignmentId": "assignment-1",
    "assessment": "Midterm 2",
    "maxMarks": 30,
    "published": true,
    "records": [
      {
        "studentId": "student-1",
        "marks": 26
      }
    ]
  }
]
```

## 40. Student: Read/download enrolled subject materials

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/materials`
- HTTP method: `GET`
- Purpose: Read/download enrolled subject materials.
- Required request parameters: Optional assignmentId, pagination.
- Required role: Student.
- Validation: Verify current enrollment and college; safe content/download metadata; no upload/remove.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "material-1",
    "assignmentId": "assignment-1",
    "title": "Normalization notes",
    "description": "Revision notes",
    "content": "First normal form...",
    "fileName": "notes.txt",
    "createdAt": "2026-10-21T09:00:00Z"
  }
]
```

## 41. Student: Read my fee statement

**Status:** PROPOSED, NOT IMPLEMENTED.

- Suggested endpoint: `/api/proposed/student/me/fees`
- HTTP method: `GET`
- Purpose: Read my fee statement.
- Required request parameters: Optional academicYearId.
- Required role: Student.
- Validation: Current student only, nonnegative amounts, paid <= amount unless credit explicitly modeled; read-only, no simulated payment API.

Example request body:

```json
null
```

Expected response (`data` inside the common success envelope):

```json
[
  {
    "id": "fee-1",
    "studentId": "student-1",
    "description": "Semester tuition",
    "amount": 45000,
    "paid": 30000,
    "dueDate": "2026-11-15"
  }
]
```
