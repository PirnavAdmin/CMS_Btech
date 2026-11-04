-- MySQL 8: select the API database first. The supplied latest dump already has this key.
-- No semester data is inserted/deleted/archived by this patch; automatic frontend POSTs save records.
-- Run with stop-on-error enabled. Existing duplicate groups are reported for review, never merged.
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_CMS_Semester_R13_Prerequisites$$
CREATE PROCEDURE sp_CMS_Semester_R13_Prerequisites()
BEGIN
    IF EXISTS(SELECT 1 FROM semesters WHERE is_archived=0 GROUP BY branch_id,academic_year_id,semester_number HAVING COUNT(*)>1) THEN
        SELECT branch_id,academic_year_id,semester_number,GROUP_CONCAT(semester_id) AS semester_ids
        FROM semesters WHERE is_archived=0 GROUP BY branch_id,academic_year_id,semester_number HAVING COUNT(*)>1;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duplicate active semesters exist. No data was modified.';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='semesters' AND column_name='active_semester_slot') THEN
        ALTER TABLE semesters ADD COLUMN active_semester_slot TINYINT GENERATED ALWAYS AS (CASE WHEN is_archived=0 THEN 1 ELSE NULL END) STORED;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='semesters' AND index_name='uq_semester_active_slot') THEN
        ALTER TABLE semesters ADD UNIQUE KEY uq_semester_active_slot(branch_id,academic_year_id,semester_number,active_semester_slot);
    END IF;
END$$
CALL sp_CMS_Semester_R13_Prerequisites()$$
DROP PROCEDURE sp_CMS_Semester_R13_Prerequisites$$
DELIMITER ;
SELECT 'Semester R13 prerequisites verified' AS result;
