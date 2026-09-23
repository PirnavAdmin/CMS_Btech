STUDENT ACADEMIC DETAILS APIs
=============================

Task:
Develop APIs to retrieve and update student academic details.

APIs:
1) GET /api/v1/student-admissions/{admissionId}/academic-details
2) PUT /api/v1/student-admissions/{admissionId}/academic-details

Before testing:
Execute Database/StudentAdmissions/StudentAcademicDetailsStoredProcedures.sql in cms_btech.

Swagger test:
Use an existing AdmissionId from studentadmissions (for example 1 if it exists).

GET:
/api/v1/student-admissions/1/academic-details

PUT:
/api/v1/student-admissions/1/academic-details

Sample request:
{
  "boardId": null,
  "academicYearId": 2,
  "academicLevelId": null,
  "groupId": null,
  "sectionId": 1,
  "medium": "English",
  "secondLanguage": "Hindi",
  "previousSchool": "ABC High School",
  "previousBoard": "SSC",
  "previousYear": "2025-26",
  "previousPercentage": 88.50,
  "previousHallTicket": "HT2025001"
}

Important:
- Use only IDs that exist in your database.
- 0 is normalized to NULL by the service for optional ID fields.
- previousPercentage must be between 0 and 100.
