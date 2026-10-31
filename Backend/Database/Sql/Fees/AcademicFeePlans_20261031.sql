-- Run against the existing cms_btech database BEFORE deploying the updated backend.
-- MySQL 8.0.16+; no EF migrations and no existing rows are deleted or converted.
-- Idempotent CREATE TABLE statements. MySQL DDL commits automatically: take a backup first.
-- No USE statement: choose the intended schema in MySQL Workbench.

SET @afp_add_category = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
    AND table_name='studentadmissions' AND column_name='AcademicStudentCategory'),
  'SELECT 1', 'ALTER TABLE studentadmissions ADD COLUMN AcademicStudentCategory VARCHAR(100) NULL');
PREPARE afp_ddl FROM @afp_add_category;
EXECUTE afp_ddl;
DEALLOCATE PREPARE afp_ddl;

CREATE TABLE IF NOT EXISTS academic_fee_plans (
  fee_structure_id BIGINT NOT NULL,
  college_id BIGINT NOT NULL,
  plan_code VARCHAR(80) NOT NULL,
  plan_name VARCHAR(150) NOT NULL,
  academic_year_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  semester_id BIGINT NOT NULL,
  fee_category_id BIGINT NOT NULL,
  batch VARCHAR(50) NOT NULL,
  quota VARCHAR(100) NULL,
  student_category VARCHAR(100) NULL,
  cycle VARCHAR(20) NOT NULL,
  payment_mode VARCHAR(20) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  total_amount DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NOT NULL,
  due_date DATE NOT NULL,
  components_json JSON NOT NULL,
  installments_json JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  revision INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  previous_fee_structure_id BIGINT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY(fee_structure_id),
  UNIQUE KEY uq_afp_version(college_id,plan_code,version),
  UNIQUE KEY uq_afp_previous(previous_fee_structure_id),
  KEY ix_afp_picker(college_id,academic_year_id,course_id,branch_id,semester_id,status),
  CONSTRAINT fk_afp_structure FOREIGN KEY(fee_structure_id) REFERENCES fee_structures(fee_structure_id),
  CONSTRAINT fk_afp_college FOREIGN KEY(college_id) REFERENCES colleges(college_id),
  CONSTRAINT fk_afp_year FOREIGN KEY(academic_year_id) REFERENCES academicyears(academic_year_id),
  CONSTRAINT fk_afp_course FOREIGN KEY(course_id) REFERENCES courses(course_id),
  CONSTRAINT fk_afp_branch FOREIGN KEY(branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_afp_semester FOREIGN KEY(semester_id) REFERENCES semesters(semester_id),
  CONSTRAINT fk_afp_category FOREIGN KEY(fee_category_id) REFERENCES fee_categories(fee_category_id),
  CONSTRAINT fk_afp_previous FOREIGN KEY(previous_fee_structure_id) REFERENCES academic_fee_plans(fee_structure_id),
  CONSTRAINT ck_afp_total CHECK(total_amount>0),
  CONSTRAINT ck_afp_version CHECK(version>0 AND revision>0),
  CONSTRAINT ck_afp_dates CHECK(effective_to>=effective_from AND due_date BETWEEN effective_from AND effective_to),
  CONSTRAINT ck_afp_state CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','PUBLISHED','ARCHIVED')),
  CONSTRAINT ck_afp_cycle CHECK(cycle IN ('SEMESTER','ANNUAL','ONE_TIME')),
  CONSTRAINT ck_afp_payment CHECK(payment_mode IN ('FULL_PAYMENT','INSTALLMENTS')),
  CONSTRAINT ck_afp_arrays CHECK(JSON_TYPE(components_json)='ARRAY' AND JSON_TYPE(installments_json)='ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_fee_plan_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fee_structure_id BIGINT NOT NULL,
  college_id BIGINT NOT NULL,
  revision INT NOT NULL,
  action VARCHAR(30) NOT NULL,
  actor_id BIGINT NOT NULL,
  reason VARCHAR(500) NULL,
  snapshot_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_afpa_revision(fee_structure_id,revision),
  CONSTRAINT fk_afpa_plan FOREIGN KEY(fee_structure_id) REFERENCES academic_fee_plans(fee_structure_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_fee_plan_snapshots (
  admission_id BIGINT NOT NULL PRIMARY KEY,
  college_id BIGINT NOT NULL,
  fee_structure_id BIGINT NOT NULL,
  plan_version INT NOT NULL,
  snapshot_json JSON NOT NULL,
  assigned_by BIGINT NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_afps_admission FOREIGN KEY(admission_id) REFERENCES studentadmissions(AdmissionId),
  CONSTRAINT fk_afps_plan FOREIGN KEY(fee_structure_id) REFERENCES academic_fee_plans(fee_structure_id),
  KEY ix_afps_college(college_id,fee_structure_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_fee_plan_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admission_id BIGINT NOT NULL,
  college_id BIGINT NOT NULL,
  fee_structure_id BIGINT NOT NULL,
  plan_version INT NOT NULL,
  snapshot_json JSON NOT NULL,
  actor_id BIGINT NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_afpa_admission(admission_id,audit_id),
  CONSTRAINT fk_afpaa_admission FOREIGN KEY(admission_id) REFERENCES studentadmissions(AdmissionId),
  CONSTRAINT fk_afpaa_plan FOREIGN KEY(fee_structure_id) REFERENCES academic_fee_plans(fee_structure_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
