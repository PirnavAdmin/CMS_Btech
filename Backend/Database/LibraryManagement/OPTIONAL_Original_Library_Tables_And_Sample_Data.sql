USE cms_btech;

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


-- ============================================================
-- 5. CATEGORY SAMPLE DATA
-- Existing college_id = 1
-- Existing user_id = 1
-- ============================================================

INSERT INTO library_categories
(
    category_id,
    college_id,
    category_code,
    category_name,
    description,
    status,
    created_by
)
VALUES
(1, 1, 'CSE', 'Computer Science',
 'Computer science, programming, software engineering and related books.',
 1, 1),

(2, 1, 'ECE', 'Electronics and Communication',
 'Electronics, communication systems, embedded systems and related books.',
 1, 1),

(3, 1, 'EEE', 'Electrical Engineering',
 'Electrical circuits, power systems, machines and electrical engineering.',
 1, 1),

(4, 1, 'MATH', 'Mathematics',
 'Engineering mathematics and applied mathematics books.',
 1, 1),

(5, 1, 'GEN', 'General',
 'General knowledge, aptitude, competitive examinations and other books.',
 1, 1);


-- ============================================================
-- 6. BOOK SAMPLE DATA
-- ============================================================

INSERT INTO library_books
(
    book_id,
    college_id,
    category_id,
    isbn,
    accession_no,
    title,
    author,
    publisher,
    edition,
    publication_year,
    language,
    total_copies,
    available_copies,
    shelf_location,
    price,
    description,
    status,
    created_by
)
VALUES
(
    1, 1, 1,
    '9780131103627',
    'LIB-CSE-0001',
    'The C Programming Language',
    'Brian W. Kernighan and Dennis M. Ritchie',
    'Prentice Hall',
    '2nd Edition',
    1988,
    'English',
    3, 2,
    'CSE-A1',
    650.00,
    'Classic reference book for C programming.',
    1, 1
),

(
    2, 1, 1,
    '9780132350884',
    'LIB-CSE-0002',
    'Clean Code',
    'Robert C. Martin',
    'Prentice Hall',
    '1st Edition',
    2008,
    'English',
    2, 1,
    'CSE-A2',
    750.00,
    'Software development and clean coding practices.',
    1, 1
),

(
    3, 1, 1,
    '9780073523323',
    'LIB-CSE-0003',
    'Operating System Concepts',
    'Abraham Silberschatz',
    'Wiley',
    '10th Edition',
    2018,
    'English',
    2, 2,
    'CSE-A3',
    900.00,
    'Operating systems concepts for computer science students.',
    1, 1
),

(
    4, 1, 2,
    '9780133354690',
    'LIB-ECE-0001',
    'Microelectronic Circuits',
    'Adel S. Sedra and Kenneth C. Smith',
    'Oxford University Press',
    '7th Edition',
    2014,
    'English',
    2, 2,
    'ECE-B1',
    1200.00,
    'Analog and digital electronic circuit fundamentals.',
    1, 1
),

(
    5, 1, 3,
    '9780071077997',
    'LIB-EEE-0001',
    'Electrical Technology',
    'B. L. Theraja',
    'S. Chand',
    '23rd Edition',
    2010,
    'English',
    3, 3,
    'EEE-C1',
    850.00,
    'Fundamentals of electrical engineering.',
    1, 1
),

(
    6, 1, 3,
    '9780070700520',
    'LIB-EEE-0002',
    'Power System Engineering',
    'I. J. Nagrath and D. P. Kothari',
    'McGraw Hill',
    '2nd Edition',
    2012,
    'English',
    2, 2,
    'EEE-C2',
    950.00,
    'Power generation, transmission and distribution.',
    1, 1
),

(
    7, 1, 4,
    '9788131803561',
    'LIB-MATH-0001',
    'Higher Engineering Mathematics',
    'B. S. Grewal',
    'Khanna Publishers',
    '44th Edition',
    2018,
    'English',
    4, 4,
    'MATH-D1',
    700.00,
    'Engineering mathematics reference book.',
    1, 1
),

(
    8, 1, 5,
    '9788120349353',
    'LIB-GEN-0001',
    'Quantitative Aptitude',
    'R. S. Aggarwal',
    'S. Chand',
    'Revised Edition',
    2020,
    'English',
    2, 2,
    'GEN-E1',
    550.00,
    'Quantitative aptitude and competitive examination preparation.',
    1, 1
);


-- ============================================================
-- 7. ISSUE SAMPLE DATA
--
-- Existing students in college_id = 1:
-- student_id 2 = Diya Sharma
-- student_id 3 = Arjun Reddy
-- student_id 4 = Priya Sharma
-- student_id 5 = Tharun Ambala
-- student_id 6 = charan sai
--
-- Existing user_id 1 / 2 are used as library staff.
-- ============================================================

INSERT INTO library_issues
(
    issue_id,
    college_id,
    book_id,
    student_id,
    issued_by,
    returned_by,
    issue_date,
    due_date,
    return_date,
    status,
    remarks
)
VALUES
(
    1, 1, 1, 2,
    1, 2,
    '2026-09-01',
    '2026-09-15',
    '2026-09-14',
    'RETURNED',
    'Book returned within due date.'
),

(
    2, 1, 2, 3,
    1, 2,
    '2026-09-05',
    '2026-09-19',
    '2026-09-25',
    'RETURNED',
    'Book returned after due date.'
),

(
    3, 1, 3, 5,
    1, NULL,
    '2026-10-01',
    '2026-10-15',
    NULL,
    'ISSUED',
    'Currently issued to student.'
),

(
    4, 1, 4, 6,
    1, NULL,
    '2026-09-10',
    '2026-09-24',
    NULL,
    'OVERDUE',
    'Book has exceeded the due date.'
),

(
    5, 1, 5, 4,
    1, 2,
    '2026-08-20',
    '2026-09-03',
    '2026-09-02',
    'RETURNED',
    'Book returned within due date.'
),

(
    6, 1, 7, 2,
    1, NULL,
    '2026-10-05',
    '2026-10-19',
    NULL,
    'ISSUED',
    'Currently issued to student.'
);


-- ============================================================
-- 8. FINE SAMPLE DATA
-- ============================================================

INSERT INTO library_fines
(
    fine_id,
    college_id,
    issue_id,
    fine_reason,
    fine_amount,
    paid_amount,
    status,
    assessed_date,
    paid_date,
    payment_method,
    remarks,
    created_by
)
VALUES
(
    1, 1, 2,
    'Late return',
    30.00,
    30.00,
    'PAID',
    '2026-09-25',
    '2026-09-25',
    'CASH',
    'Fine paid at library counter.',
    1
),

(
    2, 1, 4,
    'Overdue book',
    50.00,
    0.00,
    'UNPAID',
    '2026-10-08',
    NULL,
    NULL,
    'Fine pending because the book is still overdue.',
    1
);


-- ============================================================
-- 9. CORRECT AVAILABLE COPIES
--
-- Active issues:
--   book_id 3 = one active issue
--   book_id 4 = one active issue
--   book_id 7 = one active issue
-- ============================================================

UPDATE library_books
SET available_copies = total_copies
WHERE book_id IN (1, 2, 5, 6, 8);

UPDATE library_books
SET available_copies = total_copies - 1
WHERE book_id IN (3, 4, 7);


-- ============================================================
-- 10. VERIFY CREATED TABLES
-- ============================================================

SELECT
    category_id,
    college_id,
    category_code,
    category_name,
    status
FROM library_categories
ORDER BY category_id;


SELECT
    book_id,
    college_id,
    category_id,
    accession_no,
    title,
    author,
    total_copies,
    available_copies,
    status
FROM library_books
ORDER BY book_id;


SELECT
    issue_id,
    college_id,
    book_id,
    student_id,
    issued_by,
    issue_date,
    due_date,
    return_date,
    status
FROM library_issues
ORDER BY issue_id;


SELECT
    fine_id,
    college_id,
    issue_id,
    fine_reason,
    fine_amount,
    paid_amount,
    status,
    assessed_date
FROM library_fines
ORDER BY fine_id;
