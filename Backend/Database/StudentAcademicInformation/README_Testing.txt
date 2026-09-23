TASK
Uday - Develop APIs for academic information view and update.

DATABASE TABLE USED
student_academic_details

ARCHITECTURE
StudentAcademicInformationController
  -> IStudentAcademicInformationService
  -> StudentAcademicInformationService
  -> IStudentAcademicInformationRepository
  -> StudentAcademicInformationRepository
  -> MySQL stored procedures
  -> student_academic_details

APIS
GET /api/v1/student-academic-information/{academicId}
PUT /api/v1/student-academic-information/{academicId}

FIRST STEP
Execute:
Database/StudentAcademicInformation/StudentAcademicInformationStoredProcedures.sql

EXISTING TEST IDS FROM Dump2ndsep.sql
AcademicId: 2, 3, 4, 5, 6

GET TEST
GET /api/v1/student-academic-information/2

PUT TEST
PUT /api/v1/student-academic-information/2

Request body:
{
  "rollNumber": "21B01A002",
  "registrationNumber": "REG2021002",
  "admissionNumber": "ADM2021002",
  "course": "B.Tech",
  "branch": "ECE",
  "department": "Electronics and Communication Engineering",
  "semester": 7,
  "section": "A",
  "academicYear": "2026-2027"
}

Then call GET /api/v1/student-academic-information/2 again to verify the update.
