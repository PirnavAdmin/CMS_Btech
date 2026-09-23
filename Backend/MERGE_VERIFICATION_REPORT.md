# CMS B.Tech API Merge Verification

## Source ZIPs
1. `phase-2.zip` — used as the base because it contains the Student Management modules.
2. `CMS_BTECH_PHASE02 - 12.zip` — used as the primary/latest base and retained intact except for the additions below.

## APIs preserved

### From the Student Management package
- Student APIs (`StudentsController`)
- Student Admission APIs (`StudentAdmissionsController`)
- Student Academic Details APIs (`StudentAcademicDetailsController`)
- Number Validation API (`NumberValidationController`)
- All existing College, Course, Branch, Department, Academic Year, Semester, Section, Subject Assignment, Course Structure, Profile, Auth, Role, OTP, Access Request, etc. APIs from the base package.

### Added from the other package
- `GET /api/admissions/{admissionId}/status`
- `PUT /api/admissions/{admissionId}/status`
- `GET /api/admissions/{admissionId}/status-history`
- `GET /api/student-parents/{studentId}`
- `PUT /api/student-parents/{studentId}`

## Merge changes
- Preserved the richer `StudentAdmission` model, including admission-status lifecycle/history fields.
- Added `StudentAdmission`, `AdmissionStatusHistory`, and `StudentParent` DbSets.
- Added EF Core mappings for admission status history and student parents.
- Preserved all Student Management services, repositories, DTOs, controllers, stored procedures, and documentation.
- Preserved the Phase 01 SQL task files under `Database/Phase01_Additional/BackendTasks/` so no source SQL was discarded.
- Preserved the base package's `appsettings.json` unchanged.

## Duplicate-file handling
The two packages contain many identical/common files. The latest/base version is retained for those files rather than creating conflicting duplicates.

## Important
The merged source contains the APIs from both ZIPs. Database tables/procedures still need to exist in the target MySQL database for the corresponding APIs to work at runtime.
