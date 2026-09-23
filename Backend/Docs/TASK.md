# Faculty Status History

## Task

Update faculty status and record every status change
in faculty_status_history.

## APIs

### 1. Update Faculty Status

PATCH
/api/v1/faculty/{facultyId}/status

Request:

{
  "status": "INACTIVE",
  "reason": "Faculty resigned"
}

Behaviour:

- Validate faculty.
- Read current status.
- Update faculty.status.
- Insert old status and new status into
  faculty_status_history.
- Use transaction for update + history insert.
- Do not create duplicate history when status is unchanged.

### 2. Get Faculty Status History

GET
/api/v1/faculty/{facultyId}/status-history

Returns all status changes for the faculty,
ordered by changed_at descending.

## Files Added

- Controllers/FacultyStatusController.cs
- DTOs/UpdateFacultyStatusRequest.cs
- DTOs/FacultyStatusHistoryResponse.cs
- Repositories/IFacultyStatusRepository.cs
- Repositories/FacultyStatusRepository.cs