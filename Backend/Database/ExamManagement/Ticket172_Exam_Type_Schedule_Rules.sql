-- ============================================================================
-- CMS BTECH - Ticket 172
-- Create exam, exam type, exam schedule and exam rules tables
-- Target: MySQL 8.x
-- Additive only: no existing tables/APIs are removed or renamed.
-- ============================================================================

USE cms_btech;

-- --------------------------------------------------------------------------
-- 1) EXAM TYPES
-- Master for Mid Semester, End Semester, Practical, Internal, etc.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_types (
    exam_type_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    type_code VARCHAR(50) NOT NULL,
    type_name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    default_duration_minutes INT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (exam_type_id),
    UNIQUE KEY uq_exam_types_college_code (college_id, type_code),
    KEY idx_exam_types_college_status (college_id, status, deleted_at),
    CONSTRAINT fk_exam_types_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_exam_types_status CHECK (status IN (0,1)),
    CONSTRAINT chk_exam_types_duration CHECK (default_duration_minutes IS NULL OR default_duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
-- 2) EXAMS
-- Exam master scoped to college + academic year + course + branch + semester.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    exam_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    academic_year_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    semester_id BIGINT NOT NULL,
    exam_type_id BIGINT NOT NULL,
    exam_code VARCHAR(50) NOT NULL,
    exam_name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (exam_id),
    UNIQUE KEY uq_exams_college_year_code (college_id, academic_year_id, exam_code),
    KEY idx_exams_scope (college_id, academic_year_id, course_id, branch_id, semester_id),
    KEY idx_exams_type (exam_type_id),
    KEY idx_exams_dates (start_date, end_date),
    KEY idx_exams_status (status, deleted_at),
    CONSTRAINT fk_exams_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exams_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exams_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exams_branch_course
        FOREIGN KEY (branch_id, course_id) REFERENCES branches(branch_id, course_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exams_semester_context
        FOREIGN KEY (semester_id, course_id, branch_id)
        REFERENCES semesters(semester_id, course_id, branch_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exams_type
        FOREIGN KEY (exam_type_id) REFERENCES exam_types(exam_type_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_exams_status CHECK (status IN (0,1)),
    CONSTRAINT chk_exams_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
-- 3) EXAM SCHEDULES
-- Subject/date/time/section/classroom schedule under one exam.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_schedules (
    exam_schedule_id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    section_id BIGINT NULL,
    classroom_id BIGINT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reporting_time TIME NULL,
    instructions VARCHAR(1000) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (exam_schedule_id),
    KEY idx_exam_schedules_exam (exam_id, status, deleted_at),
    KEY idx_exam_schedules_subject (subject_id),
    KEY idx_exam_schedules_section_date (section_id, exam_date, start_time, end_time),
    KEY idx_exam_schedules_room_date (classroom_id, exam_date, start_time, end_time),
    KEY idx_exam_schedules_date (exam_date),
    CONSTRAINT fk_exam_schedules_exam
        FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_exam_schedules_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exam_schedules_section
        FOREIGN KEY (section_id) REFERENCES sections(section_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_exam_schedules_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_exam_schedules_status CHECK (status IN (0,1)),
    CONSTRAINT chk_exam_schedules_time CHECK (end_time > start_time),
    CONSTRAINT chk_exam_schedules_reporting CHECK (reporting_time IS NULL OR reporting_time <= start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
-- 4) EXAM RULES
-- Flexible rules such as attendance eligibility, hall-ticket rules, conduct,
-- evaluation/marks instructions, grace marks policy references, etc.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_rules (
    exam_rule_id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(150) NOT NULL,
    rule_category VARCHAR(50) NULL,
    rule_value VARCHAR(500) NOT NULL,
    description VARCHAR(1000) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (exam_rule_id),
    UNIQUE KEY uq_exam_rules_exam_code (exam_id, rule_code),
    KEY idx_exam_rules_exam_status (exam_id, status, deleted_at),
    KEY idx_exam_rules_category (rule_category),
    CONSTRAINT fk_exam_rules_exam
        FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_exam_rules_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
-- Verification
-- --------------------------------------------------------------------------
SHOW TABLES LIKE 'exam_types';
SHOW TABLES LIKE 'exams';
SHOW TABLES LIKE 'exam_schedules';
SHOW TABLES LIKE 'exam_rules';

DESCRIBE exam_types;
DESCRIBE exams;
DESCRIBE exam_schedules;
DESCRIBE exam_rules;
