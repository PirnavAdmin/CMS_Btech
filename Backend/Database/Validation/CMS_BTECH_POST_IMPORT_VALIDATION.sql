-- CMS B.Tech post-import validation (read-only)
-- Run after importing CMS_BTECH_COMPLETE_UPDATED.sql, or after the supplied
-- dump followed by CMS_BTECH_INTEGRATION_UPDATE_20260903.sql.

SELECT DATABASE() AS database_name, VERSION() AS mysql_version, UTC_TIMESTAMP() AS checked_at_utc;

SELECT
    required.name AS required_object,
    CASE WHEN actual.TABLE_NAME IS NULL THEN 'MISSING' ELSE 'PASS' END AS result
FROM (
    SELECT 'academic_levels' AS name UNION ALL SELECT 'academicyears' UNION ALL
    SELECT 'admission_status_history' UNION ALL SELECT 'branches' UNION ALL
    SELECT 'college_settings' UNION ALL SELECT 'college_user_mappings' UNION ALL
    SELECT 'colleges' UNION ALL SELECT 'course_semester_mappings' UNION ALL
    SELECT 'course_structures' UNION ALL SELECT 'courses' UNION ALL
    SELECT 'departments' UNION ALL SELECT 'employee_profiles' UNION ALL
    SELECT 'login_audits' UNION ALL SELECT 'otp_verifications' UNION ALL
    SELECT 'password_reset_tokens' UNION ALL SELECT 'profile_change_audits' UNION ALL
    SELECT 'refresh_tokens' UNION ALL SELECT 'registration_requests' UNION ALL
    SELECT 'roles' UNION ALL SELECT 'sections' UNION ALL SELECT 'semesters' UNION ALL
    SELECT 'student_academic_details' UNION ALL SELECT 'student_admission_fee_structures' UNION ALL
    SELECT 'student_admission_form_data' UNION ALL SELECT 'student_admission_previous_education' UNION ALL
    SELECT 'student_document_files' UNION ALL SELECT 'student_documents' UNION ALL
    SELECT 'student_parents' UNION ALL SELECT 'student_profile_updates' UNION ALL
    SELECT 'student_profiles' UNION ALL SELECT 'student_promotions' UNION ALL
    SELECT 'student_section_assignments' UNION ALL SELECT 'student_sections' UNION ALL
    SELECT 'studentadmissions' UNION ALL SELECT 'students' UNION ALL
    SELECT 'subject_semester_assignments' UNION ALL SELECT 'user_roles' UNION ALL SELECT 'users'
) AS required
LEFT JOIN information_schema.TABLES AS actual
    ON actual.TABLE_SCHEMA = DATABASE()
   AND actual.TABLE_NAME = required.name
ORDER BY required.name;

SELECT
    COUNT(*) AS stored_procedure_count,
    CASE WHEN COUNT(*) >= 173 THEN 'PASS' ELSE 'CHECK_REQUIRED' END AS result
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_TYPE = 'PROCEDURE';

SELECT 'active_academic_years_at_most_one' AS check_name,
       COUNT(*) AS issue_count,
       CASE WHEN COUNT(*) <= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM academicyears
WHERE status = 1 AND is_archived = 0 AND deleted_at IS NULL;

SELECT 'semester_course_reference_missing' AS check_name,
       COUNT(*) AS issue_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM semesters AS semester
LEFT JOIN courses AS course
       ON course.course_id = semester.course_id
WHERE semester.course_id IS NULL OR course.course_id IS NULL;

SELECT 'duplicate_course_semester_mapping' AS check_name,
       COUNT(*) AS issue_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM (
    SELECT course_id, semester_id
    FROM course_semester_mappings
    WHERE deleted_at IS NULL
    GROUP BY course_id, semester_id
    HAVING COUNT(*) > 1
) AS duplicates;

SELECT 'orphan_active_student_section_assignment' AS check_name,
       COUNT(*) AS issue_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM student_section_assignments AS assignment
LEFT JOIN students AS student ON student.student_id = assignment.student_id
LEFT JOIN sections AS section ON section.section_id = assignment.section_id
WHERE assignment.status = 1
  AND (student.student_id IS NULL OR section.section_id IS NULL);

SELECT 'invalid_admission_form_json' AS check_name,
       COUNT(*) AS issue_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM student_admission_form_data
WHERE form_data IS NOT NULL
  AND JSON_VALID(form_data) = 0;

-- Historic/archived Course references are valid foreign-key references but merit review.
SELECT semester.semester_id,
       semester.semester_name,
       semester.course_id,
       course.course_name,
       'REVIEW_ARCHIVED_COURSE' AS result
FROM semesters AS semester
JOIN courses AS course ON course.course_id = semester.course_id
WHERE course.deleted_at IS NOT NULL
ORDER BY semester.semester_id;

-- Seed-data diagnostic only: non-zero rows should be reviewed, not automatically rewritten.
SELECT section.section_id,
       section.section_code,
       section.course_id AS section_course_id,
       branch.course_id AS branch_course_id,
       section.branch_id,
       section.semester_id,
       semester.branch_id AS semester_branch_id,
       'REVIEW_SEED_RELATIONSHIP' AS result
FROM sections AS section
LEFT JOIN branches AS branch ON branch.branch_id = section.branch_id
LEFT JOIN semesters AS semester ON semester.semester_id = section.semester_id
WHERE section.deleted_at IS NULL
  AND (branch.branch_id IS NULL
       OR branch.course_id <> section.course_id
       OR (section.semester_id IS NOT NULL AND semester.branch_id <> section.branch_id))
ORDER BY section.section_id;
