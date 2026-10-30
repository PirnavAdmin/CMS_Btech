# Section allocation fix — 1 October 2026

## Apply

1. Back up your database and stop the backend while changing procedures/triggers.
2. If your earlier fixes are already installed, run ONLY `Database/SectionAssignments/CMS_BTech_Section_Allocation_Fix_20261001.sql` in MySQL Workbench, against `cms_btech`. Stop on any SQL error.
3. For a fresh database restored from the uploaded `sql dump.sql`, first apply your supplied `CMS_BTech_All_Fixes_V2.sql`, then `CMS_BTech_Section_Department_Optional_20261001(1).sql`, and finally this allocation patch. Do not rerun the old ownership-repair V2 script after this patch; V2's snapshot guard expects missing profiles.
4. Use this updated backend project with your existing connection string. Run `dotnet build` and start the backend.
5. GET `/api/v1/sections/{sectionId}/class-teacher-candidates` and `/api/v1/sections/{sectionId}/student-candidates` using a valid token. Save the returned `employeeProfileId` for faculty and returned `studentId` values for students. `facultyId`, `userId`, and `admissionId` are different identities.
6. POST `/api/v1/sections/{sectionId}/students/assign` with `{ "studentIds": [<returned studentId>, <returned studentId>] }`. GET `/api/v1/sections/{sectionId}/students` to confirm the rows.

No frontend files or routes were removed. Apply the new allocation patch last; old database dumps/setup scripts contain historical procedure definitions.

## What was wrong

- Faculty creation allowed a NULL employee-profile link. Several faculty had no profile at all; one had a real profile reachable through its unique user ID. The old candidate procedure queried employees instead of requiring a faculty record.
- Admission approval changed admission status but did not create the linked student master. Approved admissions 34 and 35 had valid college/course/branch/year mappings but no student rows.
- Existing students 2 and 3 were already assigned; student 4 belonged to academic year 1 while the sections belonged to year 2. Excluding these rows is correct.
- Admission 1 records semester ID 42, which does not exist in the supplied dump. The patch leaves that record unmaterialized and reports the inconsistent mapping. It does not replace 42 with another ID.
- Save previously moved existing assignments silently despite the candidate GET requiring unassigned students. Save now rejects the entire batch instead.

## Resulting behavior

- Active faculty must have a real profile belonging to the same user and an exact faculty-college match. An explicit conflicting user college is rejected. Missing profiles are created from verified faculty/user ownership; existing IDs, credentials, statuses, and college ownership are preserved. Department is not required for section allocation; its active flag does not override an otherwise active faculty/profile/user identity.
- Approved/admitted admissions with coherent college/course/branch/year data become actual auto-increment students linked through `students.admission_id`. New admission and faculty writes maintain these relationships through narrowly named triggers in the same transaction. Candidate GETs remain read-only. Existing student progression/status is never overwritten by admission synchronization.
- A shared eligibility view drives GET and save. College/course/branch/year, active and nondeleted status, valid section-semester mapping, known current student semester, and unassigned checks stay enforced. The established student-master allocation contract has no required semester field: missing legacy semester data is not invented; any recorded semester is validated.
- Section and student row locks protect batch saves. One active assignment per student is enforced by a generated unique key, preserving inactive history. Malformed/duplicate IDs, capacity overflow, mapping mismatches, inactive records, or existing assignments reject the entire batch.
- SQL business errors return detailed 400 responses, allocation procedures are logged, and the removal route uses only the StudentId named by its route; it no longer guesses an assignment ID.
- The patch is rerunnable. Conflicting duplicate admission links or active assignments cause preflight failure instead of deleting or merging data.

## Verification performed

The user live localhost database was not accessible. Verification used an isolated MySQL 8.0.46 restore of the supplied MySQL 8.0.45 dump, both supplied prerequisite SQL patches, and the updated .NET 8 backend.

- Build: 0 errors, 4 pre-existing warnings in unrelated files.
- Section 3 faculty candidate GET: HTTP 200, 11 eligible faculty.
- Section 3 student candidate GET: HTTP 200, admission 34 -> student 5; admission 35 -> student 6. These IDs are observed in the restored test database, not values to assume in your database.
- Batch assignment: HTTP 200, newlyAssigned=2, totalAssigned=2, availableSeats=58. Both rows persisted and appeared in assigned-students GET; candidate GET then returned no rows.
- Cross-college faculty, mixed-validity batch, capacity overflow, already-assigned students, malformed JSON IDs and unauthenticated requests were rejected.
- Admission creation on approval participated in rollback; migration rerun did not duplicate rows.
- Two concurrent batches targeting different sections yielded one success and one rejection, with only one active assignment per student. Two requests for the last seat yielded one success and one rejection.

Detailed results: `Database/SectionAssignments/Verification_20261001/verification_results.json`.
