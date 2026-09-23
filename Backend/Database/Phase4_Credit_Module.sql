/*1. credit_configurations*/
USE cms_btech;
 
CREATE TABLE IF NOT EXISTS credit_configurations
(
    credit_configuration_id BIGINT NOT NULL AUTO_INCREMENT,
 
    subject_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    semester_id BIGINT NOT NULL,
 
    credits DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    minimum_credits DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    maximum_credits DECIMAL(5,2) DEFAULT NULL,
 
    status TINYINT NOT NULL DEFAULT 1,
 
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT DEFAULT NULL,
 
    PRIMARY KEY (credit_configuration_id),
 
    UNIQUE KEY uq_credit_configuration
    (
        subject_id,
        course_id,
        branch_id,
        semester_id
    ),
 
    KEY idx_credit_config_subject (subject_id),
    KEY idx_credit_config_course (course_id),
    KEY idx_credit_config_branch (branch_id),
    KEY idx_credit_config_semester (semester_id),
    KEY idx_credit_config_status (status),
 
    CONSTRAINT fk_credit_config_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(subject_id),
 
    CONSTRAINT fk_credit_config_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id),
 
    CONSTRAINT fk_credit_config_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id),
 
    CONSTRAINT fk_credit_config_semester
        FOREIGN KEY (semester_id)
        REFERENCES semesters(semester_id)
);


/*2. student_credit_registrations*/
 
CREATE TABLE IF NOT EXISTS student_credit_registrations

(

    student_credit_registration_id BIGINT NOT NULL AUTO_INCREMENT,
 
    student_id BIGINT NOT NULL,

    subject_id BIGINT NOT NULL,

    semester_id BIGINT NOT NULL,
 
    registered_credits DECIMAL(5,2) NOT NULL DEFAULT 0.00,
 
    registration_status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
 
    grade VARCHAR(10) DEFAULT NULL,

    grade_points DECIMAL(5,2) DEFAULT NULL,
 
    is_completed TINYINT NOT NULL DEFAULT 0,
 
    registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    status TINYINT NOT NULL DEFAULT 1,
 
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by BIGINT DEFAULT NULL,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT DEFAULT NULL,
 
    PRIMARY KEY (student_credit_registration_id),
 
    UNIQUE KEY uq_student_credit_registration

    (

        student_id,

        subject_id,

        semester_id

    ),
 
    KEY idx_student_credit_student (student_id),

    KEY idx_student_credit_subject (subject_id),

    KEY idx_student_credit_semester (semester_id),

    KEY idx_student_credit_status (status),
 
    CONSTRAINT fk_student_credit_student

        FOREIGN KEY (student_id)

        REFERENCES students(student_id),
 
    CONSTRAINT fk_student_credit_subject

        FOREIGN KEY (subject_id)

        REFERENCES subjects(subject_id),
 
    CONSTRAINT fk_student_credit_semester

        FOREIGN KEY (semester_id)

        REFERENCES semesters(semester_id)

);

/*3. student_credit_summary*/
 
CREATE TABLE IF NOT EXISTS student_credit_summary

(

    student_credit_summary_id BIGINT NOT NULL AUTO_INCREMENT,
 
    student_id BIGINT NOT NULL,

    semester_id BIGINT NOT NULL,
 
    required_credits DECIMAL(6,2) NOT NULL DEFAULT 0.00,

    registered_credits DECIMAL(6,2) NOT NULL DEFAULT 0.00,

    completed_credits DECIMAL(6,2) NOT NULL DEFAULT 0.00,
 
    pending_credits DECIMAL(6,2) NOT NULL DEFAULT 0.00,
 
    status TINYINT NOT NULL DEFAULT 1,
 
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by BIGINT DEFAULT NULL,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT DEFAULT NULL,
 
    PRIMARY KEY (student_credit_summary_id),
 
    UNIQUE KEY uq_student_credit_summary

    (

        student_id,

        semester_id

    ),
 
    KEY idx_credit_summary_student (student_id),

    KEY idx_credit_summary_semester (semester_id),

    KEY idx_credit_summary_status (status),
 
    CONSTRAINT fk_credit_summary_student

        FOREIGN KEY (student_id)

        REFERENCES students(student_id),
 
    CONSTRAINT fk_credit_summary_semester

        FOREIGN KEY (semester_id)

        REFERENCES semesters(semester_id)

);


/*Credit configuration*/
INSERT INTO credit_configurations

(

    subject_id,

    course_id,

    branch_id,

    semester_id,

    credits,

    minimum_credits,

    maximum_credits,

    status

)

VALUES

(

    1,

    1,

    1,

    1,

    4.00,

    4.00,

    4.00,

    1

);
 
/*Student credit registration*/
 
INSERT INTO student_credit_registrations

(

    student_id,

    subject_id,

    semester_id,

    registered_credits,

    registration_status,

    grade,

    grade_points,

    is_completed,

    status

)

VALUES

(

    2,

    1,

    1,

    4.00,

    'REGISTERED',

    NULL,

    NULL,

    0,

    1

);
 
 
 /*Student credit summary*/
 
INSERT INTO student_credit_summary

(

    student_id,

    semester_id,

    required_credits,

    registered_credits,

    completed_credits,

    pending_credits,

    status

)

VALUES

(

    2,

    1,

    24.00,

    4.00,

    0.00,

    24.00,

    1

);
 
SELECT * FROM credit_configurations;
SELECT * FROM student_credit_registrations;
SELECT * FROM student_credit_summary;

  