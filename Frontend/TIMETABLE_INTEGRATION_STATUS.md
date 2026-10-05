# Timetable API integration status ? 2026-10-05

## Current evidence and limitation

Successfully downloaded the deployed OpenAPI document to timetable-current-openapi.json using Node's TLS client. The earlier Windows TLS failures no longer block discovery. All 37 timetable-management operations below have verified paths, methods, request DTOs and query parameters. No batch generation endpoint is advertised; generation is per timetable. The older /timetables and /timetable-entries families also exist, but should not be mixed with the advanced lifecycle without verifying their semantics.

Swagger omits response schemas, enum constraints, authorization roles, pagination, validation semantics and error bodies. Live read-only GET requests to timetables, periods, calendar and classrooms returned 401 without credentials. Updated backend implementation or sanitized authenticated response examples are still required before activating the lifecycle composition. No live mutation was attempted.

## Changes

- Added src/api/timetableLifecycleApi.js: all 37 documented advanced operations reuse the existing API client; validates numeric path IDs, filters documented query fields, preserves response/error objects and never reads local storage.
- Updated backendTimetableService.js: Regenerate uses the dedicated /regenerate route; initial generation and Generate Missing use distinct routes. Added status, global validation, room availability, move and occurrence service methods. Move refetches detail after success. These service methods are not yet wired into the active UI.
- Added src/api/timetableLifecycleApi.test.js: checks complete route/method/query/DTO coverage against downloaded Swagger, response identity and propagation of 400/401/403/404/409/422/500 errors.
- Repaired src/api/timetableManagementApi.test.js dependency harness and updated backend service generation tests.
- Prior fixes retained: mock persistence requires explicit development opt-in and cannot run in production; saved end dates are not silently cleared. Existing mock E2E explicitly enables development mode.

## Active workflow and unsupported behavior

The production UI still uses verified legacy entry reads/edits. Advanced lifecycle response mapping is not activated: existing normalizeTimetable assumptions have not been verified against authenticated responses. No new response fields or publication state were invented. Draft creation, period setup, generation, global validation, publication/reopen and advanced faculty/calendar/occupancy flows are therefore not yet integrated into the active production UI. Mock and legacy adapters remain on disk, disabled by default. No API-error mock fallback, schema migration, theme redesign or backend change was introduced.

## Contract map

Every route uses the configured shared API client with existing bearer authentication and error handling. Path IDs are positive backend numeric IDs. Responses are opaque because the server's Swagger supplies only a 200 description.

| Method | Endpoint | Request DTO or query fields |
| --- | --- | --- |
| GET | `/api/v1/timetable-management/periods` | academicYearId |
| POST | `/api/v1/timetable-management/periods` | PeriodConfigurationRequest |
| POST | `/api/v1/timetable-management/periods/automatic` | AutomaticPeriodSetupRequest |
| PUT | `/api/v1/timetable-management/periods/{periodId}` | PeriodConfigurationRequest |
| DELETE | `/api/v1/timetable-management/periods/{periodId}` | No body/query |
| PUT | `/api/v1/timetable-management/periods/reorder` | PeriodReorderRequest |
| GET | `/api/v1/timetable-management/calendar` | academicYearId |
| PUT | `/api/v1/timetable-management/calendar` | CalendarConfigurationRequest |
| GET | `/api/v1/timetable-management/classrooms` | collegeId, activeOnly |
| POST | `/api/v1/timetable-management/classrooms` | ClassroomRequest |
| PUT | `/api/v1/timetable-management/classrooms/{classroomId}` | ClassroomRequest |
| GET | `/api/v1/timetable-management/timetables` | academicYearId, courseId, branchId, semesterId, sectionId, status |
| POST | `/api/v1/timetable-management/timetables` | CreateAdvancedTimetableRequest |
| GET | `/api/v1/timetable-management/timetables/{timetableId}` | No body/query |
| PUT | `/api/v1/timetable-management/timetables/{timetableId}` | UpdateAdvancedTimetableRequest |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/sync-periods` | No body/query |
| GET | `/api/v1/timetable-management/timetables/{timetableId}/requirements` | No body/query |
| PUT | `/api/v1/timetable-management/timetables/{timetableId}/requirements` | SaveTimetableRequirementsRequest |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/generate` | GenerateTimetableRequest |
| GET | `/api/v1/timetable-management/timetables/{timetableId}/status` | No body/query |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/regenerate` | GenerateTimetableRequest |
| GET | `/api/v1/timetable-management/timetables/{timetableId}/rooms/availability` | timetableSlotId, dayOfWeek |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/generate-missing` | GenerateTimetableRequest |
| GET | `/api/v1/timetable-management/timetables/{timetableId}/entries` | facultyId, dayOfWeek |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/entries` | ManualTimetableEntryRequest |
| PUT | `/api/v1/timetable-management/timetables/{timetableId}/entries/{entryId}` | ManualTimetableEntryRequest |
| DELETE | `/api/v1/timetable-management/timetables/{timetableId}/entries/{entryId}` | No body/query |
| PUT | `/api/v1/timetable-management/timetables/{timetableId}/entries/{entryId}/move` | MoveTimetableEntryRequest |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/validate` | No body/query |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/validate-global` | No body/query |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/publish` | No body/query |
| POST | `/api/v1/timetable-management/timetables/{timetableId}/reopen` | No body/query |
| GET | `/api/v1/timetable-management/views/faculty/{facultyId}` | academicYearId, date |
| GET | `/api/v1/timetable-management/views/student/{studentId}` | academicYearId, date |
| GET | `/api/v1/timetable-management/views/classroom/{classroomId}` | academicYearId, date |
| GET | `/api/v1/timetable-management/views/section/{sectionId}` | academicYearId, date |
| GET | `/api/v1/timetable-management/occurrences` | date, sectionId, facultyId, classroomId |

## Verification

All 47 selected contract, API-boundary, service and domain tests pass, including the 9 focused transport/contract/service tests. They verify request routing and mocked-boundary behavior, not live backend response compatibility. Focused lint passes. The intercepted mock browser suite passed in the preceding turn including mobile/tablet; it was not repeated for these disconnected transport changes. Full-project lint has an unrelated conditional useState error in FacultyManagement.jsx:613. Production build passes with the existing large-chunk warning. Live admin-to-faculty generation/publication was not verified. This is not a completed UI integration.
