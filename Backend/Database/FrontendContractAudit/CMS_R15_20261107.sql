-- CMS R15 frontend/backend verification fixes, 2026-11-07. MySQL 8.0.
-- Select the EXISTING target schema explicitly before running this file.
-- Back up schema/routines/data, stop the API, run without --force, then restart.
-- No EF migrations, table drops, deletes, truncation, charset conversion or invented ownership.
-- Replaces named routine/view definitions from the supplied dump, with explicit collation on text arguments.
-- Existing rows/IDs stay in place. Ambiguous legacy JSON/policy ownership stays NULL and hidden from college users.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_r15_contract_schema$$
CREATE PROCEDURE sp_r15_contract_schema()
BEGIN
 IF DATABASE() IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Select the existing CMS database before running this patch.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='users') THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Import the provided CMS dump first; this patch is not a new database installer.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cms_supplemental_api_records' AND column_name='college_id') THEN
   ALTER TABLE `cms_supplemental_api_records` ADD COLUMN `college_id` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cms_supplemental_api_records' AND column_name='created_by') THEN
   ALTER TABLE `cms_supplemental_api_records` ADD COLUMN `created_by` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cms_supplemental_api_records' AND column_name='updated_by') THEN
   ALTER TABLE `cms_supplemental_api_records` ADD COLUMN `updated_by` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cms_supplemental_api_records' AND column_name='deleted_at') THEN
   ALTER TABLE `cms_supplemental_api_records` ADD COLUMN `deleted_at` DATETIME NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='college_id') THEN
   ALTER TABLE `faculty_leave_policies` ADD COLUMN `college_id` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='department_id') THEN
   ALTER TABLE `faculty_leave_policies` ADD COLUMN `department_id` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='branch_id') THEN
   ALTER TABLE `faculty_leave_policies` ADD COLUMN `branch_id` BIGINT NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cms_supplemental_api_records' AND index_name='ix_r15_supp_scope') THEN
   CREATE INDEX ix_r15_supp_scope ON cms_supplemental_api_records(college_id,resource,deleted_at);
 END IF;
END$$
CALL sp_r15_contract_schema()$$
DROP PROCEDURE sp_r15_contract_schema$$
DELIMITER ;
CREATE TABLE IF NOT EXISTS backend_contract_audit(
 audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 college_id BIGINT NULL, resource VARCHAR(80) NOT NULL, record_id BIGINT NOT NULL,
 action VARCHAR(30) NOT NULL, actor_id BIGINT NOT NULL, correlation_id VARCHAR(128) NULL,
 occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ix_contract_audit_entity(college_id,resource,record_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Assign only explicit numeric JSON ownership naming an existing college.
UPDATE cms_supplemental_api_records r JOIN colleges c
 ON JSON_UNQUOTE(JSON_EXTRACT(r.payload,'$.collegeId')) REGEXP '^[1-9][0-9]*$'
 AND c.college_id=CAST(JSON_UNQUOTE(JSON_EXTRACT(r.payload,'$.collegeId')) AS UNSIGNED)
SET r.college_id=c.college_id WHERE r.college_id IS NULL;
CREATE TABLE IF NOT EXISTS faculty_leave_policy_scope_audit(
 policy_id VARCHAR(100) NOT NULL PRIMARY KEY, inferred_college_id BIGINT NOT NULL,
 evidence_source VARCHAR(50) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Related requests/entitlements and creator must agree; unresolved policies stay unassigned.
INSERT IGNORE INTO faculty_leave_policy_scope_audit(policy_id,inferred_college_id,evidence_source)
SELECT p.policy_id,MIN(e.college_id),'unanimous_existing_evidence'
FROM faculty_leave_policies p JOIN (
 SELECT r.policy_id,f.college_id FROM faculty_leave_requests r JOIN faculty f ON f.faculty_id=r.faculty_id
 UNION ALL SELECT e.policy_id,t.college_id FROM faculty_leave_policy_entitlements e JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id WHERE t.college_id IS NOT NULL
 UNION ALL SELECT p.policy_id,u.college_id FROM faculty_leave_policies p JOIN users u ON u.user_id=p.created_by WHERE u.college_id IS NOT NULL
) e ON e.policy_id COLLATE utf8mb4_unicode_ci=p.policy_id JOIN colleges c ON c.college_id=e.college_id
WHERE p.college_id IS NULL GROUP BY p.policy_id HAVING COUNT(DISTINCT e.college_id)=1;
UPDATE faculty_leave_policies p JOIN faculty_leave_policy_scope_audit a ON a.policy_id COLLATE utf8mb4_unicode_ci=p.policy_id
SET p.college_id=a.inferred_college_id WHERE p.college_id IS NULL;
DELIMITER $$
DROP FUNCTION IF EXISTS fn_flp_academic_year_key$$
CREATE FUNCTION fn_flp_academic_year_key(p_year VARCHAR(50)) RETURNS VARCHAR(9)
DETERMINISTIC NO SQL
BEGIN
 DECLARE v VARCHAR(50);
 DECLARE v_start INT;
 DECLARE v_end INT;
 SET v=REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p_year),'–','-'),'—','-'),'/','-'),'[[:space:]]','');
 IF v IS NULL OR NOT REGEXP_LIKE(v,'^[0-9]{4}-([0-9]{2}|[0-9]{4})$') THEN RETURN NULL; END IF;
 SET v_start=CAST(SUBSTRING_INDEX(v,'-',1) AS UNSIGNED);
 SET v_end=CAST(SUBSTRING_INDEX(v,'-',-1) AS UNSIGNED);
 IF CHAR_LENGTH(SUBSTRING_INDEX(v,'-',-1))=2 THEN
   SET v_end=FLOOR(v_start/100)*100+v_end;
   IF v_end<v_start THEN SET v_end=v_end+100; END IF;
 END IF;
 IF v_start<1000 OR v_end<=v_start OR v_end>9999 THEN RETURN NULL; END IF;
 RETURN CONCAT(v_start,'-',v_end);
END$$
DROP FUNCTION IF EXISTS fn_flp_employee_type$$
CREATE FUNCTION fn_flp_employee_type(p_type VARCHAR(50)) RETURNS VARCHAR(30)
DETERMINISTIC NO SQL
BEGIN
 DECLARE v VARCHAR(50);
 SET v=LOWER(REGEXP_REPLACE(TRIM(p_type),'[[:space:]_-]',''));
 RETURN CASE
 WHEN v IN ('both','all') THEN 'Both'
 WHEN v IN ('teaching','teachingfaculty','teachingstaff') THEN 'Teaching'
 WHEN v IN ('nonteaching','nonteachingfaculty','nonteachingstaff') THEN 'Non-Teaching'
 ELSE NULL END;
END$$

DROP PROCEDURE IF EXISTS sp_faculty_leave_policy_find_conflicts$$
CREATE PROCEDURE sp_faculty_leave_policy_find_conflicts(
 IN p_policy_id VARCHAR(100), IN p_college_id BIGINT, IN p_academic_year VARCHAR(50),
 IN p_applicable_to VARCHAR(50), IN p_department_id BIGINT, IN p_branch_id BIGINT,
 IN p_from_date DATE, IN p_to_date DATE)
BEGIN
 DECLARE v_year VARCHAR(9);
 DECLARE v_type VARCHAR(30);
 DECLARE v_department BIGINT;
 SET v_year=fn_flp_academic_year_key(p_academic_year);
 SET v_type=fn_flp_employee_type(p_applicable_to);
 SET v_department=COALESCE(p_department_id,(SELECT department_id FROM branches WHERE branch_id=p_branch_id));
 IF p_college_id IS NULL OR p_college_id<=0 OR v_year IS NULL OR v_type IS NULL
    OR p_from_date IS NULL OR p_to_date IS NULL OR p_from_date>p_to_date THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Valid policy college, academic year, employee type and effective dates are required.';
 END IF;
 SELECT p.policy_id AS Id,p.name AS Name,p.college_id AS CollegeId,
   p.academic_year AS AcademicYear,fn_flp_academic_year_key(p.academic_year) AS AcademicYearKey,
   fn_flp_employee_type(p.applicable_to) AS ApplicableTo,
   p.department_id AS DepartmentId,COALESCE(p.department_id,b.department_id) AS EffectiveDepartmentId,
   d.department_name AS DepartmentName,p.branch_id AS BranchId,b.branch_name AS BranchName,
   p.from_date AS FromDate,p.to_date AS ToDate,p.status AS Status
 FROM faculty_leave_policies p
 LEFT JOIN branches b ON b.branch_id=p.branch_id
 LEFT JOIN departments d ON d.department_id=COALESCE(p.department_id,b.department_id)
 WHERE p.college_id=p_college_id AND p.status='Active'
   AND (p_policy_id IS NULL OR p.policy_id<>p_policy_id COLLATE utf8mb4_unicode_ci)
   AND fn_flp_academic_year_key(p.academic_year)=v_year
   AND (fn_flp_employee_type(p.applicable_to)='Both' OR v_type='Both' OR fn_flp_employee_type(p.applicable_to)=v_type)
   AND p.from_date<=p_to_date AND p.to_date>=p_from_date
   AND (p.branch_id IS NULL OR p_branch_id IS NULL OR p.branch_id=p_branch_id)
   AND (COALESCE(p.department_id,b.department_id) IS NULL OR v_department IS NULL
        OR COALESCE(p.department_id,b.department_id)=v_department)
 ORDER BY p.from_date,p.name,p.policy_id;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_activity_list`$$
CREATE PROCEDURE `sp_cms_activity_list`(IN p_screen VARCHAR(100),IN p_correlation VARCHAR(100),IN p_limit INT)
BEGIN
SELECT log_id AS logId,correlation_id AS correlationId,user_id AS userId,screen,action_name AS actionName,http_method AS method,route,status_code AS statusCode,duration_ms AS durationMs,occurred_at AS occurredAt FROM api_activity_logs WHERE ((p_screen COLLATE utf8mb4_unicode_ci) IS NULL OR screen=(p_screen COLLATE utf8mb4_unicode_ci)) AND ((p_correlation COLLATE utf8mb4_unicode_ci) IS NULL OR correlation_id=(p_correlation COLLATE utf8mb4_unicode_ci)) ORDER BY log_id DESC LIMIT p_limit;
END$$
DROP PROCEDURE IF EXISTS `sp_cms_status_history`$$
CREATE PROCEDURE `sp_cms_status_history`(IN p_entity VARCHAR(40),IN p_id BIGINT)
BEGIN
SELECT audit_id AS auditId,entity_type AS entityType,entity_id AS entityId,old_status AS oldStatus,new_status AS newStatus,changed_by AS changedBy,changed_at AS changedAt FROM entity_status_audit WHERE entity_type=(p_entity COLLATE utf8mb4_unicode_ci) AND entity_id=p_id ORDER BY audit_id DESC;
END$$
DROP PROCEDURE IF EXISTS `sp_course_get_all`$$
CREATE PROCEDURE `sp_course_get_all`(
    IN p_search VARCHAR(200),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_college_id IS NULL OR c.college_id = p_college_id)
      AND (p_department_id IS NULL OR c.department_id = p_department_id)
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
         OR c.course_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR c.course_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR c.course_short_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR d.department_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY c.course_name, c.course_id;
END$$
DROP PROCEDURE IF EXISTS `sp_document_entity_access_list`$$
CREATE PROCEDURE `sp_document_entity_access_list`(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT)
    SQL SECURITY INVOKER
BEGIN
    CALL sp_document_require_entity(p_actor_id,p_college_id,(p_entity_type COLLATE utf8mb4_unicode_ci),p_entity_id,'MANAGE');
    SELECT access_id AS AccessId,user_id AS UserId,entity_type AS EntityType,entity_id AS EntityId,
    can_download AS CanDownload,can_upload AS CanUpload,can_approve AS CanApprove,expires_at AS ExpiresAt,
    status AS Status,granted_by AS GrantedBy,granted_at AS GrantedAt,updated_by AS UpdatedBy,updated_at AS UpdatedAt FROM document_entity_access WHERE entity_type=(p_entity_type COLLATE utf8mb4_unicode_ci) AND entity_id=p_entity_id ORDER BY access_id;
END$$
DROP PROCEDURE IF EXISTS `sp_elective_allocation_list`$$
CREATE PROCEDURE `sp_elective_allocation_list`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_elective_group_id BIGINT,
    IN p_allocation_status VARCHAR(20),
    IN p_search VARCHAR(150)
)
BEGIN

    SELECT
        ea.allocation_id AS AllocationId,
        ea.selection_id AS SelectionId,

        ea.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,

        ea.elective_group_id AS ElectiveGroupId,
        eg.group_code AS GroupCode,
        eg.group_name AS GroupName,

        ea.subject_id AS SubjectId,
        sub.subject_code AS SubjectCode,
        sub.subject_name AS SubjectName,

        ea.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        ea.semester_id AS SemesterId,
        sem.semester_name AS SemesterName,

        ea.allocation_status AS AllocationStatus,
        ea.allocated_at AS AllocatedAt,
        ea.allocated_by AS AllocatedBy,
        ea.remarks AS Remarks

    FROM elective_allocations ea

    INNER JOIN students s
        ON s.student_id = ea.student_id
       AND s.college_id = p_college_id
       AND s.deleted_at IS NULL

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = ea.elective_group_id
       AND eg.college_id = p_college_id
       AND eg.deleted_at IS NULL

    INNER JOIN subjects sub
        ON sub.subject_id = ea.subject_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = ea.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN semesters sem
        ON sem.semester_id = ea.semester_id

    WHERE
        (
            p_academic_year_id IS NULL
            OR ea.academic_year_id = p_academic_year_id
        )

        AND
        (
            p_course_id IS NULL
            OR eg.course_id = p_course_id
        )

        AND
        (
            p_branch_id IS NULL
            OR eg.branch_id = p_branch_id
        )

        AND
        (
            p_semester_id IS NULL
            OR ea.semester_id = p_semester_id
        )

        AND
        (
            p_elective_group_id IS NULL
            OR ea.elective_group_id = p_elective_group_id
        )

        AND
        (
            (p_allocation_status COLLATE utf8mb4_unicode_ci) IS NULL
            OR ea.allocation_status = (p_allocation_status COLLATE utf8mb4_unicode_ci)
        )

        AND
        (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR (p_search COLLATE utf8mb4_unicode_ci) = ''
            OR s.student_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR s.full_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.group_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.group_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR sub.subject_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR sub.subject_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
        )

    ORDER BY
        ea.allocated_at DESC,
        ea.allocation_id DESC;

END$$
DROP PROCEDURE IF EXISTS `sp_elective_approval_list`$$
CREATE PROCEDURE `sp_elective_approval_list`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_elective_group_id BIGINT,
    IN p_approval_status VARCHAR(20),
    IN p_search VARCHAR(150)
)
BEGIN

    SELECT
        ea.approval_id AS ApprovalId,
        ea.selection_id AS SelectionId,

        ea.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,

        ea.elective_group_id AS ElectiveGroupId,
        eg.group_code AS GroupCode,
        eg.group_name AS GroupName,

        ea.subject_id AS SubjectId,
        sub.subject_code AS SubjectCode,
        sub.subject_name AS SubjectName,

        ea.faculty_id AS FacultyId,
        CAST(NULL AS CHAR) AS FacultyName,

        ea.approval_status AS ApprovalStatus,
        ea.remarks AS Remarks,
        ea.approved_at AS ApprovedAt

    FROM elective_approvals ea

    INNER JOIN students s
        ON s.student_id = ea.student_id
       AND s.college_id = p_college_id
       AND s.deleted_at IS NULL

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = ea.elective_group_id
       AND eg.college_id = p_college_id
       AND eg.deleted_at IS NULL

    INNER JOIN subjects sub
        ON sub.subject_id = ea.subject_id

    INNER JOIN student_elective_selections ses
        ON ses.selection_id = ea.selection_id

    WHERE
        (
            p_academic_year_id IS NULL
            OR ses.academic_year_id = p_academic_year_id
        )
        AND
        (
            p_course_id IS NULL
            OR eg.course_id = p_course_id
        )
        AND
        (
            p_branch_id IS NULL
            OR eg.branch_id = p_branch_id
        )
        AND
        (
            p_semester_id IS NULL
            OR eg.semester_id = p_semester_id
        )
        AND
        (
            p_elective_group_id IS NULL
            OR ea.elective_group_id = p_elective_group_id
        )
        AND
        (
            (p_approval_status COLLATE utf8mb4_unicode_ci) IS NULL
            OR ea.approval_status = (p_approval_status COLLATE utf8mb4_unicode_ci)
        )
        AND
        (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR (p_search COLLATE utf8mb4_unicode_ci) = ''
            OR s.student_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR s.full_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.group_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.group_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR sub.subject_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR sub.subject_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
        )

    ORDER BY
        ea.approved_at DESC,
        ea.selection_id DESC;

END$$
DROP PROCEDURE IF EXISTS `sp_elective_group_list`$$
CREATE PROCEDURE `sp_elective_group_list`(
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_search VARCHAR(150)
)
BEGIN

    SELECT
        eg.elective_group_id AS ElectiveGroupId,
        eg.college_id AS CollegeId,
        eg.group_code AS GroupCode,
        eg.group_name AS GroupName,
        eg.description AS Description,

        eg.course_id AS CourseId,
        c.course_name AS CourseName,

        eg.branch_id AS BranchId,
        b.branch_name AS BranchName,

        eg.semester_id AS SemesterId,
        s.semester_name AS SemesterName,

        eg.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        eg.min_selections AS MinSelections,
        eg.max_selections AS MaxSelections,

        (
            SELECT COUNT(*)
            FROM elective_group_subjects egs
            WHERE egs.elective_group_id = eg.elective_group_id
              AND egs.status = 1
        ) AS SubjectCount,

        eg.status AS Status,
        eg.created_at AS CreatedAt,
        eg.updated_at AS UpdatedAt

    FROM elective_groups eg

    LEFT JOIN courses c
        ON c.course_id = eg.course_id

    LEFT JOIN branches b
        ON b.branch_id = eg.branch_id

    LEFT JOIN semesters s
        ON s.semester_id = eg.semester_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = eg.academic_year_id

    WHERE eg.college_id = p_college_id

      AND (
            p_course_id IS NULL
            OR eg.course_id = p_course_id
          )

      AND (
            p_branch_id IS NULL
            OR eg.branch_id = p_branch_id
          )

      AND (
            p_semester_id IS NULL
            OR eg.semester_id = p_semester_id
          )

      AND (
            p_academic_year_id IS NULL
            OR eg.academic_year_id = p_academic_year_id
          )

      AND (
            p_status IS NULL
            OR eg.status = p_status
          )

      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR (p_search COLLATE utf8mb4_unicode_ci) = ''
            OR eg.group_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.group_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
            OR eg.description LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
          )

      AND eg.deleted_at IS NULL

    ORDER BY
        eg.group_name ASC,
        eg.elective_group_id DESC;

END$$
DROP PROCEDURE IF EXISTS `sp_faculty_list`$$
CREATE PROCEDURE `sp_faculty_list`(
    IN p_page_number INT,
    IN p_page_size INT,
    IN p_search VARCHAR(150),
    IN p_college_id BIGINT,
    IN p_department_id BIGINT,
    IN p_status TINYINT
)
BEGIN

    DECLARE v_offset INT DEFAULT 0;

    DECLARE v_search VARCHAR(150)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

    /* -----------------------------
       DEFAULT PAGE
       ----------------------------- */

    IF p_page_number IS NULL OR p_page_number < 1 THEN
        SET p_page_number = 1;
    END IF;

    /* -----------------------------
       DEFAULT PAGE SIZE
       ----------------------------- */

    IF p_page_size IS NULL OR p_page_size < 1 THEN
        SET p_page_size = 20;
    END IF;

    /* Maximum 100 records */

    IF p_page_size > 100 THEN
        SET p_page_size = 100;
    END IF;

    SET v_offset =
        (p_page_number - 1) * p_page_size;

    /* -----------------------------
       NORMALIZE SEARCH VALUE
       ----------------------------- */

    SET v_search =
        CONVERT(TRIM(COALESCE((p_search COLLATE utf8mb4_unicode_ci), '')) USING utf8mb4);


    /* =====================================================
       FACULTY LIST
       ===================================================== */

    SELECT

        f.faculty_id AS FacultyId,
        f.user_id AS UserId,
        f.employee_profile_id AS EmployeeProfileId,
        f.college_id AS CollegeId,
        f.department_id AS DepartmentId,
        f.faculty_code AS FacultyCode,
        f.faculty_name AS FacultyName,
        f.designation AS Designation,
        f.qualification AS Qualification,
        f.specialization AS Specialization,
        f.experience_years AS ExperienceYears,
        f.employment_type AS EmploymentType,
        f.date_of_joining AS DateOfJoining,
        f.official_email AS OfficialEmail,
        f.mobile AS Mobile,
        f.is_hod AS IsHod,
        f.status AS Status,

        u.employee_user_id AS EmployeeUserId,
        u.full_name AS UserFullName,
        u.email AS UserEmail,
        u.mobile AS UserMobile,

        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName

    FROM faculty f

    LEFT JOIN users u
        ON u.user_id = f.user_id

    LEFT JOIN departments d
        ON d.department_id = f.department_id

    WHERE f.deleted_at IS NULL

    /* =====================================================
       SEARCH
       ===================================================== */

    AND
    (
        v_search = ''

        /* Faculty IDs */

        OR CAST(f.faculty_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.user_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.employee_profile_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.college_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.department_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* Faculty */

        OR f.faculty_code COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.faculty_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.designation COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.qualification COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* User */

        OR u.employee_user_id COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.full_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.email COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.mobile COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* Department */

        OR d.department_code COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR d.department_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')
    )


    /* =====================================================
       COLLEGE FILTER
       ===================================================== */

    AND
    (
        p_college_id IS NULL
        OR f.college_id = p_college_id
    )


    /* =====================================================
       DEPARTMENT FILTER
       ===================================================== */

    AND
    (
        p_department_id IS NULL
        OR f.department_id = p_department_id
    )


    /* =====================================================
       STATUS FILTER
       ===================================================== */

    AND
    (
        p_status IS NULL
        OR f.status = p_status
    )

    ORDER BY f.faculty_id DESC

    LIMIT p_page_size
    OFFSET v_offset;


    /* =====================================================
       TOTAL RECORDS
       ===================================================== */

    SELECT COUNT(*) AS TotalRecords

    FROM faculty f

    LEFT JOIN users u
        ON u.user_id = f.user_id

    LEFT JOIN departments d
        ON d.department_id = f.department_id

    WHERE f.deleted_at IS NULL

    AND
    (
        v_search = ''

        /* IDs */

        OR CAST(f.faculty_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.user_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.employee_profile_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.college_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR CAST(f.department_id AS CHAR)
            COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* Faculty */

        OR f.faculty_code COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.faculty_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.designation COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR f.qualification COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* User */

        OR u.employee_user_id COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.full_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.email COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR u.mobile COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        /* Department */

        OR d.department_code COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')

        OR d.department_name COLLATE utf8mb4_unicode_ci
            LIKE CONCAT('%', v_search, '%')
    )


    /* =====================================================
       COLLEGE FILTER
       ===================================================== */

    AND
    (
        p_college_id IS NULL
        OR f.college_id = p_college_id
    )


    /* =====================================================
       DEPARTMENT FILTER
       ===================================================== */

    AND
    (
        p_department_id IS NULL
        OR f.department_id = p_department_id
    )


    /* =====================================================
       STATUS FILTER
       ===================================================== */

    AND
    (
        p_status IS NULL
        OR f.status = p_status
    );

END$$
DROP PROCEDURE IF EXISTS `sp_fc_fines`$$
CREATE PROCEDURE `sp_fc_fines`(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,
 IN p_student_fee_id BIGINT,IN p_status VARCHAR(20),IN p_pending_only TINYINT,
 IN p_offset INT,IN p_limit INT)
BEGIN
  DECLARE v_offset INT DEFAULT 0;
  DECLARE v_limit INT DEFAULT 50;

  SET v_offset = IFNULL(p_offset,0);
  IF v_offset < 0 THEN SET v_offset = 0; END IF;

  SET v_limit = IFNULL(p_limit,50);
  IF v_limit < 1 THEN SET v_limit = 50; END IF;
  IF v_limit > 500 THEN SET v_limit = 500; END IF;

  SELECT
    f.fine_id FineId,
    f.fine_code FineCode,
    f.student_fee_id StudentFeeId,
    s.student_id StudentId,
    s.student_code StudentCode,
    s.full_name StudentName,
    sf.fee_code FeeCode,
    f.fine_type FineType,
    f.reason Reason,
    f.amount Amount,
    f.waived_amount WaivedAmount,
    f.net_amount NetAmount,
    COALESCE(fp.FinePaid,0) PaidAmount,
    GREATEST(f.net_amount-COALESCE(fp.FinePaid,0),0) PendingAmount,
    f.assessed_on AssessedOn,
    f.due_date DueDate,
    f.status Status
  FROM fee_fines f
  JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id
  JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
  JOIN students s ON s.student_id=fa.student_id
  LEFT JOIN (
    SELECT fine_id,SUM(fine_amount) FinePaid
    FROM fee_payments
    WHERE fine_id IS NOT NULL
    GROUP BY fine_id
  ) fp ON fp.fine_id=f.fine_id
  WHERE (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id)
    AND (p_student_fee_id IS NULL OR f.student_fee_id=p_student_fee_id)
    AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR f.status=(p_status COLLATE utf8mb4_unicode_ci))
    AND (p_pending_only=0 OR GREATEST(f.net_amount-COALESCE(fp.FinePaid,0),0)>0)
  ORDER BY f.assessed_on DESC,f.fine_id DESC
  LIMIT v_offset,v_limit;

  SELECT COUNT(*)
  FROM fee_fines f
  JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id
  JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
  JOIN students s ON s.student_id=fa.student_id
  LEFT JOIN (
    SELECT fine_id,SUM(fine_amount) FinePaid
    FROM fee_payments
    WHERE fine_id IS NOT NULL
    GROUP BY fine_id
  ) fp ON fp.fine_id=f.fine_id
  WHERE (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id)
    AND (p_student_fee_id IS NULL OR f.student_fee_id=p_student_fee_id)
    AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR f.status=(p_status COLLATE utf8mb4_unicode_ci))
    AND (p_pending_only=0 OR GREATEST(f.net_amount-COALESCE(fp.FinePaid,0),0)>0);
END$$
DROP PROCEDURE IF EXISTS `sp_fc_history`$$
CREATE PROCEDURE `sp_fc_history`(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,IN p_payment_id BIGINT,IN p_search VARCHAR(150),
 IN p_payment_mode VARCHAR(30),IN p_from_date DATETIME,IN p_to_date DATETIME,IN p_offset INT,IN p_limit INT)
BEGIN
  DECLARE v_offset INT DEFAULT 0;
  DECLARE v_limit INT DEFAULT 50;

  SET v_offset = IFNULL(p_offset,0);
  IF v_offset < 0 THEN SET v_offset = 0; END IF;

  SET v_limit = IFNULL(p_limit,50);
  IF v_limit < 1 THEN SET v_limit = 50; END IF;
  IF v_limit > 500 THEN SET v_limit = 500; END IF;

 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
   sf.fee_code FeeCode,fc.category_name FeeCategory,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.payment_date PaymentDate,r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
 JOIN students s ON s.student_id=fa.student_id JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
 LEFT JOIN fee_receipts r ON r.payment_id=fp.payment_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_payment_id IS NULL OR fp.payment_id=p_payment_id)
   AND ((p_payment_mode COLLATE utf8mb4_unicode_ci) IS NULL OR fp.payment_mode=(p_payment_mode COLLATE utf8mb4_unicode_ci)) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date)
   AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(DATE(p_to_date),INTERVAL 1 DAY)) AND ((p_search COLLATE utf8mb4_unicode_ci) IS NULL OR (p_search COLLATE utf8mb4_unicode_ci)='' OR s.student_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR s.full_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR fp.payment_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR r.receipt_number LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%'))
 ORDER BY fp.payment_date DESC,fp.payment_id DESC LIMIT v_offset,v_limit;
 SELECT COUNT(*) FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 LEFT JOIN fee_receipts r ON r.payment_id=fp.payment_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_payment_id IS NULL OR fp.payment_id=p_payment_id)
   AND ((p_payment_mode COLLATE utf8mb4_unicode_ci) IS NULL OR fp.payment_mode=(p_payment_mode COLLATE utf8mb4_unicode_ci)) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(DATE(p_to_date),INTERVAL 1 DAY))
   AND ((p_search COLLATE utf8mb4_unicode_ci) IS NULL OR (p_search COLLATE utf8mb4_unicode_ci)='' OR s.student_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR s.full_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR fp.payment_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR r.receipt_number LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%'));
END$$
DROP PROCEDURE IF EXISTS `sp_fc_pending`$$
CREATE PROCEDURE `sp_fc_pending`(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,IN p_academic_year_id BIGINT,
 IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_overdue_only TINYINT,
 IN p_search VARCHAR(150),IN p_due_from DATE,IN p_due_to DATE,IN p_offset INT,IN p_limit INT)
BEGIN
  DECLARE v_offset INT DEFAULT 0;
  DECLARE v_limit INT DEFAULT 50;

  SET v_offset = IFNULL(p_offset,0);
  IF v_offset < 0 THEN SET v_offset = 0; END IF;

  SET v_limit = IFNULL(p_limit,50);
  IF v_limit < 1 THEN SET v_limit = 50; END IF;
  IF v_limit > 500 THEN SET v_limit = 500; END IF;

  /*
    Pending fees.
    Fine payments are pre-aggregated by fine_id, eliminating the
    ONLY_FULL_GROUP_BY failure from correlated SUM(fine_id) expressions.
  */
  SELECT
    sf.student_fee_id StudentFeeId,
    s.student_id StudentId,
    s.student_code StudentCode,
    s.full_name StudentName,
    c.course_name CourseName,
    b.branch_name BranchName,
    fs.semester_id SemesterId,
    sf.fee_code FeeCode,
    fc.category_name FeeCategory,
    sf.installment_number InstallmentNumber,
    fa.assigned_amount AssignedAmount,
    fa.concession_amount ConcessionAmount,
    sf.amount PayableAmount,
    COALESCE(paid.PaidAmount,0) PaidAmount,
    COALESCE(fine_pending.PendingFine,0) FinePending,
    GREATEST(sf.amount-COALESCE(paid.PaidAmount,0),0)
      + COALESCE(fine_pending.PendingFine,0) BalanceAmount,
    sf.due_date DueDate,
    (sf.due_date<CURDATE()) Overdue,
    GREATEST(DATEDIFF(CURDATE(),sf.due_date),0) DaysOverdue
  FROM student_fees sf
  JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
  JOIN students s ON s.student_id=fa.student_id
  JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id
  JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
  LEFT JOIN courses c ON c.course_id=s.course_id
  LEFT JOIN branches b ON b.branch_id=s.branch_id
  LEFT JOIN (
    SELECT student_fee_id,SUM(fee_amount) PaidAmount
    FROM fee_payments
    GROUP BY student_fee_id
  ) paid ON paid.student_fee_id=sf.student_fee_id
  LEFT JOIN (
    SELECT
      f.student_fee_id,
      SUM(GREATEST(f.net_amount-COALESCE(fp.FinePaid,0),0)) PendingFine
    FROM fee_fines f
    LEFT JOIN (
      SELECT fine_id,SUM(fine_amount) FinePaid
      FROM fee_payments
      WHERE fine_id IS NOT NULL
      GROUP BY fine_id
    ) fp ON fp.fine_id=f.fine_id
    WHERE f.status='ACTIVE'
    GROUP BY f.student_fee_id
  ) fine_pending ON fine_pending.student_fee_id=sf.student_fee_id
  WHERE sf.status='ACTIVE'
    AND fa.status='ACTIVE'
    AND (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id)
    AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
    AND (p_course_id IS NULL OR s.course_id=p_course_id)
    AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
    AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id)
    AND (p_overdue_only=0 OR sf.due_date<CURDATE())
    AND (p_due_from IS NULL OR sf.due_date>=p_due_from)
    AND (p_due_to IS NULL OR sf.due_date<=p_due_to)
    AND (
      (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR (p_search COLLATE utf8mb4_unicode_ci)='' OR
      s.student_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR
      s.full_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR
      sf.fee_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
    )
    AND GREATEST(sf.amount-COALESCE(paid.PaidAmount,0),0)
        + COALESCE(fine_pending.PendingFine,0) > 0
  ORDER BY sf.due_date,s.full_name,s.student_id
  LIMIT v_offset,v_limit;

  SELECT COUNT(*)
  FROM student_fees sf
  JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
  JOIN students s ON s.student_id=fa.student_id
  JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id
  LEFT JOIN (
    SELECT student_fee_id,SUM(fee_amount) PaidAmount
    FROM fee_payments
    GROUP BY student_fee_id
  ) paid ON paid.student_fee_id=sf.student_fee_id
  LEFT JOIN (
    SELECT
      f.student_fee_id,
      SUM(GREATEST(f.net_amount-COALESCE(fp.FinePaid,0),0)) PendingFine
    FROM fee_fines f
    LEFT JOIN (
      SELECT fine_id,SUM(fine_amount) FinePaid
      FROM fee_payments
      WHERE fine_id IS NOT NULL
      GROUP BY fine_id
    ) fp ON fp.fine_id=f.fine_id
    WHERE f.status='ACTIVE'
    GROUP BY f.student_fee_id
  ) fine_pending ON fine_pending.student_fee_id=sf.student_fee_id
  WHERE sf.status='ACTIVE'
    AND fa.status='ACTIVE'
    AND (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id)
    AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
    AND (p_course_id IS NULL OR s.course_id=p_course_id)
    AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
    AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id)
    AND (p_overdue_only=0 OR sf.due_date<CURDATE())
    AND (p_due_from IS NULL OR sf.due_date>=p_due_from)
    AND (p_due_to IS NULL OR sf.due_date<=p_due_to)
    AND (
      (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR (p_search COLLATE utf8mb4_unicode_ci)='' OR
      s.student_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR
      s.full_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR
      sf.fee_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
    )
    AND GREATEST(sf.amount-COALESCE(paid.PaidAmount,0),0)
        + COALESCE(fine_pending.PendingFine,0) > 0;
END$$
DROP PROCEDURE IF EXISTS `sp_marks_list`$$
CREATE PROCEDURE `sp_marks_list`(
    IN p_exam_id BIGINT, IN p_student_id BIGINT, IN p_subject_id BIGINT,
    IN p_section_id BIGINT, IN p_workflow_status VARCHAR(20), IN p_search VARCHAR(150),
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sm.mark_id, sm.college_id, sm.exam_id, e.exam_code, COALESCE(e.exam_name, sm.exam_name) AS exam_name,
        sm.student_id, st.student_code, st.full_name AS student_name,
        sm.subject_id, sub.subject_code, sub.subject_name,
        sm.section_id, sec.section_name,
        sm.max_marks, sm.marks_obtained,
        ROUND((sm.marks_obtained / NULLIF(sm.max_marks,0))*100,2) AS percentage,
        sm.grade, sm.remarks, sm.workflow_status, sm.version_no,
        sm.entered_by, sm.entered_at, sm.updated_by, sm.updated_at
    FROM student_marks sm
    LEFT JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.status=1 AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
      AND (p_exam_id IS NULL OR sm.exam_id=p_exam_id)
      AND (p_student_id IS NULL OR sm.student_id=p_student_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND ((p_workflow_status COLLATE utf8mb4_unicode_ci) IS NULL OR sm.workflow_status=(p_workflow_status COLLATE utf8mb4_unicode_ci))
      AND (
          (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR (p_search COLLATE utf8mb4_unicode_ci)=''
          OR st.student_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
          OR st.full_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
          OR sub.subject_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
          OR sub.subject_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')
      )
    ORDER BY st.student_code, sub.subject_code;
END$$
DROP PROCEDURE IF EXISTS `sp_section_search`$$
CREATE PROCEDURE `sp_section_search`(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
      AND (
          (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM(p_search COLLATE utf8mb4_0900_ai_ci) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_0900_ai_ci), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_0900_ai_ci), '%')
      )
      AND (p_department_id IS NULL OR s.department_id = p_department_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_semester_id IS NULL OR s.semester_id = p_semester_id)
      AND (p_status IS NULL OR s.status = p_status)
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DROP PROCEDURE IF EXISTS `sp_sm_subject_list`$$
CREATE PROCEDURE `sp_sm_subject_list`(
 IN p_id BIGINT, IN p_search VARCHAR(255), IN p_college_id BIGINT,
 IN p_academic_year_id BIGINT, IN p_course_id BIGINT, IN p_branch_id BIGINT,
 IN p_semester_id BIGINT, IN p_level INT, IN p_subject_type VARCHAR(50),
 IN p_elective_type VARCHAR(20), IN p_status TINYINT)
BEGIN
 SELECT s.*, s.subject_id AS id, s.subject_id AS subjectId,
        s.subject_code AS subjectCode, s.subject_name AS subjectName,
        s.subject_type AS subjectType, s.elective_type AS electiveType,
        s.lecture_hours AS lectureHours, s.tutorial_hours AS tutorialHours,
        s.practical_hours AS practicalHours, s.internal_marks AS internalMarks,
        s.external_marks AS externalMarks, s.internal_marks+s.external_marks AS totalMarks,
        s.status AS statusValue, IF(s.status=1,'Active','Inactive') AS statusName,
        m.semester_id AS semesterId, m.semester_name AS semester,
        m.semester_name AS semesterName, m.semester_number AS semesterNumber,
        m.course_id AS courseId, c.course_name AS course, c.course_name AS courseName,
        m.branch_id AS branchId, b.branch_name AS branch, b.branch_name AS branchName,
        m.academic_year_id AS academicYearId, ay.academic_year_name AS academicYear,
        c.college_id AS collegeId, COALESCE(b.department_id,c.department_id) AS departmentId,
        d.department_name AS department,
        (SELECT COUNT(*) FROM vw_sm_subject_mappings ma WHERE ma.subject_id=s.subject_id AND ma.mapping_status=1) AS mappingCount
 FROM subjects s
 LEFT JOIN vw_sm_subject_mappings m ON m.subject_id=s.subject_id AND m.semester_id=(
    SELECT mm.semester_id FROM vw_sm_subject_mappings mm
    JOIN courses mc ON mc.course_id=mm.course_id
    WHERE mm.subject_id=s.subject_id AND mm.mapping_status=1
      AND (p_college_id IS NULL OR mc.college_id=p_college_id)
      AND (p_academic_year_id IS NULL OR mm.academic_year_id=p_academic_year_id)
      AND (p_course_id IS NULL OR mm.course_id=p_course_id)
      AND (p_branch_id IS NULL OR mm.branch_id=p_branch_id)
      AND (p_semester_id IS NULL OR mm.semester_id=p_semester_id)
      AND (p_level IS NULL OR CEIL(mm.semester_number/2)=p_level)
    ORDER BY (mm.semester_id=s.primary_semester_id) DESC, mm.semester_id LIMIT 1)
 LEFT JOIN courses c ON c.course_id=m.course_id
 LEFT JOIN branches b ON b.branch_id=m.branch_id
 LEFT JOIN departments d ON d.department_id=COALESCE(b.department_id,c.department_id)
 LEFT JOIN academicyears ay ON ay.academic_year_id=m.academic_year_id
 WHERE s.deleted_at IS NULL AND (p_id IS NULL OR s.subject_id=p_id)
   AND ((p_search COLLATE utf8mb4_unicode_ci) IS NULL OR s.subject_code LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%') OR s.subject_name LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%'))
   AND (p_status IS NULL OR s.status=p_status)
   AND ((p_subject_type COLLATE utf8mb4_unicode_ci) IS NULL OR s.subject_type=(p_subject_type COLLATE utf8mb4_unicode_ci))
   AND ((p_elective_type COLLATE utf8mb4_unicode_ci) IS NULL OR s.elective_type=(p_elective_type COLLATE utf8mb4_unicode_ci))
   AND ((p_college_id IS NULL AND p_academic_year_id IS NULL AND p_course_id IS NULL
          AND p_branch_id IS NULL AND p_semester_id IS NULL AND p_level IS NULL) OR m.semester_id IS NOT NULL)
 ORDER BY s.subject_name,s.subject_id;

 SELECT m.subject_id AS subjectId,m.semester_id AS semesterId,m.course_id AS courseId,
        m.branch_id AS branchId,m.academic_year_id AS academicYearId,
        m.semester_name AS semester,m.semester_number AS semesterNumber,m.mapping_status AS status,
        c.course_name AS course,b.branch_name AS branch,ay.academic_year_name AS academicYear
 FROM vw_sm_subject_mappings m
 JOIN subjects s ON s.subject_id=m.subject_id AND s.deleted_at IS NULL
 JOIN courses c ON c.course_id=m.course_id
 JOIN branches b ON b.branch_id=m.branch_id
 JOIN academicyears ay ON ay.academic_year_id=m.academic_year_id
 WHERE (p_id IS NULL OR m.subject_id=p_id) AND (p_college_id IS NULL OR c.college_id=p_college_id)
 ORDER BY m.subject_id,m.semester_id;
END$$
DROP PROCEDURE IF EXISTS `sp_student_profile_get_all`$$
CREATE PROCEDURE `sp_student_profile_get_all`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(200),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_id BIGINT,
    IN p_status INT
)
BEGIN

    SELECT
        s.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,
        COALESCE(sp.ProfilePhoto, sa.StudentPhoto, sa.PassportPhoto) AS ProfilePhoto,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        -- Admission information
        sa.RegistrationNo AS RegistrationNumber,
        sa.AdmissionNo AS AdmissionNumber,

        -- Academic information
        s.course_id AS CourseId,
        c.course_name AS Course,

        s.branch_id AS BranchId,
        b.branch_name AS Branch,

        b.department_id AS DepartmentId,
        d.department_name AS Department,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,
        sec.section_id AS SectionId,
        sec.section_name AS Section,

        -- Contact
        s.mobile AS Mobile,
        s.email AS Email,

        -- Status
        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        (p_college_id=0 OR s.college_id = p_college_id)
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''

            OR s.full_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.student_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.mobile LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.email LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.RegistrationNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.AdmissionNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
        )

        -- Department
        AND
        (
            p_department_id IS NULL
            OR b.department_id = p_department_id
        )

        -- Course
        AND
        (
            p_course_id IS NULL
            OR s.course_id = p_course_id
        )

        -- Branch
        AND
        (
            p_branch_id IS NULL
            OR s.branch_id = p_branch_id
        )

        -- Academic Year
        AND
        (
            p_academic_year_id IS NULL
            OR s.academic_year_id = p_academic_year_id
        )

        -- Semester
        AND
        (
            p_semester IS NULL
            OR sec.semester = p_semester
        )

        -- Section
        AND
        (
            p_section_id IS NULL
            OR sec.section_id = p_section_id
        )

        -- Status
        AND
        (
            p_status IS NULL
            OR s.status = p_status
        )

    ORDER BY
        s.student_id DESC;

END$$
DROP PROCEDURE IF EXISTS `sp_student_search`$$
CREATE PROCEDURE `sp_student_search`(
    IN p_query VARCHAR(150),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_search VARCHAR(160);

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;
    SET v_search = CONCAT('%', TRIM(IFNULL((p_query COLLATE utf8mb4_unicode_ci), '')), '%');

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (
          s.student_code LIKE v_search
          OR s.full_name LIKE v_search
          OR s.email LIKE v_search
          OR s.mobile LIKE v_search
      )
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END$$
DROP PROCEDURE IF EXISTS `sp_tt_entry_list`$$
CREATE PROCEDURE `sp_tt_entry_list`(IN p_timetable_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT e.timetable_entry_id AS TimetableEntryId,e.timetable_id AS TimetableId,e.timetable_slot_id AS TimetableSlotId,
        ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,
        e.day_of_week AS DayOfWeek,e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.section_id AS SectionId,s.section_name AS SectionName,e.classroom_id AS ClassroomId,
        cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,COALESCE(cr.classroom_name,e.classroom) AS Classroom,
        e.entry_type AS EntryType,e.generated_source AS GeneratedSource,e.schedule_group_key AS ScheduleGroupKey,e.status AS Active
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id JOIN subjects su ON su.subject_id=e.subject_id
 JOIN faculty f ON f.faculty_id=e.faculty_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND (p_timetable_id IS NULL OR e.timetable_id=p_timetable_id)
   AND (p_faculty_id IS NULL OR e.faculty_id=p_faculty_id)
   AND ((p_day_of_week COLLATE utf8mb4_unicode_ci) IS NULL OR e.day_of_week=UPPER((p_day_of_week COLLATE utf8mb4_unicode_ci)))
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY e.day_of_week,ts.slot_number;
END$$
DROP PROCEDURE IF EXISTS `sp_tt_legacy_list`$$
CREATE PROCEDURE `sp_tt_legacy_list`(
 IN p_semester_id BIGINT,IN p_branch_id BIGINT,IN p_section_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),
 IN p_published TINYINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,e.subject_id AS SubjectId,
        su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetables t JOIN timetable_entries e ON e.timetable_id=t.timetable_id AND e.status=1
 JOIN sections s ON s.section_id=t.section_id JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id
 LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id JOIN semesters sem ON sem.semester_id=t.semester_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
 LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE (p_semester_id IS NULL OR t.semester_id=p_semester_id) AND (p_branch_id IS NULL OR t.branch_id=p_branch_id)
   AND (p_section_id IS NULL OR t.section_id=p_section_id) AND (p_faculty_id IS NULL OR e.faculty_id=p_faculty_id)
   AND ((p_day_of_week COLLATE utf8mb4_unicode_ci) IS NULL OR e.day_of_week=UPPER((p_day_of_week COLLATE utf8mb4_unicode_ci)))
   AND (p_published IS NULL OR t.is_published=p_published)
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY t.timetable_id,e.day_of_week,ts.slot_number;
END$$
DROP PROCEDURE IF EXISTS `sp_tt_timetable_list`$$
CREATE PROCEDURE `sp_tt_timetable_list`(
 IN p_academic_year_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,
 IN p_section_id BIGINT,IN p_status VARCHAR(30),IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,COALESCE(c.course_name,'') AS CourseName,
        t.branch_id AS BranchId,COALESCE(b.branch_name,'') AS BranchName,
        t.semester_id AS SemesterId,COALESCE(sem.semester_name,'') AS SemesterName,
        t.section_id AS SectionId,s.section_name AS SectionName,s.capacity AS SectionCapacity,
        s.college_id AS CollegeId,t.timetable_name AS TimetableName,t.status AS Status,
        t.effective_from AS EffectiveFrom,t.effective_to AS EffectiveTo,t.published_at AS PublishedAt,
        t.revision AS Revision
 FROM timetables t
 JOIN sections s ON s.section_id=t.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id
 LEFT JOIN courses c ON c.course_id=t.course_id
 LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id
 WHERE (p_academic_year_id IS NULL OR t.academic_year_id=p_academic_year_id)
   AND (p_course_id IS NULL OR t.course_id=p_course_id)
   AND (p_branch_id IS NULL OR t.branch_id=p_branch_id)
   AND (p_semester_id IS NULL OR t.semester_id=p_semester_id)
   AND (p_section_id IS NULL OR t.section_id=p_section_id)
   AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR UPPER(t.status)=UPPER((p_status COLLATE utf8mb4_unicode_ci)))
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY t.academic_year_id DESC,t.semester_id,t.section_id,t.timetable_id DESC;
END$$

DELIMITER ;
CREATE OR REPLACE VIEW vw_exam_schedule_details AS
SELECT
    es.exam_schedule_id,
    es.exam_id,
    e.college_id,
    e.academic_year_id,
    e.course_id,
    e.branch_id,
    e.semester_id,
    e.exam_code,
    e.exam_name,
    es.subject_id,
    s.subject_code,
    s.subject_name,
    es.section_id,
    sec.section_code,
    sec.section_name,
    es.classroom_id,
    c.classroom_code,
    c.classroom_name,
    c.capacity AS classroom_capacity,
    es.exam_date,
    es.start_time,
    es.end_time,
    es.reporting_time,
    es.instructions,
    es.status,
    es.created_at,
    es.created_by,
    es.updated_at,
    es.updated_by
FROM exam_schedules es
JOIN exams e ON e.exam_id = es.exam_id
JOIN subjects s ON s.subject_id = es.subject_id
LEFT JOIN sections sec ON sec.section_id = es.section_id
LEFT JOIN classrooms c ON c.classroom_id = es.classroom_id
WHERE es.deleted_at IS NULL
  AND e.deleted_at IS NULL;

-- --------------------------------------------------------------------------
-- 3) EXAM HALL ALLOCATION DETAIL VIEW
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_exam_hall_allocation_details AS
SELECT
    eha.exam_hall_allocation_id,
    eha.exam_schedule_id,
    es.exam_id,
    e.college_id,
    e.academic_year_id,
    e.exam_code,
    e.exam_name,
    es.subject_id,
    s.subject_code,
    s.subject_name,
    es.section_id,
    sec.section_code,
    sec.section_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    es.reporting_time,
    eha.classroom_id,
    c.classroom_code,
    c.classroom_name,
    c.capacity AS classroom_capacity,
    eha.allocated_students,
    eha.seat_start_number,
    eha.seat_end_number,
    eha.status,
    eha.created_at,
    eha.created_by,
    eha.updated_at,
    eha.updated_by
FROM exam_hall_allocations eha
JOIN exam_schedules es ON es.exam_schedule_id = eha.exam_schedule_id
JOIN exams e ON e.exam_id = es.exam_id
JOIN subjects s ON s.subject_id = es.subject_id
LEFT JOIN sections sec ON sec.section_id = es.section_id
JOIN classrooms c ON c.classroom_id = eha.classroom_id
WHERE eha.deleted_at IS NULL
  AND es.deleted_at IS NULL
  AND e.deleted_at IS NULL;

-- --------------------------------------------------------------------------
-- 4) EXAM SCHEDULE HALL SUMMARY VIEW
-- Useful for timetable/hall screens: one row per schedule with hall count,
-- allocated seats and total physical capacity.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_exam_schedule_hall_summary AS
SELECT
    es.exam_schedule_id,
    es.exam_id,
    e.college_id,
    e.exam_code,
    e.exam_name,
    es.subject_id,
    s.subject_code,
    s.subject_name,
    es.section_id,
    sec.section_code,
    sec.section_name,
    es.exam_date,
    es.start_time,
    es.end_time,
    COUNT(eha.exam_hall_allocation_id) AS hall_count,
    COALESCE(SUM(eha.allocated_students), 0) AS allocated_students,
    COALESCE(SUM(c.capacity), 0) AS total_hall_capacity
FROM exam_schedules es
JOIN exams e ON e.exam_id = es.exam_id
JOIN subjects s ON s.subject_id = es.subject_id
LEFT JOIN sections sec ON sec.section_id = es.section_id
LEFT JOIN exam_hall_allocations eha
    ON eha.exam_schedule_id = es.exam_schedule_id
   AND eha.status = 1
   AND eha.deleted_at IS NULL
LEFT JOIN classrooms c ON c.classroom_id = eha.classroom_id
WHERE es.deleted_at IS NULL
  AND e.deleted_at IS NULL
GROUP BY
    es.exam_schedule_id, es.exam_id, e.college_id, e.exam_code, e.exam_name,
    es.subject_id, s.subject_code, s.subject_name, es.section_id,
    sec.section_code, sec.section_name, es.exam_date, es.start_time, es.end_time;


-- Review unresolved legacy ownership; no automatic assignment is attempted.
SELECT record_id,resource FROM cms_supplemental_api_records WHERE college_id IS NULL;
SELECT policy_id,name FROM faculty_leave_policies WHERE college_id IS NULL;
SELECT ROUTINE_NAME FROM information_schema.routines WHERE routine_schema=DATABASE() AND routine_name='sp_faculty_leave_policy_find_conflicts';

-- Existing approved snapshots lacking collectible charges are not silently billed by this script.
-- An authorized administrator can call POST /api/v1/student-admissions/{admissionId}/fee-ledger.
SELECT a.AdmissionId AS admissionId,s.student_id AS studentId,snap.college_id AS collegeId,snap.fee_structure_id AS feeStructureId
FROM admission_fee_plan_snapshots snap JOIN studentadmissions a ON a.AdmissionId=snap.admission_id
JOIN students s ON s.admission_id=a.AdmissionId AND s.deleted_at IS NULL
WHERE a.IsDeleted=0 AND a.IsApproved=1
 AND NOT EXISTS(SELECT 1 FROM fee_assignments fa JOIN student_fees sf ON sf.fee_assignment_id=fa.fee_assignment_id
  WHERE fa.student_id=s.student_id AND fa.fee_structure_id=snap.fee_structure_id AND fa.status='ACTIVE');

-- Payment/receipt generation compares locally generated text with legacy table columns.
DELIMITER $$
DROP PROCEDURE IF EXISTS `sp_fc_payment_create_validated`$$
CREATE PROCEDURE `sp_fc_payment_create_validated`(
 IN p_student_fee_id BIGINT,IN p_fee_amount DECIMAL(32,10),IN p_fine_amount DECIMAL(32,10),IN p_fine_id BIGINT,
 IN p_payment_mode VARCHAR(30),IN p_transaction_reference VARCHAR(150),IN p_remarks VARCHAR(500),
 IN p_payment_date DATETIME,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_receipt_count INT; DECLARE v_fee_amount DECIMAL(32,10); DECLARE v_paid DECIMAL(32,10); DECLARE v_fine_net DECIMAL(12,2); DECLARE v_fine_paid DECIMAL(32,10);
 DECLARE v_payment_id BIGINT; DECLARE v_receipt_id BIGINT; DECLARE v_payment_code VARCHAR(100); DECLARE v_receipt_number VARCHAR(100);

 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

 IF p_actor_id IS NULL OR p_actor_id<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid actor is required.'; END IF;
 IF p_super_admin IS NULL OR p_super_admin NOT IN (0,1) OR (p_super_admin=0 AND (p_college_id IS NULL OR p_college_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid college scope is required.';
 END IF;

 IF p_student_fee_id IS NULL OR p_student_fee_id<=0 OR p_fee_amount IS NULL OR p_fine_amount IS NULL
    OR p_fee_amount<=0 OR p_fine_amount<0 OR p_fee_amount+p_fine_amount>9999999999.99
    OR p_fee_amount<>ROUND(p_fee_amount,2) OR p_fine_amount<>ROUND(p_fine_amount,2) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payment amounts must fit DECIMAL(12,2), with a positive fee and nonnegative fine.';
 END IF;
 SET p_payment_mode=UPPER(TRIM((p_payment_mode COLLATE utf8mb4_unicode_ci)));
 SET p_transaction_reference=NULLIF(TRIM((p_transaction_reference COLLATE utf8mb4_unicode_ci)),'');
 IF (p_payment_mode COLLATE utf8mb4_unicode_ci) IS NULL OR (p_payment_mode COLLATE utf8mb4_unicode_ci) NOT IN ('CASH','UPI','CARD','BANK_TRANSFER','CHEQUE') THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid payment mode.';
 END IF;
 IF (p_fine_amount=0 AND p_fine_id IS NOT NULL) OR (p_fine_amount>0 AND (p_fine_id IS NULL OR p_fine_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId and FineAmount must be supplied together.';
 END IF;
 START TRANSACTION;
 SELECT s.student_id,sf.amount INTO v_student_id,v_fee_amount
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE'
   AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;

 SELECT COALESCE(SUM(fee_amount),0) INTO v_paid FROM fee_payments WHERE student_fee_id=p_student_fee_id;
 IF v_paid<0 OR v_paid>v_fee_amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Stored fee balance is inconsistent; reconcile existing payments.'; END IF;
 IF p_fee_amount<=0 OR p_fee_amount>GREATEST(v_fee_amount-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fee payment exceeds the pending fee balance.'; END IF;

 IF p_fine_id IS NOT NULL THEN
   SELECT net_amount INTO v_fine_net FROM fee_fines WHERE fine_id=p_fine_id AND student_fee_id=p_student_fee_id AND status='ACTIVE' FOR UPDATE;
   IF v_fine_net IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or does not belong to the selected fee.'; END IF;
   SELECT COALESCE(SUM(fine_amount),0) INTO v_fine_paid FROM fee_payments WHERE fine_id=p_fine_id;
   IF v_fine_paid<0 OR v_fine_paid>v_fine_net THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Stored fine balance is inconsistent; reconcile existing payments.'; END IF;
   IF p_fine_amount<=0 OR p_fine_amount>GREATEST(v_fine_net-v_fine_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine payment exceeds the pending fine balance.'; END IF;
 ELSEIF p_fine_amount<>0 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId is required when FineAmount is greater than zero.';
 END IF;

 IF UPPER((p_payment_mode COLLATE utf8mb4_unicode_ci))<>'CASH' AND NULLIF(TRIM((p_transaction_reference COLLATE utf8mb4_unicode_ci)),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Transaction reference is required for non-cash payments.'; END IF;

 SET v_payment_code=CONCAT('PAY-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_payments(payment_code,student_fee_id,fine_id,fee_amount,fine_amount,payment_date,payment_mode,transaction_reference,remarks,created_by,updated_by)
 VALUES((v_payment_code COLLATE utf8mb4_unicode_ci),p_student_fee_id,p_fine_id,p_fee_amount,p_fine_amount,COALESCE(p_payment_date,NOW()),UPPER((p_payment_mode COLLATE utf8mb4_unicode_ci)),NULLIF(TRIM((p_transaction_reference COLLATE utf8mb4_unicode_ci)),''),(p_remarks COLLATE utf8mb4_unicode_ci),p_actor_id,p_actor_id);
 SET v_payment_id=LAST_INSERT_ID();

 SET v_receipt_number=CONCAT('REC-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',LPAD(v_payment_id,GREATEST(8,CHAR_LENGTH(CAST(v_payment_id AS CHAR))),'0'));
 INSERT INTO fee_receipts(receipt_number,payment_id,issued_at,issued_by,remarks,created_by,updated_by)
 VALUES((v_receipt_number COLLATE utf8mb4_unicode_ci),v_payment_id,COALESCE(p_payment_date,NOW()),p_actor_id,(p_remarks COLLATE utf8mb4_unicode_ci),p_actor_id,p_actor_id);
 SET v_receipt_id=LAST_INSERT_ID();

 SELECT COUNT(*) INTO v_receipt_count FROM fee_receipts r JOIN fee_payments fp ON fp.payment_id=r.payment_id
 WHERE fp.payment_id=v_payment_id AND r.receipt_id=v_receipt_id
   AND r.receipt_number=(v_receipt_number COLLATE utf8mb4_unicode_ci) AND fp.total_amount=p_fee_amount+p_fine_amount;
 IF v_receipt_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receipt validation failed; payment rolled back.'; END IF;
 COMMIT;

 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,fp.student_fee_id StudentFeeId,sf.fee_code FeeCode,s.student_id StudentId,
   s.student_code StudentCode,s.full_name StudentName,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_date PaymentDate,fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.fine_id FineId,
   r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_receipts r ON r.payment_id=fp.payment_id WHERE fp.payment_id=v_payment_id;
END$$
DROP PROCEDURE IF EXISTS `sp_fc_payment_create`$$
CREATE PROCEDURE `sp_fc_payment_create`(
 IN p_student_fee_id BIGINT,IN p_fee_amount DECIMAL(12,2),IN p_fine_amount DECIMAL(12,2),IN p_fine_id BIGINT,
 IN p_payment_mode VARCHAR(30),IN p_transaction_reference VARCHAR(150),IN p_remarks VARCHAR(500),
 IN p_payment_date DATETIME,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_fee_amount DECIMAL(12,2); DECLARE v_paid DECIMAL(12,2); DECLARE v_fine_net DECIMAL(12,2); DECLARE v_fine_paid DECIMAL(12,2);
 DECLARE v_payment_id BIGINT; DECLARE v_receipt_id BIGINT; DECLARE v_payment_code VARCHAR(100); DECLARE v_receipt_number VARCHAR(100);

 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT s.student_id,sf.amount INTO v_student_id,v_fee_amount
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE'
   AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;

 SELECT COALESCE(SUM(fee_amount),0) INTO v_paid FROM fee_payments WHERE student_fee_id=p_student_fee_id;
 IF p_fee_amount<=0 OR p_fee_amount>GREATEST(v_fee_amount-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fee payment exceeds the pending fee balance.'; END IF;

 IF p_fine_id IS NOT NULL THEN
   SELECT net_amount INTO v_fine_net FROM fee_fines WHERE fine_id=p_fine_id AND student_fee_id=p_student_fee_id AND status='ACTIVE' FOR UPDATE;
   IF v_fine_net IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or does not belong to the selected fee.'; END IF;
   SELECT COALESCE(SUM(fine_amount),0) INTO v_fine_paid FROM fee_payments WHERE fine_id=p_fine_id;
   IF p_fine_amount<=0 OR p_fine_amount>GREATEST(v_fine_net-v_fine_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine payment exceeds the pending fine balance.'; END IF;
 ELSEIF p_fine_amount<>0 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId is required when FineAmount is greater than zero.';
 END IF;

 IF UPPER((p_payment_mode COLLATE utf8mb4_unicode_ci))<>'CASH' AND NULLIF(TRIM((p_transaction_reference COLLATE utf8mb4_unicode_ci)),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Transaction reference is required for non-cash payments.'; END IF;

 SET v_payment_code=CONCAT('PAY-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_payments(payment_code,student_fee_id,fine_id,fee_amount,fine_amount,payment_date,payment_mode,transaction_reference,remarks,created_by,updated_by)
 VALUES((v_payment_code COLLATE utf8mb4_unicode_ci),p_student_fee_id,p_fine_id,p_fee_amount,p_fine_amount,COALESCE(p_payment_date,NOW()),UPPER((p_payment_mode COLLATE utf8mb4_unicode_ci)),NULLIF(TRIM((p_transaction_reference COLLATE utf8mb4_unicode_ci)),''),(p_remarks COLLATE utf8mb4_unicode_ci),p_actor_id,p_actor_id);
 SET v_payment_id=LAST_INSERT_ID();

 SET v_receipt_number=CONCAT('REC-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',LPAD(v_payment_id,8,'0'));
 INSERT INTO fee_receipts(receipt_number,payment_id,issued_at,issued_by,remarks,created_by,updated_by)
 VALUES((v_receipt_number COLLATE utf8mb4_unicode_ci),v_payment_id,COALESCE(p_payment_date,NOW()),p_actor_id,(p_remarks COLLATE utf8mb4_unicode_ci),p_actor_id,p_actor_id);
 SET v_receipt_id=LAST_INSERT_ID();
 COMMIT;

 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,fp.student_fee_id StudentFeeId,sf.fee_code FeeCode,s.student_id StudentId,
   s.student_code StudentCode,s.full_name StudentName,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_date PaymentDate,fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.fine_id FineId,
   r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_receipts r ON r.payment_id=fp.payment_id WHERE fp.payment_id=v_payment_id;
END$$
DELIMITER ;

-- Mutation/report paths exercised by admission and marks regression suites.
DELIMITER $$
DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Create`$$
CREATE PROCEDURE `sp_StudentAdmission_Create`(
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),

    -- IMPORTANT: photo must be MEDIUMTEXT
    IN p_student_photo MEDIUMTEXT,

    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),

    -- IMPORTANT: photo must be MEDIUMTEXT
    IN p_passport_photo MEDIUMTEXT,

    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_created_by BIGINT
)
BEGIN

    /* =========================================================
       BASIC VALIDATION
       ========================================================= */

    IF (p_first_name COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_first_name COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'First name is required.';

    END IF;


    IF (p_gender COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_gender COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gender is required.';

    END IF;


    IF TRIM((p_gender COLLATE utf8mb4_unicode_ci)) NOT IN ('Male', 'Female', 'Other') THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Gender must be Male, Female, or Other.';

    END IF;


    /* =========================================================
       DUPLICATE REGISTRATION NUMBER
       ========================================================= */

    IF (p_registration_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
       AND TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) <> '' THEN

        IF EXISTS
        (
            SELECT 1
            FROM studentadmissions
            WHERE RegistrationNo = TRIM((p_registration_no COLLATE utf8mb4_unicode_ci))
              AND IsDeleted = 0
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Registration number already exists.';

        END IF;

    END IF;


    /* =========================================================
       DUPLICATE APPLICATION NUMBER
       ========================================================= */

    IF (p_application_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
       AND TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) <> '' THEN

        IF EXISTS
        (
            SELECT 1
            FROM studentadmissions
            WHERE ApplicationNo = TRIM((p_application_no COLLATE utf8mb4_unicode_ci))
              AND IsDeleted = 0
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Application number already exists.';

        END IF;

    END IF;


    /* =========================================================
       DUPLICATE ADMISSION NUMBER
       ========================================================= */

    IF (p_admission_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
       AND TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) <> '' THEN

        IF EXISTS
        (
            SELECT 1
            FROM studentadmissions
            WHERE AdmissionNo = TRIM((p_admission_no COLLATE utf8mb4_unicode_ci))
              AND IsDeleted = 0
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Admission number already exists.';

        END IF;

    END IF;


    /* =========================================================
       DUPLICATE AADHAAR
       ========================================================= */

    IF (p_aadhaar_number COLLATE utf8mb4_unicode_ci) IS NOT NULL
       AND TRIM((p_aadhaar_number COLLATE utf8mb4_unicode_ci)) <> '' THEN

        IF EXISTS
        (
            SELECT 1
            FROM studentadmissions
            WHERE AadhaarNumber = TRIM((p_aadhaar_number COLLATE utf8mb4_unicode_ci))
              AND IsDeleted = 0
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Aadhaar number already exists.';

        END IF;

    END IF;


    /* =========================================================
       INSERT
       ========================================================= */

    INSERT INTO studentadmissions
    (
        RegistrationNo,
        RegistrationDate,

        ApplicationNo,
        ApplicationDate,

        AdmissionNo,
        AdmissionDate,

        AdmissionType,
        AdmissionQuota,
        Medium,
        ScholarshipStatus,

        FirstName,
        LastName,
        Gender,
        DateOfBirth,
        BloodGroup,

        StudentPhoto,

        Email,
        StudentEmail,
        MobileNumber,
        AadhaarNumber,

        Nationality,
        Religion,
        Category,

        FatherName,
        MotherName,
        GuardianName,
        Occupation,
        AnnualIncome,
        MotherEmail,
        GuardianMobile,
        GuardianEmail,

        Address,
        City,
        District,
        State,
        Pincode,

        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,

        SecondLanguage,

        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,

        BirthCertificate,
        TransferCertificate,
        StudyCertificate,
        AadhaarDocument,
        CommunityCertificate,
        IncomeCertificate,

        PassportPhoto,
        MarksMemo,
        CasteCertificate,
        TenthCertificate,

        Status,
        AdmissionStatus,

        InterviewRequired,

        AdmissionFeeAmount,

        Remarks,

        IsActive,
        IsDeleted,

        CreatedBy,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        NULLIF(TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)), ''),
        p_registration_date,

        NULLIF(TRIM((p_application_no COLLATE utf8mb4_unicode_ci)), ''),
        p_application_date,

        NULLIF(TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)), ''),
        p_admission_date,

        NULLIF(TRIM((p_admission_type COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_admission_quota COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_medium COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_scholarship_status COLLATE utf8mb4_unicode_ci)), ''),

        TRIM((p_first_name COLLATE utf8mb4_unicode_ci)),
        NULLIF(TRIM((p_last_name COLLATE utf8mb4_unicode_ci)), ''),
        TRIM((p_gender COLLATE utf8mb4_unicode_ci)),
        p_date_of_birth,
        NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''),

        /* PHOTO */
        NULLIF(TRIM(p_student_photo), ''),

        NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_student_email COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mobile_number COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_aadhaar_number COLLATE utf8mb4_unicode_ci)), ''),

        NULLIF(TRIM((p_nationality COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_religion COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_category COLLATE utf8mb4_unicode_ci)), ''),

        NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_guardian_name COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_occupation COLLATE utf8mb4_unicode_ci)), ''),
        p_annual_income,
        NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_guardian_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_guardian_email COLLATE utf8mb4_unicode_ci)), ''),

        (p_address COLLATE utf8mb4_unicode_ci),
        NULLIF(TRIM((p_city COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_district COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_state COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_pincode COLLATE utf8mb4_unicode_ci)), ''),

        p_board_id,
        p_academic_year_id,
        p_academic_level_id,
        p_group_id,
        p_section_id,

        NULLIF(TRIM((p_second_language COLLATE utf8mb4_unicode_ci)), ''),

        NULLIF(TRIM((p_previous_school COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_previous_board COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_previous_year COLLATE utf8mb4_unicode_ci)), ''),
        p_previous_percentage,
        NULLIF(TRIM((p_previous_hall_ticket COLLATE utf8mb4_unicode_ci)), ''),

        NULLIF(TRIM((p_birth_certificate COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_transfer_certificate COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_study_certificate COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_aadhaar_document COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_community_certificate COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_income_certificate COLLATE utf8mb4_unicode_ci)), ''),

        /* PASSPORT PHOTO */
        NULLIF(TRIM(p_passport_photo), ''),

        NULLIF(TRIM((p_marks_memo COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_caste_certificate COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_tenth_certificate COLLATE utf8mb4_unicode_ci)), ''),

        NULLIF(TRIM((p_status COLLATE utf8mb4_unicode_ci)), ''),

        COALESCE(
            NULLIF(TRIM((p_admission_status COLLATE utf8mb4_unicode_ci)), ''),
            'Draft'
        ),

        COALESCE(p_interview_required, 0),

        COALESCE(p_admission_fee_amount, 0.00),

        (p_remarks COLLATE utf8mb4_unicode_ci),

        COALESCE(p_is_active, 1),
        0,

        p_created_by,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );


    /* =========================================================
       RETURN CREATED RECORD
       ========================================================= */

    SELECT *
    FROM studentadmissions
    WHERE AdmissionId = LAST_INSERT_ID();

END$$
DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Update`$$
CREATE PROCEDURE `sp_StudentAdmission_Update`(
    IN p_admission_id BIGINT,

    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,

    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,

    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,

    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),

    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),

    /* IMPORTANT: PHOTO SIZE */
    IN p_student_photo MEDIUMTEXT,

    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),

    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),

    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),

    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),

    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),

    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,

    IN p_second_language VARCHAR(500),

    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),

    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),

    /* IMPORTANT: PHOTO SIZE */
    IN p_passport_photo MEDIUMTEXT,

    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),

    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),

    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),

    IN p_remarks TEXT,

    IN p_is_active TINYINT,

    IN p_updated_by BIGINT
)
BEGIN

    /* ============================================================
       1. CHECK WHETHER ADMISSION EXISTS
       ============================================================ */

    IF NOT EXISTS
    (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    )
    THEN

        SELECT *
        FROM studentadmissions
        WHERE 1 = 0;

    ELSE

        /* ========================================================
           2. DUPLICATE REGISTRATION NUMBER
           ======================================================== */

        IF (p_registration_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
           AND TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) <> ''
           AND EXISTS
           (
               SELECT 1
               FROM studentadmissions
               WHERE RegistrationNo = TRIM((p_registration_no COLLATE utf8mb4_unicode_ci))
                 AND AdmissionId <> p_admission_id
                 AND IsDeleted = 0
           )
        THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number already exists.';

        END IF;


        /* ========================================================
           3. DUPLICATE APPLICATION NUMBER
           ======================================================== */

        IF (p_application_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
           AND TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) <> ''
           AND EXISTS
           (
               SELECT 1
               FROM studentadmissions
               WHERE ApplicationNo = TRIM((p_application_no COLLATE utf8mb4_unicode_ci))
                 AND AdmissionId <> p_admission_id
                 AND IsDeleted = 0
           )
        THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Application number already exists.';

        END IF;


        /* ========================================================
           4. DUPLICATE ADMISSION NUMBER
           ======================================================== */

        IF (p_admission_no COLLATE utf8mb4_unicode_ci) IS NOT NULL
           AND TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) <> ''
           AND EXISTS
           (
               SELECT 1
               FROM studentadmissions
               WHERE AdmissionNo = TRIM((p_admission_no COLLATE utf8mb4_unicode_ci))
                 AND AdmissionId <> p_admission_id
                 AND IsDeleted = 0
           )
        THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number already exists.';

        END IF;


        /* ========================================================
           5. UPDATE ADMISSION
           ======================================================== */

        UPDATE studentadmissions
        SET

            RegistrationNo =
                NULLIF(TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)), ''),

            RegistrationDate =
                p_registration_date,

            ApplicationNo =
                NULLIF(TRIM((p_application_no COLLATE utf8mb4_unicode_ci)), ''),

            ApplicationDate =
                p_application_date,

            AdmissionNo =
                NULLIF(TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)), ''),

            AdmissionDate =
                p_admission_date,

            AdmissionType =
                NULLIF(TRIM((p_admission_type COLLATE utf8mb4_unicode_ci)), ''),

            AdmissionQuota =
                NULLIF(TRIM((p_admission_quota COLLATE utf8mb4_unicode_ci)), ''),

            Medium =
                NULLIF(TRIM((p_medium COLLATE utf8mb4_unicode_ci)), ''),

            ScholarshipStatus =
                NULLIF(TRIM((p_scholarship_status COLLATE utf8mb4_unicode_ci)), ''),

            FirstName =
                TRIM((p_first_name COLLATE utf8mb4_unicode_ci)),

            LastName =
                NULLIF(TRIM((p_last_name COLLATE utf8mb4_unicode_ci)), ''),

            Gender =
                TRIM((p_gender COLLATE utf8mb4_unicode_ci)),

            DateOfBirth =
                p_date_of_birth,

            BloodGroup =
                NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               STUDENT PHOTO

               If a new photo is supplied:
                   replace existing photo.

               If photo is NULL or empty:
                   keep existing photo.
               ==================================================== */

            StudentPhoto =
                CASE
                    WHEN p_student_photo IS NULL
                         THEN StudentPhoto

                    WHEN TRIM(p_student_photo) = ''
                         THEN StudentPhoto

                    ELSE p_student_photo
                END,


            Email =
                NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''),

            StudentEmail =
                NULLIF(TRIM((p_student_email COLLATE utf8mb4_unicode_ci)), ''),

            MobileNumber =
                NULLIF(TRIM((p_mobile_number COLLATE utf8mb4_unicode_ci)), ''),

            AadhaarNumber =
                NULLIF(TRIM((p_aadhaar_number COLLATE utf8mb4_unicode_ci)), ''),

            Nationality =
                NULLIF(TRIM((p_nationality COLLATE utf8mb4_unicode_ci)), ''),

            Religion =
                NULLIF(TRIM((p_religion COLLATE utf8mb4_unicode_ci)), ''),

            Category =
                NULLIF(TRIM((p_category COLLATE utf8mb4_unicode_ci)), ''),

            FatherName =
                NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''),

            MotherName =
                NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''),

            GuardianName =
                NULLIF(TRIM((p_guardian_name COLLATE utf8mb4_unicode_ci)), ''),

            Occupation =
                NULLIF(TRIM((p_occupation COLLATE utf8mb4_unicode_ci)), ''),

            AnnualIncome =
                p_annual_income,

            MotherEmail =
                NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''),

            GuardianMobile =
                NULLIF(TRIM((p_guardian_mobile COLLATE utf8mb4_unicode_ci)), ''),

            GuardianEmail =
                NULLIF(TRIM((p_guardian_email COLLATE utf8mb4_unicode_ci)), ''),

            Address =
                (p_address COLLATE utf8mb4_unicode_ci),

            City =
                NULLIF(TRIM((p_city COLLATE utf8mb4_unicode_ci)), ''),

            District =
                NULLIF(TRIM((p_district COLLATE utf8mb4_unicode_ci)), ''),

            State =
                NULLIF(TRIM((p_state COLLATE utf8mb4_unicode_ci)), ''),

            Pincode =
                NULLIF(TRIM((p_pincode COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               ACADEMIC DETAILS
               ==================================================== */

            BoardId =
                p_board_id,

            AcademicYearId =
                p_academic_year_id,

            AcademicLevelId =
                p_academic_level_id,

            GroupId =
                p_group_id,

            SectionId =
                p_section_id,

            SecondLanguage =
                NULLIF(TRIM((p_second_language COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               PREVIOUS EDUCATION
               ==================================================== */

            PreviousSchool =
                NULLIF(TRIM((p_previous_school COLLATE utf8mb4_unicode_ci)), ''),

            PreviousBoard =
                NULLIF(TRIM((p_previous_board COLLATE utf8mb4_unicode_ci)), ''),

            PreviousYear =
                NULLIF(TRIM((p_previous_year COLLATE utf8mb4_unicode_ci)), ''),

            PreviousPercentage =
                p_previous_percentage,

            PreviousHallTicket =
                NULLIF(TRIM((p_previous_hall_ticket COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               DOCUMENTS
               ==================================================== */

            BirthCertificate =
                NULLIF(TRIM((p_birth_certificate COLLATE utf8mb4_unicode_ci)), ''),

            TransferCertificate =
                NULLIF(TRIM((p_transfer_certificate COLLATE utf8mb4_unicode_ci)), ''),

            StudyCertificate =
                NULLIF(TRIM((p_study_certificate COLLATE utf8mb4_unicode_ci)), ''),

            AadhaarDocument =
                NULLIF(TRIM((p_aadhaar_document COLLATE utf8mb4_unicode_ci)), ''),

            CommunityCertificate =
                NULLIF(TRIM((p_community_certificate COLLATE utf8mb4_unicode_ci)), ''),

            IncomeCertificate =
                NULLIF(TRIM((p_income_certificate COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               PASSPORT PHOTO

               New photo -> replace.
               NULL/empty -> keep old photo.
               ==================================================== */

            PassportPhoto =
                CASE
                    WHEN p_passport_photo IS NULL
                         THEN PassportPhoto

                    WHEN TRIM(p_passport_photo) = ''
                         THEN PassportPhoto

                    ELSE p_passport_photo
                END,


            MarksMemo =
                NULLIF(TRIM((p_marks_memo COLLATE utf8mb4_unicode_ci)), ''),

            CasteCertificate =
                NULLIF(TRIM((p_caste_certificate COLLATE utf8mb4_unicode_ci)), ''),

            TenthCertificate =
                NULLIF(TRIM((p_tenth_certificate COLLATE utf8mb4_unicode_ci)), ''),


            /* ====================================================
               ADMISSION STATUS
               ==================================================== */

            Status =
                NULLIF(TRIM((p_status COLLATE utf8mb4_unicode_ci)), ''),

            AdmissionStatus =
                NULLIF(TRIM((p_admission_status COLLATE utf8mb4_unicode_ci)), ''),

            InterviewRequired =
                p_interview_required,

            AdmissionFeeAmount =
                p_admission_fee_amount,

            Remarks =
                (p_remarks COLLATE utf8mb4_unicode_ci),

            IsActive =
                p_is_active,

            UpdatedBy =
                p_updated_by,

            UpdatedAt =
                UTC_TIMESTAMP()


        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0;


        /* ========================================================
           6. RETURN UPDATED RECORD
           ======================================================== */

        SELECT *
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0;

    END IF;

END$$
DROP PROCEDURE IF EXISTS `sp_marks_report_summary`$$
CREATE PROCEDURE `sp_marks_report_summary`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_student_id BIGINT, IN p_workflow_status VARCHAR(20),
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        e.exam_id, e.exam_code, e.exam_name,
        COUNT(DISTINCT st.student_id) AS total_students,
        COUNT(DISTINCT sm.subject_id) AS total_subjects,
        COUNT(DISTINCT st.student_id) * GREATEST(COUNT(DISTINCT sm.subject_id),1) AS expected_entries,
        COUNT(sm.mark_id) AS entered_entries,
        SUM(CASE WHEN sm.mark_id IS NULL THEN 1 ELSE 0 END) AS pending_entries,
        SUM(CASE WHEN sm.workflow_status='DRAFT' THEN 1 ELSE 0 END) AS draft_entries,
        SUM(CASE WHEN sm.workflow_status='SUBMITTED' THEN 1 ELSE 0 END) AS submitted_entries,
        SUM(CASE WHEN sm.workflow_status='APPROVED' THEN 1 ELSE 0 END) AS approved_entries,
        SUM(CASE WHEN sm.workflow_status='REJECTED' THEN 1 ELSE 0 END) AS rejected_entries,
        COALESCE(ROUND(AVG((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS average_percentage,
        COALESCE(ROUND(MAX((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS highest_percentage,
        COALESCE(ROUND(MIN((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS lowest_percentage
    FROM exams e
    LEFT JOIN students st ON st.college_id=e.college_id AND st.status=1 AND st.deleted_at IS NULL
        AND st.academic_year_id=e.academic_year_id
        AND (e.course_id IS NULL OR st.course_id=e.course_id)
        AND (e.branch_id IS NULL OR st.branch_id=e.branch_id)
    LEFT JOIN student_marks sm ON sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id
        AND (p_section_id IS NULL OR sm.section_id=p_section_id)
        AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
        AND (p_student_id IS NULL OR sm.student_id=p_student_id)
        AND ((p_workflow_status COLLATE utf8mb4_unicode_ci) IS NULL OR sm.workflow_status=(p_workflow_status COLLATE utf8mb4_unicode_ci))
    WHERE e.exam_id=p_exam_id
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY e.exam_id,e.exam_code,e.exam_name;
END$$
DROP PROCEDURE IF EXISTS `sp_marks_report_subject`$$
CREATE PROCEDURE `sp_marks_report_subject`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_workflow_status VARCHAR(20), IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sub.subject_id, sub.subject_code, sub.subject_name, p_exam_id AS exam_id,
        COUNT(DISTINCT sm.student_id) AS total_students,
        COUNT(sm.mark_id) AS entered_count,
        SUM(CASE WHEN sm.workflow_status='APPROVED' THEN 1 ELSE 0 END) AS approved_count,
        COALESCE(ROUND(AVG(sm.marks_obtained),2),0) AS average_marks,
        COALESCE(ROUND(AVG(sm.marks_obtained/NULLIF(sm.max_marks,0)*100),2),0) AS average_percentage,
        COALESCE(MAX(sm.marks_obtained),0) AS highest_marks,
        COALESCE(MIN(sm.marks_obtained),0) AS lowest_marks
    FROM subjects sub
    JOIN student_marks sm ON sm.status=1 AND sm.subject_id=sub.subject_id AND sm.exam_id=p_exam_id
    JOIN exams e ON e.exam_id=sm.exam_id
    WHERE (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND ((p_workflow_status COLLATE utf8mb4_unicode_ci) IS NULL OR sm.workflow_status=(p_workflow_status COLLATE utf8mb4_unicode_ci))
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY sub.subject_id,sub.subject_code,sub.subject_name
    ORDER BY sub.subject_code;
END$$
DELIMITER ;
