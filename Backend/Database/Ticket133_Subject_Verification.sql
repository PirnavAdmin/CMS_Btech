-- Ticket 133 verification queries only.
-- No schema changes are required when using the supplied Dump20260921.sql.

-- 1. Subjects
SELECT *
FROM subjects
ORDER BY subject_id DESC;

-- Replace 1 with the subject_id returned by POST /api/v1/subjects.
SET @subject_id = 1;

-- 2. Subject -> Course/Branch mapping
SELECT *
FROM subject_course_branches
WHERE subject_id = @subject_id;

-- 3. Subject -> Semester mapping
SELECT *
FROM subject_semesters
WHERE subject_id = @subject_id;

-- 4. Compatibility mapping used by existing List/Search semester filter
SELECT *
FROM subject_semester_assignments
WHERE subject_id = @subject_id;

-- 5. Combined verification
SELECT
    s.subject_id,
    s.subject_code,
    s.subject_name,
    s.credits,
    s.subject_type,
    s.status,
    scb.course_id,
    c.course_code,
    c.course_name,
    scb.branch_id,
    b.branch_code,
    b.branch_name,
    ss.semester_id,
    sem.semester_number,
    sem.semester_name
FROM subjects s
LEFT JOIN subject_course_branches scb
       ON scb.subject_id = s.subject_id
LEFT JOIN courses c
       ON c.course_id = scb.course_id
LEFT JOIN branches b
       ON b.branch_id = scb.branch_id
      AND b.course_id = scb.course_id
LEFT JOIN subject_semesters ss
       ON ss.subject_id = scb.subject_id
      AND ss.course_id = scb.course_id
      AND ss.branch_id = scb.branch_id
LEFT JOIN semesters sem
       ON sem.semester_id = ss.semester_id
      AND sem.course_id = ss.course_id
      AND sem.branch_id = ss.branch_id
WHERE s.subject_id = @subject_id;
