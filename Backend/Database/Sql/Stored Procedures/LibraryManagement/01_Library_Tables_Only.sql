-- Run in the existing cms_btech database. Creates only missing library tables.
-- ============================================================
-- LIBRARY MANAGEMENT MODULE
-- Creates:
--   1. library_categories
--   2. library_books
--   3. library_issues
--   4. library_fines
--
-- Uses existing tables:
--   colleges(college_id)
--   students(student_id)
--   users(user_id)
--
-- Sample data is based on the uploaded local DB dump.
-- ============================================================


-- ============================================================
-- 1. LIBRARY CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS library_categories
(
    category_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,

    category_code VARCHAR(30) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,

    status TINYINT NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT DEFAULT NULL,

    PRIMARY KEY (category_id),

    UNIQUE KEY uq_library_category_code
        (college_id, category_code),

    UNIQUE KEY uq_library_category_name
        (college_id, category_name),

    KEY idx_library_category_college
        (college_id),

    KEY idx_library_category_status
        (status),

    CONSTRAINT fk_library_category_college
        FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_library_category_status
        CHECK (status IN (0,1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 2. LIBRARY BOOKS
-- ============================================================

CREATE TABLE IF NOT EXISTS library_books
(
    book_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,

    isbn VARCHAR(20) DEFAULT NULL,
    accession_no VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    author VARCHAR(200) NOT NULL,
    publisher VARCHAR(200) DEFAULT NULL,
    edition VARCHAR(50) DEFAULT NULL,
    publication_year YEAR DEFAULT NULL,

    language VARCHAR(50) DEFAULT 'English',

    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,

    shelf_location VARCHAR(100) DEFAULT NULL,

    price DECIMAL(10,2) DEFAULT NULL,

    description VARCHAR(1000) DEFAULT NULL,

    status TINYINT NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT DEFAULT NULL,

    PRIMARY KEY (book_id),

    UNIQUE KEY uq_library_book_accession
        (college_id, accession_no),

    UNIQUE KEY uq_library_book_isbn
        (isbn),

    KEY idx_library_book_college
        (college_id),

    KEY idx_library_book_category
        (category_id),

    KEY idx_library_book_title
        (title),

    KEY idx_library_book_author
        (author),

    KEY idx_library_book_status
        (status),

    CONSTRAINT fk_library_book_college
        FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_book_category
        FOREIGN KEY (category_id)
        REFERENCES library_categories (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_library_book_status
        CHECK (status IN (0,1)),

    CONSTRAINT chk_library_book_total_copies
        CHECK (total_copies > 0),

    CONSTRAINT chk_library_book_available_copies
        CHECK (
            available_copies >= 0
            AND available_copies <= total_copies
        ),

    CONSTRAINT chk_library_book_price
        CHECK (
            price IS NULL OR price >= 0
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 3. LIBRARY ISSUES
-- ============================================================

CREATE TABLE IF NOT EXISTS library_issues
(
    issue_id BIGINT NOT NULL AUTO_INCREMENT,

    college_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    issued_by BIGINT NOT NULL,
    returned_by BIGINT DEFAULT NULL,

    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE DEFAULT NULL,

    status ENUM(
        'ISSUED',
        'RETURNED',
        'OVERDUE',
        'LOST',
        'CANCELLED'
    ) NOT NULL DEFAULT 'ISSUED',

    remarks VARCHAR(500) DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (issue_id),

    KEY idx_library_issue_college
        (college_id),

    KEY idx_library_issue_book
        (book_id),

    KEY idx_library_issue_student
        (student_id),

    KEY idx_library_issue_status
        (status),

    KEY idx_library_issue_due_date
        (due_date),

    KEY idx_library_issue_issued_by
        (issued_by),

    CONSTRAINT fk_library_issue_college
        FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_issue_book
        FOREIGN KEY (book_id)
        REFERENCES library_books (book_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_issue_student
        FOREIGN KEY (student_id)
        REFERENCES students (student_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_issue_issued_by
        FOREIGN KEY (issued_by)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_issue_returned_by
        FOREIGN KEY (returned_by)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_library_issue_dates
        CHECK (
            due_date >= issue_date
            AND (
                return_date IS NULL
                OR return_date >= issue_date
            )
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 4. LIBRARY FINES
-- ============================================================

CREATE TABLE IF NOT EXISTS library_fines
(
    fine_id BIGINT NOT NULL AUTO_INCREMENT,

    college_id BIGINT NOT NULL,
    issue_id BIGINT NOT NULL,

    fine_reason VARCHAR(255) NOT NULL,

    fine_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    status ENUM(
        'UNPAID',
        'PARTIALLY_PAID',
        'PAID',
        'WAIVED'
    ) NOT NULL DEFAULT 'UNPAID',

    assessed_date DATE NOT NULL,
    paid_date DATE DEFAULT NULL,

    payment_method VARCHAR(50) DEFAULT NULL,

    remarks VARCHAR(500) DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT DEFAULT NULL,

    PRIMARY KEY (fine_id),

    UNIQUE KEY uq_library_fine_issue
        (issue_id),

    KEY idx_library_fine_college
        (college_id),

    KEY idx_library_fine_status
        (status),

    KEY idx_library_fine_assessed_date
        (assessed_date),

    CONSTRAINT fk_library_fine_college
        FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_library_fine_issue
        FOREIGN KEY (issue_id)
        REFERENCES library_issues (issue_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_library_fine_amount
        CHECK (fine_amount >= 0),

    CONSTRAINT chk_library_fine_paid_amount
        CHECK (
            paid_amount >= 0
            AND paid_amount <= fine_amount
        )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


