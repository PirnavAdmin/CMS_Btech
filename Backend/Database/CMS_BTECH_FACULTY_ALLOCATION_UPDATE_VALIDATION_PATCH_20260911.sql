USE cms_btech;

-- ============================================================================
-- Faculty Subject Allocation - Update with Validation
-- Adds no table/API removals. Existing schema remains intact.
-- ============================================================================

-- Repair only clearly inconsistent existing allocation mappings so a details
-- update is not rejected because of historical seed-data mismatches.
UPDATE faculty_subject_allocations fsa
INNER JOIN semesters sem ON sem.semester_id = fsa.semester_id
SET fsa.academic_year_id = sem.academic_year_id
WHERE fsa.deleted_at IS NULL
  AND (fsa.academic_year_id IS NULL OR fsa.academic_year_id <> sem.academic_year_id);

UPDATE faculty_subject_allocations fsa
INNER JOIN sections sec ON sec.section_id = fsa.section_id
SET fsa.section_id = NULL
WHERE fsa.deleted_at IS NULL
  AND fsa.section_id IS NOT NULL
  AND (
      sec.branch_id <> fsa.branch_id
      OR sec.semester_id <> fsa.semester_id
      OR (fsa.course_id IS NOT NULL AND sec.course_id <> fsa.course_id)
      OR (fsa.academic_year_id IS NOT NULL AND sec.academic_year_id <> fsa.academic_year_id)
  );

DROP PROCEDURE IF EXISTS sp_FacultySubjectAllocation_UpdateValidated;
DELIMITER $$

CREATE PROCEDURE sp_FacultySubjectAllocation_UpdateValidated(
    IN p_allocation_id BIGINT,
    IN p_faculty_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_id BIGINT,
    IN p_subject_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_allocation_type VARCHAR(50),
    IN p_is_primary_faculty TINYINT,
    IN p_periods_per_week INT,
    IN p_status TINYINT,
    IN p_remarks VARCHAR(500),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_branch_course_id BIGINT DEFAULT NULL;
    DECLARE v_semester_course_id BIGINT DEFAULT NULL;
    DECLARE v_semester_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_section_course_id BIGINT DEFAULT NULL;
    DECLARE v_section_branch_id BIGINT DEFAULT NULL;
    DECLARE v_section_semester_id BIGINT DEFAULT NULL;
    DECLARE v_section_academic_year_id BIGINT DEFAULT NULL;

    IF p_allocation_id IS NULL OR p_allocation_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AllocationId must be greater than zero.';
    END IF;

    IF p_faculty_id IS NULL OR p_faculty_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FacultyId must be greater than zero.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId must be greater than zero.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SemesterId must be greater than zero.';
    END IF;

    IF p_course_id IS NOT NULL AND p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId must be greater than zero when provided.';
    END IF;

    IF p_section_id IS NOT NULL AND p_section_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SectionId must be greater than zero when provided.';
    END IF;

    IF p_subject_id IS NOT NULL AND p_subject_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SubjectId must be greater than zero when provided.';
    END IF;

    IF p_academic_year_id IS NOT NULL AND p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId must be greater than zero when provided.';
    END IF;

    IF p_allocation_type IS NULL OR CHAR_LENGTH(TRIM(p_allocation_type)) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AllocationType is required.';
    END IF;

    IF CHAR_LENGTH(TRIM(p_allocation_type)) > 50 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AllocationType cannot exceed 50 characters.';
    END IF;

    IF p_periods_per_week IS NULL OR p_periods_per_week < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PeriodsPerWeek cannot be negative.';
    END IF;

    IF p_remarks IS NOT NULL AND CHAR_LENGTH(p_remarks) > 500 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Remarks cannot exceed 500 characters.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM faculty_subject_allocations
    WHERE allocation_id = p_allocation_id
      AND deleted_at IS NULL;

    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Faculty subject allocation not found.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM faculty
    WHERE faculty_id = p_faculty_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Faculty not found or inactive.';
    END IF;

    IF p_course_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM courses
        WHERE course_id = p_course_id
          AND status = 1
          AND deleted_at IS NULL;

        IF v_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found or inactive.';
        END IF;
    END IF;

    SELECT COUNT(*), MAX(course_id)
      INTO v_count, v_branch_course_id
    FROM branches
    WHERE branch_id = p_branch_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch not found or inactive.';
    END IF;

    IF p_course_id IS NOT NULL AND v_branch_course_id <> p_course_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected branch does not belong to the selected course.';
    END IF;

    SELECT COUNT(*), MAX(course_id), MAX(branch_id), MAX(academic_year_id)
      INTO v_count, v_semester_course_id, v_semester_branch_id, v_semester_academic_year_id
    FROM semesters
    WHERE semester_id = p_semester_id
      AND status = 1
      AND is_archived = 0;

    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester not found, inactive, or archived.';
    END IF;

    IF v_semester_branch_id <> p_branch_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected semester does not belong to the selected branch.';
    END IF;

    IF p_course_id IS NOT NULL AND v_semester_course_id <> p_course_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected semester does not belong to the selected course.';
    END IF;

    IF p_academic_year_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND is_archived = 0
          AND deleted_at IS NULL;

        IF v_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year not found or archived.';
        END IF;

        IF v_semester_academic_year_id <> p_academic_year_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected semester does not belong to the selected academic year.';
        END IF;
    END IF;

    IF p_section_id IS NOT NULL THEN
        SELECT COUNT(*), MAX(course_id), MAX(branch_id), MAX(semester_id), MAX(academic_year_id)
          INTO v_count, v_section_course_id, v_section_branch_id, v_section_semester_id, v_section_academic_year_id
        FROM sections
        WHERE section_id = p_section_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL;

        IF v_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found, inactive, or archived.';
        END IF;

        IF v_section_branch_id <> p_branch_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected section does not belong to the selected branch.';
        END IF;

        IF v_section_semester_id <> p_semester_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected section does not belong to the selected semester.';
        END IF;

        IF p_course_id IS NOT NULL AND v_section_course_id <> p_course_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected section does not belong to the selected course.';
        END IF;

        IF p_academic_year_id IS NOT NULL AND v_section_academic_year_id <> p_academic_year_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected section does not belong to the selected academic year.';
        END IF;
    END IF;

    IF p_subject_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM subject_semester_assignments
        WHERE subject_id = p_subject_id
          AND semester_id = p_semester_id
          AND status = 1;

        IF v_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected subject is not mapped to the selected semester.';
        END IF;
    END IF;

    IF p_status = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM faculty_subject_allocations
        WHERE allocation_id <> p_allocation_id
          AND faculty_id = p_faculty_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND allocation_type = TRIM(p_allocation_type)
          AND status = 1
          AND deleted_at IS NULL
          AND (course_id <=> p_course_id)
          AND (section_id <=> p_section_id)
          AND (subject_id <=> p_subject_id)
          AND (academic_year_id <=> p_academic_year_id);

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duplicate faculty subject allocation already exists.';
        END IF;
    END IF;

    IF p_status = 1 AND p_is_primary_faculty = 1 AND p_subject_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM faculty_subject_allocations
        WHERE allocation_id <> p_allocation_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND subject_id = p_subject_id
          AND is_primary_faculty = 1
          AND status = 1
          AND deleted_at IS NULL
          AND (course_id <=> p_course_id)
          AND (section_id <=> p_section_id)
          AND (academic_year_id <=> p_academic_year_id);

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary faculty conflict: another active primary faculty is already assigned to this subject for the selected context.';
        END IF;
    END IF;

    UPDATE faculty_subject_allocations
    SET faculty_id = p_faculty_id,
        course_id = p_course_id,
        branch_id = p_branch_id,
        semester_id = p_semester_id,
        section_id = p_section_id,
        subject_id = p_subject_id,
        academic_year_id = p_academic_year_id,
        allocation_type = UPPER(TRIM(p_allocation_type)),
        is_primary_faculty = IFNULL(p_is_primary_faculty, 0),
        periods_per_week = p_periods_per_week,
        status = IFNULL(p_status, 1),
        remarks = p_remarks,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_updated_by
    WHERE allocation_id = p_allocation_id
      AND deleted_at IS NULL;

    SELECT
        fsa.allocation_id AS AllocationId,
        fsa.faculty_id AS FacultyId,
        f.faculty_code AS FacultyCode,
        f.faculty_name AS FacultyName,
        fsa.course_id AS CourseId,
        c.course_name AS CourseName,
        fsa.branch_id AS BranchId,
        b.branch_name AS BranchName,
        fsa.semester_id AS SemesterId,
        sem.semester_number AS SemesterNumber,
        sem.semester_name AS SemesterName,
        fsa.section_id AS SectionId,
        sec.section_name AS SectionName,
        fsa.subject_id AS SubjectId,
        fsa.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        fsa.allocation_type AS AllocationType,
        fsa.is_primary_faculty AS IsPrimaryFaculty,
        fsa.periods_per_week AS PeriodsPerWeek,
        fsa.status AS Status,
        fsa.remarks AS Remarks,
        fsa.updated_at AS UpdatedAt,
        fsa.updated_by AS UpdatedBy
    FROM faculty_subject_allocations fsa
    INNER JOIN faculty f ON f.faculty_id = fsa.faculty_id
    LEFT JOIN courses c ON c.course_id = fsa.course_id
    INNER JOIN branches b ON b.branch_id = fsa.branch_id
    INNER JOIN semesters sem ON sem.semester_id = fsa.semester_id
    LEFT JOIN sections sec ON sec.section_id = fsa.section_id
    LEFT JOIN academicyears ay ON ay.academic_year_id = fsa.academic_year_id
    WHERE fsa.allocation_id = p_allocation_id;
END$$

DELIMITER ;

-- Verification after applying patch.
SELECT
    fsa.allocation_id,
    fsa.faculty_id,
    fsa.course_id,
    fsa.branch_id,
    fsa.semester_id,
    fsa.section_id,
    fsa.subject_id,
    fsa.academic_year_id,
    fsa.status
FROM faculty_subject_allocations fsa
ORDER BY fsa.allocation_id;
