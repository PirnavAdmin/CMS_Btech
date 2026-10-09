-- Select your existing cms_btech database in MySQL Workbench first.
-- Run 01_Library_Tables_Only.sql first if the four library tables do not exist.
-- Additive migration: does not change any existing table or sample record.
CREATE TABLE IF NOT EXISTS library_history (
    history_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    college_id BIGINT NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id BIGINT NOT NULL,
    book_id BIGINT NULL,
    student_id BIGINT NULL,
    issue_id BIGINT NULL,
    fine_id BIGINT NULL,
    action VARCHAR(50) NOT NULL,
    details JSON NOT NULL,
    performed_by BIGINT NOT NULL,
    performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_library_history_college (college_id, performed_at),
    KEY ix_library_history_issue (issue_id),
    KEY ix_library_history_student (student_id),
    KEY ix_library_history_book (book_id),
    CONSTRAINT fk_library_history_college FOREIGN KEY (college_id) REFERENCES colleges(college_id),
    CONSTRAINT fk_library_history_actor FOREIGN KEY (performed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS library_fine_payments (
    payment_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    college_id BIGINT NOT NULL,
    fine_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    receipt_no VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    remarks VARCHAR(500) NULL,
    received_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_library_payment_receipt (college_id, receipt_no),
    KEY ix_library_payment_fine (fine_id),
    CONSTRAINT fk_library_payment_college FOREIGN KEY (college_id) REFERENCES colleges(college_id),
    CONSTRAINT fk_library_payment_fine FOREIGN KEY (fine_id) REFERENCES library_fines(fine_id),
    CONSTRAINT fk_library_payment_actor FOREIGN KEY (received_by) REFERENCES users(user_id),
    CONSTRAINT chk_library_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
