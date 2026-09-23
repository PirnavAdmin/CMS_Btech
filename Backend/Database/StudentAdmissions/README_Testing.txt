STUDENT ADMISSION / REGISTRATION API
====================================

Database source: Dump01-09-2026.sql -> studentadmissions table

1. Execute:
   Database/StudentAdmissions/StudentAdmissionStoredProcedures.sql

2. Restart API and authorize Swagger.

3. Endpoints:
   POST /api/v1/student-admissions
   PUT  /api/v1/student-admissions/{admissionId}
   GET  /api/v1/student-admissions/{admissionId}

Create test JSON (uses IDs present in the supplied dump):
{
  "registrationNo": "REG2026010",
  "registrationDate": "2026-09-01",
  "applicationNo": "APP2026010",
  "applicationDate": "2026-09-01",
  "admissionType": "New Admission",
  "admissionQuota": "General",
  "medium": "English",
  "scholarshipStatus": "Pending",
  "firstName": "Aarav",
  "lastName": "Rao",
  "gender": "Male",
  "dateOfBirth": "2015-08-10",
  "bloodGroup": "O+",
  "studentEmail": "aarav.rao@example.com",
  "mobileNumber": "9876543299",
  "nationality": "Indian",
  "fatherName": "Ramesh Rao",
  "motherName": "Sujatha Rao",
  "address": "Madhapur",
  "city": "Hyderabad",
  "district": "Ranga Reddy",
  "state": "Telangana",
  "pincode": "500081",
  "academicYearId": 2,
  "academicLevelId": 1,
  "sectionId": 1,
  "previousSchool": "ABC Public School",
  "previousBoard": "CBSE",
  "previousYear": "2025",
  "previousPercentage": 88.50,
  "status": "Active",
  "admissionStatus": "Draft",
  "interviewRequired": false,
  "admissionFeeAmount": 25000,
  "remarks": "New registration created through API.",
  "isActive": true
}

For PUT, use the same JSON and change fields you want to update.
The supplied SQL dump already has AdmissionId 1..5, so you can test update with /1 if the dump was imported unchanged.
