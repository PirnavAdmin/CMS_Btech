DROP PROCEDURE IF EXISTS sp_faculty_get_workload;

DELIMITER $$

CREATE PROCEDURE sp_faculty_get_workload
(
    IN p_faculty_id BIGINT
)
BEGIN

    /* =============================================
       VALIDATE FACULTY
       ============================================= */

    IF NOT EXISTS
    (
        SELECT 1
        FROM faculty f
        WHERE f.faculty_id = p_faculty_id
          AND f.deleted_at IS NULL
    )
    THEN

        SELECT
            NULL AS FacultyId,
            NULL AS FacultyCode,
            NULL AS FacultyName,
            0 AS TotalSubjects,
            0 AS TotalSections,
            0 AS TotalPeriodsPerWeek,
            0.00 AS TotalHoursPerWeek,
            0 AS ActiveAllocations;

    ELSE

        /* =============================================
           CALCULATE FROM ACTIVE ALLOCATIONS ONLY
           ============================================= */

        SELECT

            f.faculty_id AS FacultyId,

            f.faculty_code AS FacultyCode,

            f.faculty_name AS FacultyName,


            /* =========================================
               SUBJECTS

               subject_id is currently nullable because
               Subject Master is a future module.

               Count distinct real subjects when available.
               ========================================= */

            COUNT(
                DISTINCT CASE
                    WHEN fsa.subject_id IS NOT NULL
                    THEN fsa.subject_id
                END
            ) AS TotalSubjects,


            /* =========================================
               SECTIONS
               ========================================= */

            COUNT(
                DISTINCT CASE
                    WHEN fsa.section_id IS NOT NULL
                    THEN fsa.section_id
                END
            ) AS TotalSections,


            /* =========================================
               TOTAL PERIODS

               SUM ONLY ACTIVE ALLOCATIONS
               ========================================= */

            COALESCE(
                SUM(
                    CASE
                        WHEN fsa.status = 1
                         AND fsa.deleted_at IS NULL
                        THEN fsa.periods_per_week
                        ELSE 0
                    END
                ),
                0
            ) AS TotalPeriodsPerWeek,


            /* =========================================
               TOTAL HOURS

               Current rule:
               1 Period = 1 Hour
               ========================================= */

            CAST(
                COALESCE(
                    SUM(
                        CASE
                            WHEN fsa.status = 1
                             AND fsa.deleted_at IS NULL
                            THEN fsa.periods_per_week
                            ELSE 0
                        END
                    ),
                    0
                )
                AS DECIMAL(5,2)
            ) AS TotalHoursPerWeek,


            /* =========================================
               ACTIVE ALLOCATIONS
               ========================================= */

            COUNT(
                CASE
                    WHEN fsa.status = 1
                     AND fsa.deleted_at IS NULL
                    THEN 1
                END
            ) AS ActiveAllocations


        FROM faculty f

        LEFT JOIN faculty_subject_allocations fsa
            ON fsa.faculty_id = f.faculty_id
            AND fsa.status = 1
            AND fsa.deleted_at IS NULL

        WHERE f.faculty_id = p_faculty_id
          AND f.deleted_at IS NULL

        GROUP BY

            f.faculty_id,
            f.faculty_code,
            f.faculty_name;

    END IF;

END $$

DELIMITER ;