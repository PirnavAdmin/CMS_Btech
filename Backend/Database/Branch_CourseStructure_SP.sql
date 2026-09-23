USE cms_btech;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_branch$$
CREATE PROCEDURE sp_create_branch(
    IN p_course_id BIGINT, IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150), IN p_short_name VARCHAR(50),
    IN p_department_id BIGINT, IN p_branch_type VARCHAR(50),
    IN p_duration INT, IN p_total_semesters INT,
    IN p_intake_capacity INT, IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500), IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO branches
    (course_id, branch_code, branch_name, short_name, department_id,
     branch_type, duration, total_semesters, intake_capacity,
     starting_academic_year_id, description, status, created_at, created_by)
    VALUES
    (p_course_id, p_branch_code, p_branch_name, p_short_name, p_department_id,
     p_branch_type, p_duration, p_total_semesters, p_intake_capacity,
     p_starting_academic_year_id, p_description, COALESCE(p_status,1),
     UTC_TIMESTAMP(), p_created_by);

    CALL sp_get_branch_by_id(LAST_INSERT_ID());
END$$

DROP PROCEDURE IF EXISTS sp_get_branches$$
CREATE PROCEDURE sp_get_branches()
BEGIN
    SELECT b.branch_id AS BranchId, b.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           b.branch_code AS BranchCode, b.branch_name AS BranchName,
           b.short_name AS ShortName, b.department_id AS DepartmentId,
           d.department_name AS DepartmentName, b.branch_type AS BranchType,
           b.duration AS Duration, b.total_semesters AS TotalSemesters,
           b.intake_capacity AS IntakeCapacity,
           b.starting_academic_year_id AS StartingAcademicYearId,
           ay.academic_year_name AS StartingAcademicYear,
           b.description AS Description, b.status AS Status,
           b.created_at AS CreatedAt, b.created_by AS CreatedBy,
           b.updated_at AS UpdatedAt, b.updated_by AS UpdatedBy
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    LEFT JOIN academicyears ay ON ay.academic_year_id = b.starting_academic_year_id
    WHERE b.status = 1 AND b.deleted_at IS NULL
    ORDER BY b.branch_id;
END$$

DROP PROCEDURE IF EXISTS sp_get_branch_by_id$$
CREATE PROCEDURE sp_get_branch_by_id(IN p_branch_id BIGINT)
BEGIN
    SELECT b.branch_id AS BranchId, b.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           b.branch_code AS BranchCode, b.branch_name AS BranchName,
           b.short_name AS ShortName, b.department_id AS DepartmentId,
           d.department_name AS DepartmentName, b.branch_type AS BranchType,
           b.duration AS Duration, b.total_semesters AS TotalSemesters,
           b.intake_capacity AS IntakeCapacity,
           b.starting_academic_year_id AS StartingAcademicYearId,
           ay.academic_year_name AS StartingAcademicYear,
           b.description AS Description, b.status AS Status,
           b.created_at AS CreatedAt, b.created_by AS CreatedBy,
           b.updated_at AS UpdatedAt, b.updated_by AS UpdatedBy
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    LEFT JOIN academicyears ay ON ay.academic_year_id = b.starting_academic_year_id
    WHERE b.branch_id = p_branch_id AND b.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS sp_update_branch$$
CREATE PROCEDURE sp_update_branch(
    IN p_branch_id BIGINT, IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50), IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50), IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50), IN p_duration INT,
    IN p_total_semesters INT, IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT, IN p_description VARCHAR(500),
    IN p_status TINYINT, IN p_updated_by BIGINT
)
BEGIN
    UPDATE branches
    SET course_id=p_course_id, branch_code=p_branch_code,
        branch_name=p_branch_name, short_name=p_short_name,
        department_id=p_department_id, branch_type=p_branch_type,
        duration=p_duration, total_semesters=p_total_semesters,
        intake_capacity=p_intake_capacity,
        starting_academic_year_id=p_starting_academic_year_id,
        description=p_description, status=p_status,
        updated_at=UTC_TIMESTAMP(), updated_by=p_updated_by
    WHERE branch_id=p_branch_id AND deleted_at IS NULL;

    CALL sp_get_branch_by_id(p_branch_id);
END$$

DROP PROCEDURE IF EXISTS sp_delete_branch$$
CREATE PROCEDURE sp_delete_branch(
    IN p_branch_id BIGINT, IN p_deleted_by BIGINT
)
BEGIN
    UPDATE branches
    SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=p_deleted_by
    WHERE branch_id=p_branch_id AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS sp_get_branches_by_course$$
CREATE PROCEDURE sp_get_branches_by_course(IN p_course_id BIGINT)
BEGIN
    SELECT b.branch_id AS BranchId, b.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           b.branch_code AS BranchCode, b.branch_name AS BranchName,
           b.short_name AS ShortName, b.department_id AS DepartmentId,
           d.department_name AS DepartmentName, b.branch_type AS BranchType,
           b.duration AS Duration, b.total_semesters AS TotalSemesters,
           b.intake_capacity AS IntakeCapacity,
           b.starting_academic_year_id AS StartingAcademicYearId,
           ay.academic_year_name AS StartingAcademicYear,
           b.description AS Description, b.status AS Status,
           b.created_at AS CreatedAt, b.created_by AS CreatedBy,
           b.updated_at AS UpdatedAt, b.updated_by AS UpdatedBy
    FROM branches b
    LEFT JOIN courses c ON c.course_id=b.course_id
    LEFT JOIN departments d ON d.department_id=b.department_id
    LEFT JOIN academicyears ay ON ay.academic_year_id=b.starting_academic_year_id
    WHERE b.course_id=p_course_id AND b.status=1 AND b.deleted_at IS NULL
    ORDER BY b.branch_id;
END$$

DROP PROCEDURE IF EXISTS sp_create_course_structure$$
CREATE PROCEDURE sp_create_course_structure(
    IN p_course_id BIGINT, IN p_branch_id BIGINT,
    IN p_year_number INT, IN p_semester_number INT,
    IN p_semester_name VARCHAR(100), IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO course_structures
    (course_id, branch_id, year_number, semester_number,
     semester_name, status, created_at, created_by)
    VALUES
    (p_course_id, p_branch_id, p_year_number, p_semester_number,
     p_semester_name, COALESCE(p_status,1), UTC_TIMESTAMP(), p_created_by);

    CALL sp_get_course_structure_by_id(LAST_INSERT_ID());
END$$

DROP PROCEDURE IF EXISTS sp_get_course_structures$$
CREATE PROCEDURE sp_get_course_structures()
BEGIN
    SELECT cs.structure_id AS StructureId, cs.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           cs.branch_id AS BranchId, b.branch_code AS BranchCode,
           b.branch_name AS BranchName, cs.year_number AS YearNumber,
           cs.semester_number AS SemesterNumber,
           cs.semester_name AS SemesterName, cs.status AS Status,
           cs.created_at AS CreatedAt, cs.created_by AS CreatedBy,
           cs.updated_at AS UpdatedAt, cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c ON c.course_id=cs.course_id
    LEFT JOIN branches b ON b.branch_id=cs.branch_id
    WHERE cs.status=1 AND cs.deleted_at IS NULL
    ORDER BY cs.course_id, cs.branch_id, cs.year_number,
             cs.semester_number, cs.structure_id;
END$$

DROP PROCEDURE IF EXISTS sp_get_course_structure_by_id$$
CREATE PROCEDURE sp_get_course_structure_by_id(IN p_structure_id BIGINT)
BEGIN
    SELECT cs.structure_id AS StructureId, cs.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           cs.branch_id AS BranchId, b.branch_code AS BranchCode,
           b.branch_name AS BranchName, cs.year_number AS YearNumber,
           cs.semester_number AS SemesterNumber,
           cs.semester_name AS SemesterName, cs.status AS Status,
           cs.created_at AS CreatedAt, cs.created_by AS CreatedBy,
           cs.updated_at AS UpdatedAt, cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c ON c.course_id=cs.course_id
    LEFT JOIN branches b ON b.branch_id=cs.branch_id
    WHERE cs.structure_id=p_structure_id AND cs.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS sp_update_course_structure$$
CREATE PROCEDURE sp_update_course_structure(
    IN p_structure_id BIGINT, IN p_course_id BIGINT,
    IN p_branch_id BIGINT, IN p_year_number INT,
    IN p_semester_number INT, IN p_semester_name VARCHAR(100),
    IN p_status TINYINT, IN p_updated_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET course_id=p_course_id, branch_id=p_branch_id,
        year_number=p_year_number, semester_number=p_semester_number,
        semester_name=p_semester_name, status=p_status,
        updated_at=UTC_TIMESTAMP(), updated_by=p_updated_by
    WHERE structure_id=p_structure_id AND deleted_at IS NULL;

    CALL sp_get_course_structure_by_id(p_structure_id);
END$$

DROP PROCEDURE IF EXISTS sp_delete_course_structure$$
CREATE PROCEDURE sp_delete_course_structure(
    IN p_structure_id BIGINT, IN p_deleted_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=p_deleted_by
    WHERE structure_id=p_structure_id AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS sp_get_course_branch_structure$$
CREATE PROCEDURE sp_get_course_branch_structure(
    IN p_course_id BIGINT, IN p_branch_id BIGINT
)
BEGIN
    SELECT cs.structure_id AS StructureId, cs.course_id AS CourseId,
           c.course_code AS CourseCode, c.course_name AS CourseName,
           cs.branch_id AS BranchId, b.branch_code AS BranchCode,
           b.branch_name AS BranchName, cs.year_number AS YearNumber,
           cs.semester_number AS SemesterNumber,
           cs.semester_name AS SemesterName, cs.status AS Status,
           cs.created_at AS CreatedAt, cs.created_by AS CreatedBy,
           cs.updated_at AS UpdatedAt, cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c ON c.course_id=cs.course_id
    LEFT JOIN branches b ON b.branch_id=cs.branch_id
    WHERE cs.course_id=p_course_id AND cs.branch_id=p_branch_id
      AND cs.status=1 AND cs.deleted_at IS NULL
    ORDER BY cs.year_number, cs.semester_number, cs.structure_id;
END$$

DELIMITER ;

USE cms_btech;

SHOW PROCEDURE STATUS
WHERE Db='cms_btech'
AND Name IN (
    'sp_create_branch',
    'sp_get_branches',
    'sp_get_branch_by_id',
    'sp_update_branch',
    'sp_delete_branch',
    'sp_get_branches_by_course',
    'sp_create_course_structure',
    'sp_get_course_structures',
    'sp_get_course_structure_by_id',
    'sp_update_course_structure',
    'sp_delete_course_structure',
    'sp_get_course_branch_structure'
);
