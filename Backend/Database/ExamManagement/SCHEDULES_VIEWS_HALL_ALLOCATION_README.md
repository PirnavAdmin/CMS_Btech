# Schedules, Views and Exam Hall Allocation

This is an additive implementation for the task **Implement schedules, views and hall allocation**.

## Existing functionality intentionally left unchanged

- `exam_schedules` already exists in the supplied database dump.
- Existing schedule CRUD APIs already exist in `Controllers/V1/ExamsController.cs` and were not modified.
- Existing room/section allocation APIs were not modified.
- No existing controller, model, DTO, repository, service, route, or database table was removed or renamed.

## Added files

- `Database/ExamManagement/Ticket_Schedules_Views_Hall_Allocation.sql`
  - Adds `exam_hall_allocations` if missing.
  - Adds `vw_exam_schedule_details`.
  - Adds `vw_exam_hall_allocation_details`.
  - Adds `vw_exam_schedule_hall_summary`.
- `DTOs/Exams/ExamHallAllocationDtos.cs`
- `Controllers/V1/ExamSchedulesViewsController.cs`

## New APIs

### Schedule views

- `GET /api/v1/exam-schedules/views`
- `GET /api/v1/exam-schedules/views/hall-summary`

### Hall allocation

- `GET /api/v1/exam-schedules/hall-allocations`
- `GET /api/v1/exam-schedules/hall-allocations/{allocationId}`
- `POST /api/v1/exam-schedules/hall-allocations`
- `PUT /api/v1/exam-schedules/hall-allocations/{allocationId}`
- `DELETE /api/v1/exam-schedules/hall-allocations/{allocationId}`

The new controller uses only framework-provided `IConfiguration`/logging services, so `Program.cs` does not need to be changed.

## Allocation validations

- Schedule and classroom must be active and belong to the authenticated college.
- Allocated students cannot exceed classroom capacity when capacity is defined.
- Total allocated students for a schedule cannot exceed its section capacity when a section is assigned.
- A classroom cannot be allocated to overlapping exam schedules.
- A schedule/classroom pair is unique.
- Seat range values must be supplied together and be in ascending order.
- Deletes are soft deletes.
