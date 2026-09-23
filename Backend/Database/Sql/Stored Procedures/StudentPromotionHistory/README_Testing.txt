STUDENT COMPLETE PROMOTION HISTORY - TESTING

Task:
Develop API to retrieve a student's complete promotion history.

New API:
GET /api/v1/promotions/student/{studentId}/history

Example:
GET /api/v1/promotions/student/1/history

Authentication:
Bearer JWT is required because StudentPromotionController already uses [Authorize].

Database setup:
Execute sp_student_promotion_get_history.sql in cms_btech.

This implementation does NOT rename/remove existing promotion APIs.
The pre-existing GET /api/v1/promotions/history/{studentId} endpoint is preserved unchanged.

The new endpoint returns complete data from student_promotions, including:
- source/target academic year
- source/target course
- source/target branch
- source/target section
- source/target semester
- status and decision
- attendance and marks
- passed/failed subjects and backlogs
- eligibility
- promotion type/date/effective date
- reason/rejection reason
- final/active flags
- created/updated/decision user names and timestamps

Logs were added at controller, service and repository levels.
Database and unexpected exceptions are logged and converted to controlled API responses.
