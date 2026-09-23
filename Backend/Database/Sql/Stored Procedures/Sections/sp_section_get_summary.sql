DROP PROCEDURE IF EXISTS sp_section_get_summary;

DELIMITER $$

CREATE PROCEDURE sp_section_get_summary()
BEGIN

    SELECT
        COUNT(*) AS TotalSections,

        COALESCE(
            SUM(
                CASE
                    WHEN s.status = 1 THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS ActiveSections,

        COALESCE(
            SUM(s.capacity),
            0
        ) AS TotalCapacity,

        COALESCE(
            SUM(
                CASE
                    WHEN s.class_teacher_employee_profile_id IS NULL
                         OR s.class_teacher_employee_profile_id = 0
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS UnassignedAdvisors

    FROM sections s

    WHERE s.is_archived = 0;

END$$

DELIMITER ;