DELIMITER $$
CREATE PROCEDURE `sp_marks_get`(
    IN p_mark_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sm.mark_id, sm.college_id, sm.exam_id, e.exam_code, e.exam_name,
        sm.student_id, st.student_code, st.full_name AS student_name,
        sm.subject_id, sub.subject_code, sub.subject_name,
        sm.section_id, sec.section_name,
        sm.max_marks, sm.marks_obtained,
        ROUND((sm.marks_obtained / NULLIF(sm.max_marks,0))*100,2) AS percentage,
        sm.grade, sm.remarks, sm.workflow_status, sm.version_no,
        sm.entered_by, sm.entered_at, sm.updated_by, sm.updated_at
    FROM student_marks sm
    JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.mark_id=p_mark_id
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);
END$$
DELIMITER ;
