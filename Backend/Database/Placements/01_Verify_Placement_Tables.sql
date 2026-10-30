-- Read-only verification. No schema migration is required for Dump2026oct9th1.sql.
-- Import your supplied dump first if this is a new database.
USE cms_btech;
SELECT 'placement_drives' AS table_name,COUNT(*) AS row_count FROM placement_drives
UNION ALL SELECT 'placement_eligibility_rules',COUNT(*) FROM placement_eligibility_rules
UNION ALL SELECT 'placement_eligibility',COUNT(*) FROM placement_eligibility
UNION ALL SELECT 'placement_applications',COUNT(*) FROM placement_applications
UNION ALL SELECT 'placement_interviews',COUNT(*) FROM placement_interviews
UNION ALL SELECT 'placement_selections',COUNT(*) FROM placement_selections;
SELECT company_id,college_id,company_code,company_name,status FROM companies;
SELECT student_id,college_id,student_code,full_name,course_id,branch_id FROM students WHERE status=1 AND deleted_at IS NULL;
SELECT drive_id,college_id,drive_code,drive_name,drive_status FROM placement_drives;
SELECT application_id,drive_id,student_id,application_status FROM placement_applications;
SELECT interview_id,application_id,round_number,interview_status,interview_result FROM placement_interviews;
SELECT selection_id,application_id,selection_status,offer_status FROM placement_selections;
