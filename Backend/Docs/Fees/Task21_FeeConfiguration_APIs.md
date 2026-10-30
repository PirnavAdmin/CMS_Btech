# Task 21 - Fee Category, Structure and Assignment APIs

Only Task 21 files are added by this task. Existing teammate files are not modified.

## Endpoints

- `GET /api/v1/fee-categories`
- `GET /api/v1/fee-structures`
- `POST /api/v1/fee-structures`
- `POST /api/v1/students/{studentId}/fee-structures`

## Database tables used

The API matches the supplied database dump:

- `fee_categories`
- `fee_structures`
- `fee_assignments`

It does **not** create or query a duplicate `student_fee_assignments` table.

## Fee structure request

`feeStructureCode` maps to `fee_structures.structure_code` and `feeStructureName` maps to `structure_name`.
`structureGroupCode` is optional and defaults to `feeStructureCode`.
`college_id` is resolved from the selected course, so it is not required in the request body.

Example:

```json
{
  "feeCategoryId": 1,
  "feeStructureCode": "TUITION-CSE-2026-S1",
  "feeStructureName": "CSE Tuition Fee - Semester 1",
  "academicYearId": 2,
  "courseId": 1,
  "branchId": 1,
  "semesterId": 1,
  "amount": 45000,
  "dueDate": "2027-05-31T00:00:00Z"
}
```

If `effectiveFrom` / `effectiveTo` are omitted, the academic-year start/end dates are used. If `dueDate` is supplied and `effectiveTo` is omitted, `dueDate` is used as the effective end date for backward compatibility with the original Task 21 Swagger shape.

## Assignment request

The supplied dump uses `fee_assignments`, whose `assignment_code` is mandatory. The API generates that code automatically.

Example:

```json
{
  "feeStructureId": 1,
  "assignedAmount": 45000,
  "assignedOn": "2026-10-07T00:00:00Z",
  "dueDate": "2026-11-30T00:00:00Z",
  "remarks": "Semester 1 tuition fee"
}
```

`dueDate` is accepted for compatibility with the original request shape, but it is not written to `fee_assignments` because the supplied schema stores due dates in `student_fees`.

## Validation

- Validates fee category, academic year, course, branch and semester.
- Validates branch belongs to course and semester belongs to course/branch.
- Prevents duplicate `structure_code`.
- Prevents duplicate active student/fee-structure assignments.
- Validates student and fee structure belong to the same college.
- Returns 4xx responses for expected database/validation failures instead of leaking database errors as 500 responses.
