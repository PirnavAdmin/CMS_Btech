USE CMS_Btech;
/* =========================================================
   BTech Degree College Management System
   Task: Design Document Tables
   Purpose: Categories, Documents & Approvals
   ========================================================= */

-- =========================================================
-- 1. DOCUMENT CATEGORIES
-- =========================================================

CREATE TABLE IF NOT EXISTS document_categories (
    category_id BIGINT NOT NULL AUTO_INCREMENT,

    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(150) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,

    entity_type VARCHAR(50) NOT NULL,

    is_required TINYINT(1) NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT DEFAULT NULL,

    deleted_at DATETIME DEFAULT NULL,
    deleted_by BIGINT DEFAULT NULL,

    PRIMARY KEY (category_id),

    UNIQUE KEY uq_document_category_code (category_code),
    UNIQUE KEY uq_document_category_name_entity
        (category_name, entity_type),

    KEY idx_document_category_entity (entity_type),
    KEY idx_document_category_status (status),

    CONSTRAINT fk_document_category_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_document_category_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- 2. DOCUMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS documents (
    document_id BIGINT NOT NULL AUTO_INCREMENT,

    category_id BIGINT NOT NULL,

    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,

    document_title VARCHAR(250) NOT NULL,
    document_number VARCHAR(100) DEFAULT NULL,

    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    file_url VARCHAR(500) DEFAULT NULL,

    file_extension VARCHAR(20) DEFAULT NULL,
    mime_type VARCHAR(150) DEFAULT NULL,
    file_size BIGINT DEFAULT NULL,

    issue_date DATE DEFAULT NULL,
    expiry_date DATE DEFAULT NULL,

    remarks VARCHAR(500) DEFAULT NULL,

    status ENUM(
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'EXPIRED'
    ) NOT NULL DEFAULT 'DRAFT',

    uploaded_by BIGINT NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at DATETIME DEFAULT NULL,
    deleted_by BIGINT DEFAULT NULL,

    PRIMARY KEY (document_id),

    KEY idx_documents_category (category_id),
    KEY idx_documents_entity (entity_type, entity_id),
    KEY idx_documents_status (status),
    KEY idx_documents_uploaded_by (uploaded_by),
    KEY idx_documents_expiry (expiry_date),

    CONSTRAINT fk_documents_category
        FOREIGN KEY (category_id)
        REFERENCES document_categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_documents_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_documents_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- 3. DOCUMENT APPROVALS
-- =========================================================

CREATE TABLE IF NOT EXISTS document_approvals (
    approval_id BIGINT NOT NULL AUTO_INCREMENT,

    document_id BIGINT NOT NULL,

    approver_user_id BIGINT NOT NULL,

    approval_level INT NOT NULL DEFAULT 1,

    action ENUM(
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'RETURNED'
    ) NOT NULL,

    comments VARCHAR(1000) DEFAULT NULL,

    action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (approval_id),

    KEY idx_document_approvals_document (document_id),
    KEY idx_document_approvals_approver (approver_user_id),
    KEY idx_document_approvals_action (action),

    CONSTRAINT fk_document_approvals_document
        FOREIGN KEY (document_id)
        REFERENCES documents(document_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_document_approvals_approver
        FOREIGN KEY (approver_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- 4. INSERT DOCUMENT CATEGORIES
-- =========================================================

INSERT INTO document_categories
(
    category_code,
    category_name,
    description,
    entity_type,
    is_required
)
VALUES
(
    'STU_AADHAAR',
    'Aadhaar Card',
    'Student Aadhaar document',
    'STUDENT',
    1
),
(
    'STU_10TH',
    '10th Certificate',
    'Student 10th class certificate',
    'STUDENT',
    1
),
(
    'STU_TC',
    'Transfer Certificate',
    'Student transfer certificate',
    'STUDENT',
    1
),
(
    'STU_CASTE',
    'Caste Certificate',
    'Student caste certificate',
    'STUDENT',
    0
),
(
    'STU_INCOME',
    'Income Certificate',
    'Student income certificate',
    'STUDENT',
    0
),
(
    'FAC_EDU',
    'Educational Certificate',
    'Faculty educational qualification certificate',
    'FACULTY',
    1
),
(
    'FAC_EXP',
    'Experience Certificate',
    'Faculty previous experience certificate',
    'FACULTY',
    0
),
(
    'FAC_ID',
    'Identity Proof',
    'Faculty identity document',
    'FACULTY',
    1
);


-- =========================================================
-- 5. CHECK CREATED TABLES
-- =========================================================

SELECT * FROM document_categories;

SELECT * FROM documents;

SELECT * FROM document_approvals;