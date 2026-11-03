-- ============================================================
-- CMS BTECH - Roles, Designations, Rooms/Classrooms Integration
-- Additive migration. Existing APIs/tables remain available.
-- Target: MySQL 8.x
-- ============================================================

USE cms_btech;

-- ============================================================
-- Helper procedures
-- ============================================================

DROP PROCEDURE IF EXISTS sp_admin_add_column;
DROP PROCEDURE IF EXISTS sp_admin_add_index;
DROP PROCEDURE IF EXISTS sp_admin_add_fk;

DELIMITER $$

CREATE PROCEDURE sp_admin_add_column(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND COLUMN_NAME = p_column
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', p_table,
            '` ADD COLUMN `', p_column,
            '` ', p_definition
        );

        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$


CREATE PROCEDURE sp_admin_add_index(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND INDEX_NAME = p_index
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', p_table,
            '` ADD ', p_definition
        );

        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$


CREATE PROCEDURE sp_admin_add_fk(
    IN p_table VARCHAR(64),
    IN p_constraint VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND CONSTRAINT_NAME = p_constraint
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', p_table,
            '` ADD CONSTRAINT `', p_constraint,
            '` ', p_definition
        );

        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- 1. Extend existing roles table
-- ============================================================

CALL sp_admin_add_column(
    'roles',
    'category',
    'VARCHAR(30) NULL'
);

CALL sp_admin_add_column(
    'roles',
    'hierarchy_level',
    'VARCHAR(80) NULL'
);

CALL sp_admin_add_column(
    'roles',
    'is_system',
    'TINYINT(1) NOT NULL DEFAULT 0'
);


UPDATE roles
SET
    is_system = 1,

    category = CASE role_code
        WHEN 'SUPER_ADMIN'   THEN 'System'
        WHEN 'COLLEGE_ADMIN' THEN 'Administrative'
        WHEN 'PRINCIPAL'     THEN 'Academic'
        WHEN 'HOD'           THEN 'Academic'
        WHEN 'FACULTY'       THEN 'Academic'
        WHEN 'STUDENT'       THEN 'Student'
        ELSE COALESCE(category, 'Administrative')
    END,

    hierarchy_level = CASE role_code
        WHEN 'SUPER_ADMIN'
            THEN 'Level 1 (Highest Privileges)'

        WHEN 'COLLEGE_ADMIN'
            THEN 'Level 2 (Executive Leadership)'

        WHEN 'PRINCIPAL'
            THEN 'Level 2 (Executive Leadership)'

        WHEN 'HOD'
            THEN 'Level 3 (Department Leadership)'

        WHEN 'FACULTY'
            THEN 'Level 4 (Academic Staff)'

        WHEN 'STUDENT'
            THEN 'Level 5 (End User)'

        ELSE COALESCE(
            hierarchy_level,
            'Level 4 (Administrative Staff)'
        )
    END

WHERE role_code IN (
    'SUPER_ADMIN',
    'COLLEGE_ADMIN',
    'PRINCIPAL',
    'HOD',
    'FACULTY',
    'STUDENT'
);


-- ============================================================
-- 2. Role permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id BIGINT NOT NULL AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    module_key VARCHAR(80) NOT NULL,

    can_view TINYINT(1) NOT NULL DEFAULT 0,
    can_create TINYINT(1) NOT NULL DEFAULT 0,
    can_edit TINYINT(1) NOT NULL DEFAULT 0,
    can_delete TINYINT(1) NOT NULL DEFAULT 0,
    can_export TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,

    updated_at DATETIME NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,

    PRIMARY KEY (role_permission_id),

    UNIQUE KEY uq_role_permissions_role_module (
        role_id,
        module_key
    ),

    KEY idx_role_permissions_role (role_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. Designations master
-- ============================================================

CREATE TABLE IF NOT EXISTS designations (
    designation_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,

    title VARCHAR(150) NOT NULL,
    code VARCHAR(60) NOT NULL,
    category VARCHAR(30) NOT NULL,
    hierarchy_level VARCHAR(80) NOT NULL,

    department_scope VARCHAR(150) NULL,
    default_role_id BIGINT NULL,

    status TINYINT NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,

    updated_at DATETIME NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,

    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,

    PRIMARY KEY (designation_id),

    UNIQUE KEY uq_designation_college_code (
        college_id,
        code
    ),

    KEY idx_designation_college_status (
        college_id,
        status,
        deleted_at
    ),

    KEY idx_designation_default_role (
        default_role_id
    ),

    CONSTRAINT fk_designation_college
        FOREIGN KEY (college_id)
        REFERENCES colleges(college_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_designation_default_role
        FOREIGN KEY (default_role_id)
        REFERENCES roles(role_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. Staff access profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_access_profiles (
    staff_access_profile_id BIGINT NOT NULL AUTO_INCREMENT,
    employee_profile_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,

    access_scope VARCHAR(40)
        NOT NULL
        DEFAULT 'Department-scoped',

    status TINYINT NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,

    updated_at DATETIME NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,

    PRIMARY KEY (staff_access_profile_id),

    UNIQUE KEY uq_staff_access_employee (
        employee_profile_id
    ),

    KEY idx_staff_access_role (
        role_id
    ),

    KEY idx_staff_access_designation (
        designation_id
    ),

    CONSTRAINT fk_staff_access_employee
        FOREIGN KEY (employee_profile_id)
        REFERENCES employee_profiles(employee_profile_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_staff_access_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_staff_access_designation
        FOREIGN KEY (designation_id)
        REFERENCES designations(designation_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. Extend existing classrooms table
-- ============================================================

CALL sp_admin_add_column(
    'classrooms',
    'building_block',
    'VARCHAR(120) NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'floor_name',
    'VARCHAR(50) NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'facilities_json',
    'JSON NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'department_name',
    'VARCHAR(150) NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'availability_status',
    'VARCHAR(20) NOT NULL DEFAULT ''AVAILABLE'''
);

CALL sp_admin_add_column(
    'classrooms',
    'allocated_section_id',
    'BIGINT NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'description',
    'VARCHAR(1000) NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'deleted_at',
    'DATETIME NULL'
);

CALL sp_admin_add_column(
    'classrooms',
    'deleted_by',
    'BIGINT NULL'
);


-- ============================================================
-- 6. Classroom indexes / foreign key
-- ============================================================

CALL sp_admin_add_index(
    'classrooms',
    'uq_classrooms_allocated_section',
    'UNIQUE KEY `uq_classrooms_allocated_section` (`allocated_section_id`)'
);

CALL sp_admin_add_index(
    'classrooms',
    'idx_classrooms_directory_filters',
    'KEY `idx_classrooms_directory_filters`
        (`college_id`,`availability_status`,`room_type`,`building_block`)'
);

CALL sp_admin_add_fk(
    'classrooms',
    'fk_classrooms_allocated_section',
    'FOREIGN KEY (`allocated_section_id`)
        REFERENCES `sections` (`section_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE'
);


-- ============================================================
-- 7. Normalize existing classroom data
-- ============================================================

UPDATE classrooms
SET
    availability_status =
        CASE
            WHEN status = 1 THEN
                COALESCE(
                    NULLIF(availability_status, ''),
                    'AVAILABLE'
                )
            ELSE 'INACTIVE'
        END,

    department_name =
        COALESCE(
            NULLIF(department_name, ''),
            'General / Shared'
        )

WHERE deleted_at IS NULL;


-- ============================================================
-- 8. Cleanup helper procedures
-- ============================================================

DROP PROCEDURE IF EXISTS sp_admin_add_column;
DROP PROCEDURE IF EXISTS sp_admin_add_index;
DROP PROCEDURE IF EXISTS sp_admin_add_fk;


-- ============================================================
-- 9. Verification
-- ============================================================

SELECT
    role_id,
    role_name,
    role_code,
    category,
    hierarchy_level,
    is_system,
    status
FROM roles
ORDER BY role_id;


SELECT
    COUNT(*) AS designation_count
FROM designations;


SELECT
    classroom_id,
    classroom_code,
    classroom_name,
    building_block,
    floor_name,
    availability_status,
    allocated_section_id
FROM classrooms
ORDER BY classroom_id;


SHOW TABLES LIKE 'role_permissions';
SHOW TABLES LIKE 'designations';
SHOW TABLES LIKE 'staff_access_profiles';

DESCRIBE role_permissions;
DESCRIBE designations;
DESCRIBE staff_access_profiles;
DESCRIBE classrooms;
