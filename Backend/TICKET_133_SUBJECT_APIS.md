# Ticket 133 - Subject APIs

Implemented against the provided `Dump20260921.sql` schema.

## Existing APIs preserved

- `GET /api/v1/subjects`
- `GET /api/v1/subjects/{subjectId}`
- `GET /api/v1/subjects/search`

The existing GET method bodies/routes were not changed.

## Added APIs

- `POST /api/v1/subjects`
- `PUT /api/v1/subjects/{subjectId}`

## Create / Update request body

```json
{
  "subjectCode": "CS305",
  "subjectName": "Operating Systems",
  "courseId": 1,
  "branchId": 1,
  "semesterId": 3,
  "credits": 4.00,
  "subjectType": "THEORY",
  "description": "Operating system concepts",
  "status": 1
}
```

Use IDs that form a valid row in the `semesters` table: the selected `semesterId` must belong to the selected `courseId` and `branchId`.

## Tables used

- `subjects`
- `subject_course_branches`
- `subject_semesters`
- `subject_semester_assignments`

`subject_semester_assignments` is synchronized because the pre-existing List/Search implementation filters by semester using that table.

## Expected Swagger Subjects section

- POST `/api/v1/subjects`
- GET `/api/v1/subjects`
- GET `/api/v1/subjects/{subjectId}`
- PUT `/api/v1/subjects/{subjectId}`
- GET `/api/v1/subjects/search`

## Verification sequence

1. Start the backend and authorize Swagger with a valid JWT.
2. Verify the three existing GET APIs still work.
3. Create a subject with `POST /api/v1/subjects`.
4. Use the returned `subjectId` with `GET /api/v1/subjects/{subjectId}`.
5. Search the new subject using `/api/v1/subjects/search?search=CS305`.
6. Verify semester filtering using `/api/v1/subjects?semesterId=<semesterId>&status=1`.
7. Update it with `PUT /api/v1/subjects/{subjectId}`.
8. Re-run GET and search to confirm the update.

## Negative checks

- Duplicate subject code -> `409 Conflict`
- Invalid subject ID on update -> `404 Not Found`
- Invalid Course/Branch/Semester combination -> `400 Bad Request`
- Missing/invalid request fields -> `400 Bad Request`

No new database table or stored procedure is required for Ticket 133 with the supplied dump.
