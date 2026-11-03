-- Read-only verification. Select your database first (USE cms_btech;).
SET @inspect_college_id=87;
SET @inspect_user_id=NULL; -- Set this to the userId returned in a faculty conflict/log.

SELECT college_id,college_code,college_name,status,deleted_at
FROM colleges WHERE college_id=@inspect_college_id;

SELECT course_id,college_id,course_code,course_name,status,deleted_at
FROM courses WHERE course_code='BTECH' ORDER BY college_id,course_id;

-- NULL college_id means a preserved legacy shared type, not college 87 ownership.
SELECT leave_type_id,college_id,name,code,status
FROM faculty_leave_types WHERE name='Casual Leave' OR code='CL'
ORDER BY college_id,leave_type_id;

SELECT f.faculty_id,f.user_id,f.college_id AS faculty_college_id,
       u.college_id AS user_college_id,f.department_id,d.college_id AS department_college_id,
       f.status,f.deleted_at
FROM faculty f JOIN users u ON u.user_id=f.user_id
JOIN departments d ON d.department_id=f.department_id
WHERE f.college_id=@inspect_college_id OR d.college_id=@inspect_college_id
   OR (@inspect_user_id IS NOT NULL AND f.user_id=@inspect_user_id)
ORDER BY f.faculty_id;

-- Existing cross-college data inconsistencies; do not guess which side is the correct owner.
SELECT f.faculty_id,f.user_id,f.college_id AS faculty_college_id,
       u.college_id AS user_college_id,f.department_id,d.college_id AS department_college_id,
       f.status,f.deleted_at
FROM faculty f JOIN users u ON u.user_id=f.user_id
JOIN departments d ON d.department_id=f.department_id
WHERE f.college_id<>d.college_id
   OR (u.college_id IS NOT NULL AND f.college_id<>u.college_id)
ORDER BY f.faculty_id;

SELECT user_id,COUNT(*) AS faculty_count FROM faculty
GROUP BY user_id HAVING COUNT(*)>1;

SELECT college_id,course_code,COUNT(*) AS duplicate_count FROM courses
GROUP BY college_id,course_code HAVING COUNT(*)>1;
SELECT college_scope_id,name,COUNT(*) AS duplicate_count FROM faculty_leave_types
GROUP BY college_scope_id,name HAVING COUNT(*)>1;
SELECT college_scope_id,code,COUNT(*) AS duplicate_count FROM faculty_leave_types
GROUP BY college_scope_id,code HAVING COUNT(*)>1;

SHOW INDEX FROM courses;
SHOW INDEX FROM faculty_leave_types;
SHOW INDEX FROM faculty;
CALL sp_course_code_exists_in_college(87,'BTECH',NULL);
