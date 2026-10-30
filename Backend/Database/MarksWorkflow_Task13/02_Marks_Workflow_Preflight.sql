-- Read-only diagnostics. Run in the same database after 01_Marks_Workflow_Update.sql.
SELECT DATABASE() AS SelectedDatabase, VERSION() AS ServerVersion;

SELECT e.exam_id,e.exam_name,e.college_id,e.academic_year_id,e.branch_id,e.semester_id,
       b.department_id,d.department_name,d.hod_user_id,
       CASE WHEN d.department_id IS NULL THEN 'Assign the branch to its actual department'
            WHEN d.hod_user_id IS NULL THEN 'Assign the correct HOD using the existing department API'
            WHEN NOT EXISTS (SELECT 1 FROM users u JOIN employee_profiles ep ON ep.user_id=u.user_id
                JOIN user_roles ur ON ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL
                JOIN roles r ON r.role_id=ur.role_id AND r.role_code='HOD' AND r.status=1 AND r.deleted_at IS NULL
                WHERE u.user_id=d.hod_user_id AND u.college_id=e.college_id AND u.status=1 AND u.deleted_at IS NULL
                  AND ep.department_id=d.department_id AND ep.status=1 AND ep.deleted_at IS NULL)
                THEN 'HOD needs an active HOD role and matching employee profile / college'
            ELSE 'HOD mapping present' END AS ReviewReadiness
FROM exams e JOIN branches b ON b.branch_id=e.branch_id
LEFT JOIN departments d ON d.department_id=b.department_id AND d.college_id=e.college_id
WHERE e.status=1 AND e.deleted_at IS NULL;

SELECT sm.mark_id,sm.exam_id,sm.entered_by,sm.workflow_status,sm.version_no,
       CASE WHEN sm.exam_id IS NULL THEN 'Legacy row: missing exam_id; create a correctly mapped entry'
            WHEN sm.entered_by IS NULL THEN 'Legacy row: missing owner; verify ownership before use'
            WHEN sm.college_id<>e.college_id THEN 'College mapping mismatch'
            ELSE 'Exam and owner IDs present' END AS EntryReadiness
FROM student_marks sm LEFT JOIN exams e ON e.exam_id=sm.exam_id;

SELECT f.faculty_id,COALESCE(ep.user_id,f.user_id) AS FacultyUserId,a.allocation_id,
       a.course_id,a.branch_id,a.semester_id,a.section_id,a.subject_id,a.academic_year_id,
       CASE WHEN a.subject_id IS NULL OR a.academic_year_id IS NULL THEN 'Complete subject/year allocation'
            ELSE 'Allocation IDs present' END AS AllocationReadiness
FROM faculty f LEFT JOIN employee_profiles ep ON ep.employee_profile_id=f.employee_profile_id
JOIN faculty_subject_allocations a ON a.faculty_id=f.faculty_id
WHERE f.status=1 AND f.deleted_at IS NULL AND a.status=1 AND a.deleted_at IS NULL;

-- Find pre-existing inconsistent rows; do not silently rewrite approval history.
SELECT sm.mark_id,sm.workflow_status,ma.approval_status,ma.submitted_by,ma.approved_by
FROM student_marks sm LEFT JOIN marks_approvals ma ON ma.mark_id=sm.mark_id
WHERE (sm.workflow_status IN ('SUBMITTED','APPROVED','REJECTED') AND
       (ma.approval_id IS NULL OR NOT (ma.approval_status<=>sm.workflow_status)))
   OR (sm.workflow_status='SUBMITTED' AND ma.submitted_by IS NULL);

SELECT routine_name FROM information_schema.routines
WHERE routine_schema=DATABASE() AND routine_type='PROCEDURE'
  AND routine_name IN ('sp_marks_assert_actor','sp_marks_assert_faculty_scope','sp_marks_assert_hod_scope',
  'sp_marks_workflow_apply','sp_marks_submit','sp_marks_approve','sp_marks_reject','sp_marks_approval_decide',
  'sp_marks_approval_pending_for_actor','sp_marks_approval_history_for_actor','sp_marks_entry_update','sp_marks_bulk_upload')
ORDER BY routine_name;
