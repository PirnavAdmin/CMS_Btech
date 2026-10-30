-- ============================================================================
-- CMS BTECH - Schedules / Views / Exam Hall Allocation
-- Additive-only patch for the exam-management task.
--
-- Existing exam_schedules is intentionally NOT changed. The schedule table and
-- schedule CRUD APIs are already present in Ticket 172/173.
-- This patch adds only the missing exam-hall allocation table and read views.
-- ============================================================================

USE cms_btech;

-- --------------------------------------------------------------------------
-- 1) EXAM HALL ALLOCATIONS
-- One exam schedule can use multiple halls; a hall can be used only once for
-- overlapping exam schedules. Soft delete is used for audit/history.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_hall_allocations (
    exam_hall_allocation_id BIGINT NOT NULL AUTO_INCREMENT,
    exam_schedule_id BIGINT NOT NULL,
    classroom_id BIGINT NOT NULL,
    allocated_students INT NOT NULL DEFAULT 0,
    seat_start_number INT NULL,
    seat_end_number INT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (exam_hall_allocation_id),
    UNIQUE KEY uq_exam_hall_allocation_schedule_classroom
        (exam_schedule_id, classroom_id),
    KEY idx_exam_hall_allocations_schedule
        (exam_schedule_id, status, deleted_at),
    KEY idx_exam_hall_allocations_classroom
        (classroom_id, status, deleted_at),
    CONSTRAINT fk_exam_hall_allocations_schedule
        FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(exam_schedule_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_exam_hall_allocations_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_exam_hall_allocations_students
        CHECK (allocated_students >= 0),
    CONSTRAINT chk_exam_hall_allocations_seat_range
        CHECK (
            (seat_start_number IS NULL AND seat_end_number IS NULL)
            OR
            (seat_start_number IS NOT NULL AND seat_end_number IS NOT NULL
             AND seat_end_number >= seat_start_number)
        ),
    CONSTRAINT chk_exam_hall_allocations_status
        CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
-- 2) EXAM SCHEDULE DETAIL VIEW
-- Existing exam_schedules is exposed through a stable read model without
-- changing the existing schedule table/API implementation.
-- --------------------------------------------------------------------------
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

-- Verification
SHOW TABLES LIKE 'exam_hall_allocations';
SHOW FULL TABLES WHERE Tables_in_cms_btech LIKE 'vw_exam_%';
