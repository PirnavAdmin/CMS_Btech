-- MySQL 8.x. Run against your selected cms_btech database.
-- Preserves admission 7 as requested. No other duplicate ownership is guessed.
-- Re-running is safe when the unique index is already installed.
DELIMITER $$
DROP PROCEDURE IF EXISTS cms_apply_aadhaar_uniqueness$$
CREATE PROCEDURE cms_apply_aadhaar_uniqueness()
BEGIN
    DECLARE v_has_unique INT DEFAULT 0;
    DECLARE v_duplicates INT DEFAULT 0;

    -- Do not clear the supplied identifier if its intended owner is missing.
    IF EXISTS (SELECT 1 FROM studentadmissions
               WHERE AdmissionId = 7 AND TRIM(AadhaarNumber) = '591971610392') THEN
        UPDATE studentadmissions
        SET AadhaarNumber = NULL
        WHERE TRIM(AadhaarNumber) = '591971610392' AND AdmissionId <> 7;
    END IF;

    -- Empty identifiers represent missing data. MySQL permits multiple NULLs.
    UPDATE studentadmissions SET AadhaarNumber = NULL
    WHERE AadhaarNumber IS NOT NULL AND TRIM(AadhaarNumber) = '';
    UPDATE studentadmissions SET AadhaarNumber = TRIM(AadhaarNumber)
    WHERE AadhaarNumber IS NOT NULL AND BINARY AadhaarNumber <> BINARY TRIM(AadhaarNumber);

    SELECT COUNT(*) INTO v_duplicates FROM (
        SELECT AadhaarNumber FROM studentadmissions
        WHERE AadhaarNumber IS NOT NULL
        GROUP BY AadhaarNumber HAVING COUNT(*) > 1
    ) duplicates_found;
    IF v_duplicates > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'Other duplicate Aadhaar numbers remain. Review the duplicate report in START_HERE.md, resolve ownership, then rerun.';
    END IF;

    SELECT COUNT(*) INTO v_has_unique FROM (
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'studentadmissions'
          AND NON_UNIQUE = 0
        GROUP BY INDEX_NAME
        HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = 'AadhaarNumber'
          AND MAX(SUB_PART) IS NULL
    ) existing_unique_index;
    IF v_has_unique = 0 THEN
        ALTER TABLE studentadmissions
        ADD CONSTRAINT UQ_studentadmissions_AadhaarNumber UNIQUE (AadhaarNumber);
    END IF;
END$$
CALL cms_apply_aadhaar_uniqueness()$$
DROP PROCEDURE cms_apply_aadhaar_uniqueness$$
DELIMITER ;
