-- CMS B.Tech - relationship-safe cleanup for the 09-SEP-2026 dump.
-- Only unmistakable placeholder data is disabled/removed here.
-- Real-looking student/admission/user records are deliberately NOT deleted.
USE cms_btech;
SET @cleanup_user_id := 1;

START TRANSACTION;

-- The supplied dump contains student_id=1 with literal placeholder values such as
-- full_name='string', gender='string', email='string', mobile='string'.
-- Remove dependent rows first where these tables exist in this schema.
DELETE FROM student_section_assignments WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM student_sections WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM student_promotions WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM student_parents WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM student_profiles WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM student_documents WHERE student_id = 1 AND EXISTS (SELECT 1 FROM students s WHERE s.student_id=1 AND LOWER(TRIM(s.full_name))='string');
DELETE FROM students WHERE student_id = 1 AND LOWER(TRIM(full_name))='string' AND LOWER(TRIM(COALESCE(email,'')))='string';

-- Do not delete DEMO_HASH users automatically: several are referenced by role/employee
-- seed relationships. They remain visible for administrator review instead of risking FK damage.

COMMIT;
