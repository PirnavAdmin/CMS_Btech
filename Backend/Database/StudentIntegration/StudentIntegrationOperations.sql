-- =============================================================
-- STUDENT ADMISSION / DOCUMENT / PROMOTION INTEGRATION
-- Direct-run MySQL 8.x update; no migration runner is required.
-- Existing tables, document columns, procedures and APIs are kept.
-- =============================================================

USE `cms_btech`;

CREATE TABLE IF NOT EXISTS `student_document_files` (
    `document_id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT NOT NULL,
    `document_type` VARCHAR(100) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `content_type` VARCHAR(150) DEFAULT NULL,
    `file_size` BIGINT DEFAULT NULL,
    `uploaded_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    `deleted_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`document_id`),
    KEY `idx_student_document_files_student` (`student_id`, `is_deleted`),
    CONSTRAINT `fk_student_document_files_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1000000000 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_fee_structures` (
    `fee_structure_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `tuition_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `admission_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `hostel_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `transportation_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `scholarship_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_plan` VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME',
    `payment_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`fee_structure_id`),
    UNIQUE KEY `uq_student_admission_fee_admission` (`admission_id`),
    CONSTRAINT `fk_student_admission_fee_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_student_admission_fee_nonnegative`
        CHECK (`tuition_fee` >= 0 AND `admission_fee` >= 0
            AND `hostel_fee` >= 0 AND `transportation_fee` >= 0
            AND `scholarship_amount` >= 0 AND `amount_paid` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_previous_education` (
    `previous_education_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `qualification_level` VARCHAR(30) NOT NULL,
    `qualification` VARCHAR(100) DEFAULT NULL,
    `board_or_university` VARCHAR(150) DEFAULT NULL,
    `institution` VARCHAR(255) DEFAULT NULL,
    `roll_number` VARCHAR(50) DEFAULT NULL,
    `passing_year` VARCHAR(20) DEFAULT NULL,
    `stream` VARCHAR(100) DEFAULT NULL,
    `score` DECIMAL(5,2) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`previous_education_id`),
    UNIQUE KEY `uq_admission_previous_education_level`
        (`admission_id`, `qualification_level`),
    CONSTRAINT `fk_admission_previous_education_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_admission_previous_education_score`
        CHECK (`score` IS NULL OR (`score` >= 0 AND `score` <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_form_data` (
    `admission_id` BIGINT NOT NULL,
    `form_data` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`admission_id`),
    CONSTRAINT `fk_student_admission_form_data_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_form_data_upsert`(
    IN p_admission_id BIGINT,
    IN p_form_data LONGTEXT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF p_form_data IS NULL OR JSON_VALID(p_form_data) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission formData must be valid JSON.';
    END IF;

    INSERT INTO `student_admission_form_data` (
        `admission_id`, `form_data`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, CAST(p_form_data AS JSON), UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `form_data` = VALUES(`form_data`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

-- Return all normalized columns plus the complete frontend form payload.
DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById`;
DELIMITER $$
CREATE PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`AdmissionId` = p_admission_id
      AND sa.`IsDeleted` = 0
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_list`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_list`(
    IN p_search VARCHAR(255),
    IN p_admission_status VARCHAR(50),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;

    IF p_page_number IS NULL OR p_page_number < 1 THEN
        SET p_page_number = 1;
    END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
        SET p_page_size = 20;
    END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`,
        COUNT(*) OVER() AS `TotalRecords`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`IsDeleted` = 0
      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR sa.`RegistrationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`ApplicationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`AdmissionNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR CONCAT_WS(' ', sa.`FirstName`, sa.`LastName`) LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`StudentEmail` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`MobileNumber` LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
          NULLIF(TRIM(p_admission_status), '') IS NULL
          OR UPPER(sa.`AdmissionStatus`) = UPPER(TRIM(p_admission_status))
      )
    ORDER BY sa.`CreatedAt` DESC, sa.`AdmissionId` DESC
    LIMIT p_page_size OFFSET v_offset;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_create`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_create`(
    IN p_student_id BIGINT,
    IN p_document_type VARCHAR(100),
    IN p_file_name VARCHAR(255),
    IN p_file_path VARCHAR(500),
    IN p_content_type VARCHAR(150),
    IN p_file_size BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_document_id BIGINT;

    IF NOT EXISTS (
        SELECT 1 FROM `students`
        WHERE `student_id` = p_student_id AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;
    IF NULLIF(TRIM(p_document_type), '') IS NULL
       OR NULLIF(TRIM(p_file_name), '') IS NULL
       OR NULLIF(TRIM(p_file_path), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Document type, file name and file path are required.';
    END IF;

    INSERT INTO `student_document_files` (
        `student_id`, `document_type`, `file_name`, `file_path`,
        `content_type`, `file_size`, `uploaded_date`, `created_by`
    ) VALUES (
        p_student_id, TRIM(p_document_type), TRIM(p_file_name), TRIM(p_file_path),
        NULLIF(TRIM(p_content_type), ''), p_file_size, UTC_TIMESTAMP(), p_created_by
    );
    SET v_document_id = LAST_INSERT_ID();

    SELECT
        f.`document_id` AS `DocumentId`,
        f.`student_id` AS `StudentId`,
        f.`document_type` AS `DocumentType`,
        f.`file_name` AS `FileName`,
        f.`file_path` AS `FilePath`,
        f.`content_type` AS `ContentType`,
        f.`file_size` AS `FileSize`,
        f.`uploaded_date` AS `UploadedDate`
    FROM `student_document_files` f
    WHERE f.`document_id` = v_document_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_get_by_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_get_by_id`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT
)
BEGIN
    SELECT
        d.`DocumentId`, d.`StudentId`, d.`DocumentType`, d.`FileName`,
        d.`FilePath`, d.`ContentType`, d.`FileSize`, d.`UploadedDate`
    FROM (
        SELECT
            f.`document_id` AS `DocumentId`,
            f.`student_id` AS `StudentId`,
            f.`document_type` AS `DocumentType`,
            f.`file_name` AS `FileName`,
            f.`file_path` AS `FilePath`,
            f.`content_type` AS `ContentType`,
            f.`file_size` AS `FileSize`,
            f.`uploaded_date` AS `UploadedDate`
        FROM `student_document_files` f
        WHERE f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + legacy.`type_number`, sd.`Student_Id`,
            legacy.`document_type`, legacy.`file_name`, legacy.`file_name`,
            NULL, NULL, sd.`UploadedDate`
        FROM `student_documents` sd
        INNER JOIN (
            SELECT 1 AS `type_number`, 'Aadhaar Document' AS `document_type`,
                sd1.`AadhaarDocument` AS `file_name`, sd1.`DocumentId` AS `source_id`
            FROM `student_documents` sd1
            UNION ALL SELECT 2, 'Previous Certificates', sd2.`PreviousCertificates`, sd2.`DocumentId` FROM `student_documents` sd2
            UNION ALL SELECT 3, 'Transfer Certificate', sd3.`TransferCertificate`, sd3.`DocumentId` FROM `student_documents` sd3
            UNION ALL SELECT 4, 'Passport Photo', sd4.`PassportPhoto`, sd4.`DocumentId` FROM `student_documents` sd4
            UNION ALL SELECT 5, 'Caste Certificate', sd5.`CasteCertificate`, sd5.`DocumentId` FROM `student_documents` sd5
            UNION ALL SELECT 6, 'Income Certificate', sd6.`IncomeCertificate`, sd6.`DocumentId` FROM `student_documents` sd6
        ) legacy ON legacy.`source_id` = sd.`DocumentId`
        WHERE NULLIF(TRIM(legacy.`file_name`), '') IS NOT NULL
    ) d
    WHERE d.`StudentId` = p_student_id
      AND d.`DocumentId` = p_document_id
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_delete`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_delete`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    DECLARE v_deleted INT DEFAULT 0;
    DECLARE v_legacy_source_id BIGINT DEFAULT 0;
    DECLARE v_legacy_type INT DEFAULT 0;

    UPDATE `student_document_files`
    SET `is_deleted` = 1,
        `deleted_at` = UTC_TIMESTAMP(),
        `deleted_by` = p_deleted_by
    WHERE `document_id` = p_document_id
      AND `student_id` = p_student_id
      AND `is_deleted` = 0;
    SET v_deleted = ROW_COUNT();

    IF v_deleted = 0 AND p_document_id < 1000000000 THEN
        SET v_legacy_source_id = FLOOR(p_document_id / 100);
        SET v_legacy_type = MOD(p_document_id, 100);

        UPDATE `student_documents`
        SET `AadhaarDocument` = IF(v_legacy_type = 1, NULL, `AadhaarDocument`),
            `PreviousCertificates` = IF(v_legacy_type = 2, NULL, `PreviousCertificates`),
            `TransferCertificate` = IF(v_legacy_type = 3, NULL, `TransferCertificate`),
            `PassportPhoto` = IF(v_legacy_type = 4, NULL, `PassportPhoto`),
            `CasteCertificate` = IF(v_legacy_type = 5, NULL, `CasteCertificate`),
            `IncomeCertificate` = IF(v_legacy_type = 6, NULL, `IncomeCertificate`)
        WHERE `DocumentId` = v_legacy_source_id
          AND `Student_Id` = p_student_id
          AND v_legacy_type BETWEEN 1 AND 6;
        SET v_deleted = ROW_COUNT();
    END IF;

    SELECT IF(v_deleted > 0, 1, 0) AS `Deleted`;
END$$
DELIMITER ;

-- Replace the existing list procedure with a backward-compatible union.
DROP PROCEDURE IF EXISTS `sp_student_documents_get_by_student_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_documents_get_by_student_id`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        documents.`document_id`, documents.`student_id`,
        documents.`document_type`, documents.`file_name`, documents.`uploaded_date`
    FROM (
        SELECT
            f.`document_id`, f.`student_id`, f.`document_type`,
            f.`file_name`, f.`uploaded_date`, 0 AS `display_order`
        FROM `student_document_files` f
        WHERE f.`student_id` = p_student_id AND f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + 1, sd.`Student_Id`, 'Aadhaar Document', sd.`AadhaarDocument`, sd.`UploadedDate`, 1
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`AadhaarDocument`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 2, sd.`Student_Id`, 'Previous Certificates', sd.`PreviousCertificates`, sd.`UploadedDate`, 2
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PreviousCertificates`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 3, sd.`Student_Id`, 'Transfer Certificate', sd.`TransferCertificate`, sd.`UploadedDate`, 3
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`TransferCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 4, sd.`Student_Id`, 'Passport Photo', sd.`PassportPhoto`, sd.`UploadedDate`, 4
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PassportPhoto`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 5, sd.`Student_Id`, 'Caste Certificate', sd.`CasteCertificate`, sd.`UploadedDate`, 5
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`CasteCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 6, sd.`Student_Id`, 'Income Certificate', sd.`IncomeCertificate`, sd.`UploadedDate`, 6
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`IncomeCertificate`), '') IS NOT NULL
    ) documents
    ORDER BY documents.`uploaded_date` DESC, documents.`display_order`, documents.`document_id` DESC;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_submit`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_submit`(
    IN p_admission_id BIGINT,
    IN p_submitted_by BIGINT
)
BEGIN
    DECLARE v_previous_status VARCHAR(50) DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_submitted_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    SELECT `AdmissionStatus` INTO v_previous_status
    FROM `studentadmissions`
    WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    LIMIT 1;

    IF v_previous_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_previous_status NOT IN ('Draft', 'Registered', 'Application Submitted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a draft or registered admission can be submitted.';
    END IF;

    IF v_previous_status <> 'Application Submitted' THEN
        UPDATE `studentadmissions`
        SET `AdmissionStatus` = 'Application Submitted',
            `SubmittedAt` = UTC_TIMESTAMP(),
            `UpdatedAt` = UTC_TIMESTAMP(),
            `UpdatedBy` = p_submitted_by
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0;

        INSERT INTO `admission_status_history` (
            `AdmissionId`, `PreviousStatus`, `NewStatus`, `ActionType`, `Remarks`,
            `ChangedBy`, `ChangedAt`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
        ) VALUES (
            p_admission_id, v_previous_status, 'Application Submitted', 'SUBMITTED',
            'Admission application submitted through the API.', p_submitted_by,
            UTC_TIMESTAMP(), 1, 0, p_submitted_by, UTC_TIMESTAMP()
        );
    END IF;

    SELECT
        sa.`AdmissionId`, sa.`AdmissionStatus`, sa.`SubmittedAt`
    FROM `studentadmissions` sa
    WHERE sa.`AdmissionId` = p_admission_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00), 0.00
        ) AS `FirstYearTotal`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AmountPaid`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00)
            - COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00), 0.00
        ) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`, 'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`, IF(sa.`AdmissionFeePaid` = 1, 'PAID', 'PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`, sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs
        ON fs.`admission_id` = sa.`AdmissionId`
    WHERE sa.`AdmissionId` = p_admission_id AND sa.`IsDeleted` = 0;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_upsert`(
    IN p_admission_id BIGINT,
    IN p_tuition_fee DECIMAL(12,2),
    IN p_admission_fee DECIMAL(12,2),
    IN p_hostel_fee DECIMAL(12,2),
    IN p_transportation_fee DECIMAL(12,2),
    IN p_scholarship_amount DECIMAL(12,2),
    IN p_payment_plan VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF COALESCE(p_tuition_fee, 0) < 0 OR COALESCE(p_admission_fee, 0) < 0
       OR COALESCE(p_hostel_fee, 0) < 0 OR COALESCE(p_transportation_fee, 0) < 0
       OR COALESCE(p_scholarship_amount, 0) < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee amounts cannot be negative.';
    END IF;

    INSERT INTO `student_admission_fee_structures` (
        `admission_id`, `tuition_fee`, `admission_fee`, `hostel_fee`,
        `transportation_fee`, `scholarship_amount`, `payment_plan`,
        `payment_status`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, COALESCE(p_tuition_fee, 0), COALESCE(p_admission_fee, 0),
        COALESCE(p_hostel_fee, 0), COALESCE(p_transportation_fee, 0),
        COALESCE(p_scholarship_amount, 0), COALESCE(NULLIF(TRIM(p_payment_plan), ''), 'ONE_TIME'),
        COALESCE(NULLIF(UPPER(TRIM(p_payment_status)), ''), 'PENDING'),
        UTC_TIMESTAMP(), p_updated_by, UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `tuition_fee` = VALUES(`tuition_fee`),
        `admission_fee` = VALUES(`admission_fee`),
        `hostel_fee` = VALUES(`hostel_fee`),
        `transportation_fee` = VALUES(`transportation_fee`),
        `scholarship_amount` = VALUES(`scholarship_amount`),
        `payment_plan` = VALUES(`payment_plan`),
        `payment_status` = VALUES(`payment_status`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;

    CALL `sp_student_admission_fee_get`(p_admission_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_get`(IN p_admission_id BIGINT)
BEGIN
    IF EXISTS (
        SELECT 1 FROM `student_admission_previous_education`
        WHERE `admission_id` = p_admission_id
    ) THEN
        SELECT
            pe.`qualification_level` AS `QualificationLevel`,
            pe.`qualification` AS `Qualification`,
            pe.`board_or_university` AS `BoardOrUniversity`,
            pe.`institution` AS `Institution`,
            pe.`roll_number` AS `RollNumber`,
            pe.`passing_year` AS `PassingYear`,
            pe.`stream` AS `Stream`,
            pe.`score` AS `Score`,
            pe.`updated_at` AS `UpdatedAt`
        FROM `student_admission_previous_education` pe
        WHERE pe.`admission_id` = p_admission_id
        ORDER BY FIELD(pe.`qualification_level`, 'TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER'), pe.`previous_education_id`;
    ELSE
        SELECT
            'TENTH' AS `QualificationLevel`,
            'Class 10' AS `Qualification`,
            sa.`PreviousBoard` AS `BoardOrUniversity`,
            sa.`PreviousSchool` AS `Institution`,
            sa.`PreviousHallTicket` AS `RollNumber`,
            sa.`PreviousYear` AS `PassingYear`,
            NULL AS `Stream`,
            sa.`PreviousPercentage` AS `Score`,
            sa.`UpdatedAt` AS `UpdatedAt`
        FROM `studentadmissions` sa
        WHERE sa.`AdmissionId` = p_admission_id
          AND sa.`IsDeleted` = 0
          AND (sa.`PreviousSchool` IS NOT NULL OR sa.`PreviousBoard` IS NOT NULL
               OR sa.`PreviousPercentage` IS NOT NULL);
    END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_upsert`(
    IN p_admission_id BIGINT,
    IN p_qualification_level VARCHAR(30),
    IN p_qualification VARCHAR(100),
    IN p_board_or_university VARCHAR(150),
    IN p_institution VARCHAR(255),
    IN p_roll_number VARCHAR(50),
    IN p_passing_year VARCHAR(20),
    IN p_stream VARCHAR(100),
    IN p_score DECIMAL(5,2),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_level VARCHAR(30);
    SET v_level = UPPER(TRIM(p_qualification_level));

    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_level NOT IN ('TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid qualification level.';
    END IF;
    IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score must be between 0 and 100.';
    END IF;

    INSERT INTO `student_admission_previous_education` (
        `admission_id`, `qualification_level`, `qualification`,
        `board_or_university`, `institution`, `roll_number`, `passing_year`,
        `stream`, `score`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, v_level, NULLIF(TRIM(p_qualification), ''),
        NULLIF(TRIM(p_board_or_university), ''), NULLIF(TRIM(p_institution), ''),
        NULLIF(TRIM(p_roll_number), ''), NULLIF(TRIM(p_passing_year), ''),
        NULLIF(TRIM(p_stream), ''), p_score, UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `qualification` = VALUES(`qualification`),
        `board_or_university` = VALUES(`board_or_university`),
        `institution` = VALUES(`institution`),
        `roll_number` = VALUES(`roll_number`),
        `passing_year` = VALUES(`passing_year`),
        `stream` = VALUES(`stream`),
        `score` = VALUES(`score`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_dashboard`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_dashboard`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        COUNT(*) AS `TotalStudents`,
        SUM(IF(latest.`promotion_id` IS NULL OR latest.`promotion_status` = 'PENDING', 1, 0)) AS `PendingReview`,
        SUM(IF(latest.`promotion_eligibility` = 'ELIGIBLE', 1, 0)) AS `Eligible`,
        SUM(IF(latest.`promotion_status` = 'APPROVED', 1, 0)) AS `Promoted`,
        SUM(IF(latest.`promotion_status` = 'REJECTED', 1, 0)) AS `Rejected`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Failed`,
        SUM(IF(latest.`promotion_eligibility` = 'DETAINED', 1, 0)) AS `Detained`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Backlogs`,
        0 AS `PrerequisiteIssues`
    FROM `students` s
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        s.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        s.`email` AS `Email`,
        s.`mobile` AS `Mobile`,
        d.`department_name` AS `DepartmentName`,
        s.`course_id` AS `CourseId`,
        COALESCE(NULLIF(c.`course_short_name`, ''), c.`course_name`) AS `CourseName`,
        s.`branch_id` AS `BranchId`,
        b.`branch_name` AS `BranchName`,
        s.`academic_year_id` AS `AcademicYearId`,
        ay.`academic_year_name` AS `AcademicYearName`,
        COALESCE(sec.`semester`, sem.`semester_number`) AS `CurrentSemester`,
        CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`)) AS `CurrentSemesterName`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN COALESCE(sec.`semester`, sem.`semester_number`) + 1 ELSE NULL END AS `TargetSemester`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`) + 1)
             ELSE 'Degree Completion Review' END AS `TargetSemesterName`,
        sec.`section_name` AS `SectionName`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CAST(NULL AS DECIMAL(5,2)) AS `Sgpa`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS SIGNED) AS `FailedSubjectCount`,
        CAST(NULL AS SIGNED) AS `PrerequisiteIssueCount`,
        0 AS `ResultsAvailable`,
        'PENDING_MODULE' AS `ExamIntegrationStatus`,
        COALESCE(latest.`promotion_status`, 'PENDING') AS `PromotionStatus`,
        COALESCE(latest.`promotion_eligibility`, 'PENDING_RESULTS') AS `EligibilityStatus`
    FROM `students` s
    LEFT JOIN `courses` c ON c.`course_id` = s.`course_id`
    LEFT JOIN `branches` b ON b.`branch_id` = s.`branch_id`
    LEFT JOIN `departments` d ON d.`department_id` = b.`department_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    INNER JOIN `academicyears` ay ON ay.`academic_year_id` = s.`academic_year_id`
    LEFT JOIN `student_section_assignments` ssa
        ON ssa.`student_section_assignment_id` = (
            SELECT MAX(ssa2.`student_section_assignment_id`)
            FROM `student_section_assignments` ssa2
            WHERE ssa2.`student_id` = s.`student_id` AND ssa2.`status` = 1
        )
    LEFT JOIN `sections` sec ON sec.`section_id` = ssa.`section_id`
    LEFT JOIN `semesters` sem ON sem.`semester_id` = sec.`semester_id`
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
    ORDER BY s.`full_name`, s.`student_id`
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `students` s
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'));
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_history_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_history_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(30),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        sp.`promotion_id` AS `PromotionId`,
        sp.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        fay.`academic_year_name` AS `FromAcademicYearName`,
        tay.`academic_year_name` AS `ToAcademicYearName`,
        COALESCE(NULLIF(fc.`course_short_name`, ''), fc.`course_name`) AS `FromCourseName`,
        COALESCE(NULLIF(tc.`course_short_name`, ''), tc.`course_name`) AS `ToCourseName`,
        fb.`branch_name` AS `FromBranchName`,
        tb.`branch_name` AS `ToBranchName`,
        sp.`from_semester` AS `FromSemester`,
        sp.`to_semester` AS `ToSemester`,
        sp.`promotion_status` AS `PromotionStatus`,
        sp.`promotion_eligibility` AS `PromotionEligibility`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CASE WHEN sp.`decision_by` IS NULL THEN 'System' ELSE 'Individual' END AS `PromotionMode`,
        actor.`full_name` AS `PromotedBy`,
        COALESCE(sp.`decision_date`, sp.`created_at`) AS `PromotionDate`,
        sp.`remarks` AS `Remarks`,
        sp.`created_at` AS `CreatedAt`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    LEFT JOIN `users` actor ON actor.`user_id` = COALESCE(sp.`decision_by`, sp.`created_by`)
    LEFT JOIN `academicyears` fay ON fay.`academic_year_id` = sp.`from_academic_year_id`
    LEFT JOIN `academicyears` tay ON tay.`academic_year_id` = sp.`to_academic_year_id`
    LEFT JOIN `courses` fc ON fc.`course_id` = sp.`from_course_id`
    LEFT JOIN `courses` tc ON tc.`course_id` = sp.`to_course_id`
    LEFT JOIN `branches` fb ON fb.`branch_id` = sp.`from_branch_id`
    LEFT JOIN `branches` tb ON tb.`branch_id` = sp.`to_branch_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)))
    ORDER BY sp.`created_at` DESC, sp.`promotion_id` DESC
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)));
END$$
DELIMITER ;

-- Smoke-test examples (execute after applying this file):
-- CALL sp_student_admission_list(NULL, NULL, 1, 20);
-- CALL sp_student_admission_fee_get(1);
-- CALL sp_student_admission_previous_education_get(1);
-- CALL sp_student_promotion_dashboard(NULL, NULL, NULL, NULL);
-- CALL sp_student_promotion_directory(NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_promotion_history_directory(NULL, NULL, NULL, 1, 20);
