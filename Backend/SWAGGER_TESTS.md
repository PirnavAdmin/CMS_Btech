# Academic Year College-Scoping Fix — Swagger Tests

Authorize Swagger with a valid token. Do not share JWT tokens in logs, tickets, or screenshots.

Assumptions from the supplied SQL dump: B.Tech College of Engineering has `collegeId = 1` and `college_code = 'BTECH001'`; college `81` exists but has no academic-year rows in that dump.

## 1. SuperAdmin reads B.Tech academic years
**GET** `/api/v1/academic-years?collegeId=1`

Expected: `200 OK`; every returned record has `collegeId: 1`. Existing names, dates, status, and archive values remain unchanged.

## 2. Another college does not receive B.Tech years
**GET** `/api/v1/academic-years?collegeId=81`

Expected: `200 OK` with an empty `data` array if that college has no academic years.

## 3. Same academic-year name is allowed in a different college
**POST** `/api/v1/academic-years?collegeId=81`

```json
{
  "academicYearName": "2026-2027",
  "startDate": "2026-06-01",
  "endDate": "2027-05-31"
}
```

Expected: `201 Created`, with `data.collegeId` equal to `81`. Repeating the same request for college 81 should return `409 Conflict`.

## 4. Non-SuperAdmin cannot change college scope
Authorize using a non-SuperAdmin token whose `collegeId` claim is `1`.

**GET** `/api/v1/academic-years?collegeId=81`

Expected: `403 Forbidden`. **GET** `/api/v1/academic-years` should use the college from the token.

## 5. SuperAdmin must specify a college
**GET** `/api/v1/academic-years` without `collegeId`

Expected: `400 Bad Request` asking SuperAdmin to select a college.

## 6. Generate next year
**POST** `/api/v1/academic-years/generate-next-year?collegeId=1`

```json
{
  "activateImmediately": false
}
```

Expected: a year scoped to college 1, or `409 Conflict` if the generated year already exists. For a college with no academic years, create its first year before using this endpoint.

## 7. SQL verification

```sql
SELECT ay.academic_year_id, ay.college_id, c.college_code, c.college_name,
       ay.academic_year_name, ay.start_date, ay.end_date, ay.status, ay.is_archived
FROM academicyears ay
JOIN colleges c ON c.college_id = ay.college_id
WHERE ay.deleted_at IS NULL
ORDER BY ay.college_id, ay.start_date;

SELECT college_id, COUNT(*) AS active_year_count
FROM academicyears
WHERE status = 1 AND is_archived = 0 AND deleted_at IS NULL
GROUP BY college_id
HAVING COUNT(*) > 1;
```

The second query should return no rows. The supplied dump has no active academic year; the migration intentionally preserves current status values rather than activating a year.
