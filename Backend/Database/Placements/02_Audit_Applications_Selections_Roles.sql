-- Read-only checks for the supplied MySQL schema. No UPDATE/DELETE/INSERT.
-- Result set 1: real drive IDs, tenant and registration state.
SELECT drive_id, college_id, drive_name, drive_status, application_open_at, application_close_at
FROM placement_drives WHERE deleted_at IS NULL ORDER BY drive_id;

-- Result set 2: duplicate pairs (should be empty; unique key also enforces this).
SELECT drive_id, student_id, COUNT(*) AS application_count
FROM placement_applications GROUP BY drive_id, student_id HAVING COUNT(*) > 1;

-- Result set 3: applications owned by a different student college (should be empty).
SELECT a.application_id, a.student_id, d.college_id AS drive_college, s.college_id AS student_college
FROM placement_applications a JOIN placement_drives d ON d.drive_id=a.drive_id
JOIN students s ON s.student_id=a.student_id
WHERE a.deleted_at IS NULL AND d.college_id<>s.college_id;

-- Result set 4: decision/application state inconsistencies (should be empty).
SELECT s.selection_id, a.application_id, a.application_status, s.selection_status, s.offer_status
FROM placement_selections s JOIN placement_applications a ON a.application_id=s.application_id
WHERE s.deleted_at IS NULL AND a.deleted_at IS NULL AND s.selection_status<>a.application_status;

-- Result set 5: selected without all interviews completed/passed (should be empty).
SELECT s.selection_id, s.application_id FROM placement_selections s
WHERE s.deleted_at IS NULL AND s.selection_status='SELECTED' AND (
 NOT EXISTS (SELECT 1 FROM placement_interviews i WHERE i.application_id=s.application_id AND i.deleted_at IS NULL)
 OR EXISTS (SELECT 1 FROM placement_interviews i WHERE i.application_id=s.application_id AND i.deleted_at IS NULL AND (i.interview_status<>'COMPLETED' OR i.interview_result<>'PASSED')));

-- Result set 6: impossible offer/join states (should be empty).
SELECT selection_id, selection_status, offer_status, joined_at FROM placement_selections
WHERE deleted_at IS NULL AND ((offer_status<>'NOT_ISSUED' AND selection_status<>'SELECTED')
 OR (joined_at IS NOT NULL AND (selection_status<>'SELECTED' OR offer_status<>'ACCEPTED')));

-- Result set 7: active assignments (IDs and roles only; no credentials).
SELECT u.user_id, u.college_id, r.role_code FROM users u
JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id
WHERE u.status=1 AND u.deleted_at IS NULL AND ur.status=1 AND ur.removed_at IS NULL
AND r.status=1 AND r.deleted_at IS NULL ORDER BY u.user_id, r.role_code;
