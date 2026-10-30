# Frontend → Phase 5 Backend Integration Map

The supplied frontend currently declares `createTimetable`, `createSlot`, `draft`, `publish`, `roomIds` and `calendar` as unavailable and uses a localStorage timetable workflow. Replace that fallback with these Phase 5 APIs.

| Frontend capability/screen | Backend API |
|---|---|
| Load existing Academic Year/Course/Branch/Semester/Section/Subject/Faculty | Keep current master APIs |
| Automatic periods | `POST /api/v1/timetable-management/periods/automatic` |
| Manual periods | `POST/PUT/DELETE /api/v1/timetable-management/periods...` |
| Period reorder | `PUT /api/v1/timetable-management/periods/reorder` |
| Working days + holidays review | `GET/PUT /api/v1/timetable-management/calendar` |
| Room master | `GET/POST/PUT /api/v1/timetable-management/classrooms` |
| Create draft | `POST /api/v1/timetable-management/timetables` |
| Open draft | `GET /api/v1/timetable-management/timetables/{id}` |
| Update draft metadata/dates | `PUT /api/v1/timetable-management/timetables/{id}` |
| Sync CLASS periods to timetable slots | `POST /api/v1/timetable-management/timetables/{id}/sync-periods` |
| Per-subject periods/week + consecutive block | `GET/PUT .../{id}/requirements` |
| Auto Generate | `POST .../{id}/generate` |
| Generate Missing | `POST .../{id}/generate-missing` |
| Manual Add | `POST .../{id}/entries` |
| Manual Edit | `PUT .../{id}/entries/{entryId}` |
| Move/Reschedule | `PUT .../{id}/entries/{entryId}/move` |
| Remove class | `DELETE .../{id}/entries/{entryId}` |
| Validate | `POST .../{id}/validate` |
| Publish | `POST .../{id}/publish` |
| Move back to Draft | `POST .../{id}/reopen` |
| Faculty Timetable | `GET /api/v1/timetable-management/views/faculty/{facultyId}` |
| Student Timetable | `GET /api/v1/timetable-management/views/student/{studentId}` |
| Classroom Timetable | `GET /api/v1/timetable-management/views/classroom/{classroomId}` |
| Section Timetable | `GET /api/v1/timetable-management/views/section/{sectionId}` |
| Date occurrence / future attendance | `GET /api/v1/timetable-management/occurrences` |

The new backend returns structured `conflicts` and `unscheduled` results. Frontend validation can remain for UX, but the API response is authoritative.
