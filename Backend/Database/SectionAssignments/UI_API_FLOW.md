# Section Assignment UI/API Flow

## Assign / Change Class Teacher screen
1. User selects a section.
2. Call `GET /api/v1/sections/{sectionId}/class-teacher` to show the current teacher.
3. Call `GET /api/v1/sections/{sectionId}/class-teacher-candidates` to populate the teacher dropdown.
4. User selects a teacher and clicks Assign/Change.
5. Call `PUT /api/v1/sections/{sectionId}/class-teacher` with:
   `{ "employeeProfileId": 5 }`
6. Refresh current teacher.

## Assign Students screen
1. User selects a section.
2. Call `GET /api/v1/sections/{sectionId}/capacity` and show Capacity / Assigned / Available.
3. Call `GET /api/v1/sections/{sectionId}/student-candidates?search=` to show available students.
4. Allow checkbox multi-select.
5. Before enabling Assign, compare selected count with `availableSeats` for immediate UI feedback.
6. Call `POST /api/v1/sections/{sectionId}/students/assign` with:
   `{ "studentIds": [1,2,3] }`
7. The stored procedure repeats capacity validation inside a transaction, so UI validation cannot bypass the rule.
8. Refresh `capacity`, `students`, and `student-candidates` after success.

## Existing students in section
Call `GET /api/v1/sections/{sectionId}/students`.
To remove one student call `DELETE /api/v1/sections/{sectionId}/students/{studentId}`.
