# Subject screen API contract

Every endpoint requires the existing bearer token. Successful JSON responses have `{ success: true, message?, data }`. For list endpoints `data` is always an array. Failures include `success: false`, `message`, field-level `errors`, and `correlationId`.

Use base path **`/api/v1/subject-management/subjects`** for the uploaded Subject screen. Returned rows include `id`, `subjectId`, `subjectCode`, `subjectName`, `academicYearId`, `academicYear`, `courseId`, `course`, `branchId`, `branch`, `semesterId`, `semester`, `semesterNumber`, `academicLevel`, `collegeId`, `departmentId`, `department`, `subjectType`, `electiveType`, `credits`, `lectureHours`, `tutorialHours`, `practicalHours`, `internalMarks`, `externalMarks`, calculated `totalMarks`, `description`, `status`, `statusValue`, and `mappings`.

The existing base path **`/api/v1/subjects`** also supports these endpoints and keeps numeric `status` and original snake_case fields for existing faculty/timetable consumers. It adds the same camelCase aliases and `statusName`. The screen path instead returns `status: "Active"` or `"Inactive"`; `statusValue` always remains 0 or 1.

| Screen operation | Method | Path after base |
|---|---|---|
| Directory, filters and pagination | GET | empty |
| Search by code/name | GET | `/search?search=...` |
| View details | GET | `/{id}` |
| Add subject | POST | empty |
| Edit subject / screen's existing full-payload status toggle | PUT | `/{id}` |
| Status only | PATCH or PUT | `/{id}/status` |
| Delete with dependencies check | DELETE | `/{id}` |
| Check related records | GET | `/{id}/dependencies` |
| Cascading academic selectors | GET | `/lookups` |
| Filtered KPI totals | GET | `/summary` |
| All filtered rows as CSV/Excel | GET | `/export?format=csv` or `/export?format=xlsx` |
| Export alias | GET | `/download?format=csv` |

Directory/search/summary/export filters: `search`, `collegeId`, `academicYearId`, `courseId`, `branchId`, `semesterId`, `level` (`1st Year` or `1`), `subjectType`, `electiveType`, and `status` (Active/Inactive/1/0). Optional `page` and `pageSize` (1–500); omitting both returns all matching rows for the existing client-side pagination. Pagination does not affect summary or export. Lookups honor college/year/course/branch filters. Subject types retain the entered label/case and support the screen's custom type field.

Create/update payload (replace mapping IDs with values from lookups):

```json
{
  "academicYearId": 2,
  "courseId": 1,
  "branchId": 1,
  "semesterId": 1,
  "subjectCode": "CSE-SM-201",
  "subjectName": "Database Systems",
  "subjectType": "Theory",
  "electiveType": "Non-Elective",
  "credits": 4,
  "lectureHours": "3",
  "tutorialHours": "1",
  "practicalHours": "",
  "internalMarks": "30",
  "externalMarks": "70",
  "status": "Active",
  "description": "Relational databases and SQL"
}
```

Required: subjectCode, subjectName, courseId, branchId, semesterId. The current screen additionally supplies academicYearId and electiveType; when academicYearId is supplied it MUST match the selected semester's year. Legacy callers can omit it and the backend derives the year from the semester. SemesterId is the database ID, not the semester number. ElectiveType defaults to Non-Elective on create only. IDs can be JSON numbers or numeric strings. Hours/marks/credits accept numbers or numeric strings; optional empty numeric inputs become zero. Credits/hours: 0–999.99; marks: 0–99999.99; storage uses two decimal places. Omitted optional fields on PUT retain existing values; an empty string clears description/type or clears optional numbers to zero. Total marks and academic names are derived server-side; submitted display labels cannot override master data.

Status-only body: `{ "status": "Inactive" }`. Numeric 0/1 and boolean statuses are also accepted. Current screen PUT toggling is supported with its full subject row.

Existing multiple mappings appear in `mappings`. A filtered list displays the matching academic mapping, preferring the subject's selected primary mapping when it matches. An unfiltered row uses the primary mapping or the first active legacy mapping. Remapping changes the selected primary mapping and preserves unrelated secondary mappings. Subjects with related records cannot be moved to another academic context. `409` includes the conflicting field; call dependencies to show related counts. Deleting an in-use subject is rejected rather than deleting dependent records.

## Four service calls to wire in the frontend

- `getSubjects(params)` → GET base, return `response.data.data` for an Axios response (or `json.data` after fetch).
- `createSubject(payload)` → POST base, return the response's `data` row.
- `updateSubject(id, payload)` → PUT base + `/{id}`, return the response's `data` row.
- `deleteSubject(id)` → DELETE base + `/{id}`, reload after success.

Remove the localStorage CRUD path for these four methods when integrating. Do not use synthetic `SUB-...` local IDs with the API; reload the server directory and use returned numeric `id`. No frontend files have been changed by this delivery.
