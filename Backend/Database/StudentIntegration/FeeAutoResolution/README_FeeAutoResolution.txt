STUDENT ADMISSION AUTOMATIC FEE RESOLUTION
==========================================

This change is additive. No existing API was removed, renamed, or replaced.

NEW API
-------
POST /api/v1/student-admissions/{admissionId}/resolve-fees

Purpose:
- Course/Tuition Fee: automatically resolved from fee_master_structures.
- Admission Fee: automatically resolved from fee_master_structures.
- Hostel Fee: resolved only when hostelRequired=true, using hostel type + room type.
- Transport Fee: resolved only when transportationRequired=true, using route id/code/name.
- Final values are saved into the EXISTING student_admission_fee_structures table.
- Existing GET /fee-summary and GET /fee-structure continue to work unchanged.

RUN FIRST
---------
Database/StudentIntegration/FeeAutoResolution/StudentAdmissionFeeAutoResolution_20260906.sql

IMPORTANT
---------
The supplied Dumpsep06th(2).sql has no reusable fee master tables. Therefore you must
configure fee_master_structures, hostel_fee_master and transport_fee_master with the
actual fee values used by your college. Example INSERT statements are included at the
bottom of the SQL script but are commented so no fake production amounts are inserted.

REQUEST EXAMPLE
---------------
POST /api/v1/student-admissions/17/resolve-fees
Authorization: Bearer <token>
Content-Type: application/json

{
  "academicYearId": 2,
  "courseId": 1,
  "departmentId": 1,
  "branchId": 1,
  "semesterId": 42,
  "admissionType": "Counseling",
  "entryType": "Regular",
  "quota": "Sports",
  "studentCategory": "General",
  "hostelRequired": true,
  "hostelType": "Girls Hostel",
  "roomType": "2 Bed Sharing",
  "transportationRequired": false,
  "routeId": null,
  "routeCode": null,
  "routeName": null,
  "scholarshipAmount": 0,
  "paymentPlan": "TERM_WISE",
  "paymentStatus": "PENDING"
}

2 Bed Sharing is normalized to Double Sharing by the service.
3 Bed Sharing -> Triple Sharing.
4 Bed Sharing -> Four Sharing.
Counseling -> Regular when EntryType is not explicitly provided.

When transportationRequired=false, TransportationFee is always 0.
When hostelRequired=false, HostelFee is always 0.

AFTER RESOLVE
-------------
GET /api/v1/student-admissions/17/fee-summary
GET /api/v1/student-admissions/17/fee-structure

Both existing APIs read the saved admission-level fee values.
