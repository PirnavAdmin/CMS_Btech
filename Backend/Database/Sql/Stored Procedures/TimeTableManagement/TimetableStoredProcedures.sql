-- ============================================================
-- TIMETABLE STORED PROCEDURES
-- DB: cms_btech
-- Execute after the timetable tables in the 27-Sep-2026 dump exist.
-- No DROP/DELETE/TRUNCATE is used by this script.
-- ============================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_tt_period_list$$
CREATE PROCEDURE sp_tt_period_list(IN p_academic_year_id BIGINT)
BEGIN
  SELECT period_configuration_id AS PeriodId, academic_year_id AS AcademicYearId,
         period_number AS PeriodNumber, period_name AS Name, start_time AS StartTime,
         end_time AS EndTime, period_type AS Type, display_order AS DisplayOrder,
         status AS Active
  FROM timetable_period_configurations
  WHERE academic_year_id=p_academic_year_id
  ORDER BY display_order,start_time;
END$$

DROP PROCEDURE IF EXISTS sp_tt_period_create$$
CREATE PROCEDURE sp_tt_period_create(
 IN p_academic_year_id BIGINT, IN p_period_number INT, IN p_period_name VARCHAR(100),
 IN p_start_time TIME, IN p_end_time TIME, IN p_period_type VARCHAR(20),
 IN p_display_order INT, IN p_status TINYINT, IN p_actor_id BIGINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM academicyears WHERE academic_year_id=p_academic_year_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Academic year not found.';
 END IF;
 IF p_end_time<=p_start_time THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='EndTime must be greater than StartTime.';
 END IF;
 IF p_period_type NOT IN ('CLASS','BREAK','LUNCH') THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid period type.';
 END IF;
 IF EXISTS (SELECT 1 FROM timetable_period_configurations
            WHERE academic_year_id=p_academic_year_id AND display_order=p_display_order) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Display order already exists for this academic year.';
 END IF;
 INSERT INTO timetable_period_configurations
 (academic_year_id,period_number,period_name,start_time,end_time,period_type,display_order,status,created_by,updated_by)
 VALUES(p_academic_year_id,p_period_number,TRIM(p_period_name),p_start_time,p_end_time,
        UPPER(p_period_type),p_display_order,p_status,p_actor_id,p_actor_id);
 SELECT LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_tt_period_update$$
CREATE PROCEDURE sp_tt_period_update(
 IN p_period_id BIGINT, IN p_academic_year_id BIGINT, IN p_period_number INT,
 IN p_period_name VARCHAR(100), IN p_start_time TIME, IN p_end_time TIME,
 IN p_period_type VARCHAR(20), IN p_display_order INT, IN p_status TINYINT, IN p_actor_id BIGINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM timetable_period_configurations WHERE period_configuration_id=p_period_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Period configuration not found.';
 END IF;
 IF p_end_time<=p_start_time THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='EndTime must be greater than StartTime.'; END IF;
 IF EXISTS (SELECT 1 FROM timetable_period_configurations
            WHERE academic_year_id=p_academic_year_id AND display_order=p_display_order
              AND period_configuration_id<>p_period_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Display order already exists for this academic year.';
 END IF;
 UPDATE timetable_period_configurations
 SET academic_year_id=p_academic_year_id,period_number=p_period_number,period_name=TRIM(p_period_name),
     start_time=p_start_time,end_time=p_end_time,period_type=UPPER(p_period_type),
     display_order=p_display_order,status=p_status,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE period_configuration_id=p_period_id;
END$$

DROP PROCEDURE IF EXISTS sp_tt_period_delete$$
CREATE PROCEDURE sp_tt_period_delete(IN p_period_id BIGINT, IN p_actor_id BIGINT)
BEGIN
 UPDATE timetable_period_configurations
 SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE period_configuration_id=p_period_id;
 IF ROW_COUNT()=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Period configuration not found.'; END IF;
END$$

DROP PROCEDURE IF EXISTS sp_tt_period_reorder$$
CREATE PROCEDURE sp_tt_period_reorder(
 IN p_academic_year_id BIGINT, IN p_period_ids_json JSON, IN p_actor_id BIGINT)
BEGIN
 DECLARE v_i INT DEFAULT 0;
 DECLARE v_n INT DEFAULT JSON_LENGTH(p_period_ids_json);
 DECLARE v_id BIGINT;
 UPDATE timetable_period_configurations
 SET display_order=100000+display_order,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE academic_year_id=p_academic_year_id AND status=1;
 WHILE v_i<v_n DO
   SET v_id=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_period_ids_json,CONCAT('$[',v_i,']'))) AS UNSIGNED);
   UPDATE timetable_period_configurations
   SET display_order=v_i+1,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
   WHERE period_configuration_id=v_id AND academic_year_id=p_academic_year_id;
   SET v_i=v_i+1;
 END WHILE;
END$$


DROP PROCEDURE IF EXISTS sp_tt_period_generate_automatic$$
CREATE PROCEDURE sp_tt_period_generate_automatic(
 IN p_academic_year_id BIGINT, IN p_start_time TIME, IN p_end_time TIME,
 IN p_duration_minutes INT, IN p_working_days_json JSON, IN p_breaks_json JSON, IN p_actor_id BIGINT)
BEGIN
 DECLARE v_time TIME DEFAULT p_start_time;
 DECLARE v_order INT DEFAULT 0;
 DECLARE v_period INT DEFAULT 0;
 DECLARE v_break_count INT DEFAULT 0;
 DECLARE v_break_after INT DEFAULT 0;
 DECLARE v_break_duration INT DEFAULT 0;
 DECLARE v_break_type VARCHAR(20);
 DECLARE v_break_name VARCHAR(100);

 IF NOT EXISTS (SELECT 1 FROM academicyears WHERE academic_year_id=p_academic_year_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Academic year not found.';
 END IF;
 IF p_duration_minutes<=0 OR p_end_time<=p_start_time THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid automatic period configuration.';
 END IF;

 UPDATE academic_working_days
 SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE academic_year_id=p_academic_year_id AND status<>0;

 INSERT INTO academic_working_days
 (academic_year_id,day_of_week,status,created_by,updated_by)
 SELECT p_academic_year_id,UPPER(TRIM(x.day_name)),1,p_actor_id,p_actor_id
 FROM JSON_TABLE(
   COALESCE(p_working_days_json,JSON_ARRAY()),
   '$[*]' COLUMNS(day_name VARCHAR(20) PATH '$')
 ) x
 ON DUPLICATE KEY UPDATE
   status=1,updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;

 UPDATE timetable_period_configurations
 SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE academic_year_id=p_academic_year_id AND status<>0;

 WHILE ADDTIME(v_time,SEC_TO_TIME(p_duration_minutes*60))<=p_end_time DO
   SET v_period=v_period+1;
   SET v_order=v_order+1;
   INSERT INTO timetable_period_configurations
   (academic_year_id,period_number,period_name,start_time,end_time,period_type,display_order,status,created_by,updated_by)
   VALUES(p_academic_year_id,v_period,CONCAT('Period ',v_period),v_time,
          ADDTIME(v_time,SEC_TO_TIME(p_duration_minutes*60)),'CLASS',v_order,1,p_actor_id,p_actor_id);
   SET v_time=ADDTIME(v_time,SEC_TO_TIME(p_duration_minutes*60));

   SELECT COUNT(*) INTO v_break_count
   FROM JSON_TABLE(COALESCE(p_breaks_json,JSON_ARRAY()),'$[*]'
        COLUMNS(after_period INT PATH '$.AfterPeriod')) b
   WHERE b.after_period=v_period;

   IF v_break_count>0 THEN
     SELECT b.type,b.duration_minutes,COALESCE(b.name,CONCAT(b.type,' after Period ',v_period))
     INTO v_break_type,v_break_duration,v_break_name
     FROM JSON_TABLE(COALESCE(p_breaks_json,JSON_ARRAY()),'$[*]'
          COLUMNS(
            type VARCHAR(20) PATH '$.Type',
            after_period INT PATH '$.AfterPeriod',
            duration_minutes INT PATH '$.DurationMinutes',
            name VARCHAR(100) PATH '$.Name'
          )) b
     WHERE b.after_period=v_period LIMIT 1;

     SET v_order=v_order+1;
     INSERT INTO timetable_period_configurations
     (academic_year_id,period_number,period_name,start_time,end_time,period_type,display_order,status,created_by,updated_by)
     VALUES(p_academic_year_id,NULL,v_break_name,v_time,
            ADDTIME(v_time,SEC_TO_TIME(v_break_duration*60)),UPPER(v_break_type),
            v_order,1,p_actor_id,p_actor_id);
     SET v_time=ADDTIME(v_time,SEC_TO_TIME(v_break_duration*60));
   END IF;
 END WHILE;

 SELECT period_configuration_id AS PeriodId,academic_year_id AS AcademicYearId,
        period_number AS PeriodNumber,period_name AS Name,start_time AS StartTime,
        end_time AS EndTime,period_type AS Type,display_order AS DisplayOrder,status AS Active
 FROM timetable_period_configurations
 WHERE academic_year_id=p_academic_year_id AND status=1
 ORDER BY display_order,start_time;
END$$


DROP PROCEDURE IF EXISTS sp_tt_calendar_get$$
CREATE PROCEDURE sp_tt_calendar_get(IN p_academic_year_id BIGINT)
BEGIN
 SELECT ay.academic_year_id AS AcademicYearId,ay.start_date AS AcademicYearStartDate,
        ay.end_date AS AcademicYearEndDate,COALESCE(acs.reviewed,0) AS Reviewed
 FROM academicyears ay
 LEFT JOIN academic_calendar_settings acs ON acs.academic_year_id=ay.academic_year_id
 WHERE ay.academic_year_id=p_academic_year_id;
 SELECT day_of_week FROM academic_working_days
 WHERE academic_year_id=p_academic_year_id AND status=1 ORDER BY FIELD(day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
 SELECT academic_calendar_day_id AS CalendarDayId,calendar_date AS Date,day_type AS Type,description AS Description
 FROM academic_calendar_days WHERE academic_year_id=p_academic_year_id AND status=1 ORDER BY calendar_date;
END$$

DROP PROCEDURE IF EXISTS sp_tt_calendar_save$$
CREATE PROCEDURE sp_tt_calendar_save(
 IN p_academic_year_id BIGINT,IN p_reviewed TINYINT,
 IN p_working_days_json JSON,IN p_holidays_json JSON,IN p_actor_id BIGINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM academicyears WHERE academic_year_id=p_academic_year_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Academic year not found.';
 END IF;

 INSERT INTO academic_calendar_settings(academic_year_id,reviewed,created_by,updated_by)
 VALUES(p_academic_year_id,p_reviewed,p_actor_id,p_actor_id)
 ON DUPLICATE KEY UPDATE reviewed=VALUES(reviewed),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;

 UPDATE academic_working_days SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE academic_year_id=p_academic_year_id AND status<>0;

 INSERT INTO academic_working_days(academic_year_id,day_of_week,status,created_by,updated_by)
 SELECT p_academic_year_id,UPPER(TRIM(x.day_name)),1,p_actor_id,p_actor_id
 FROM JSON_TABLE(COALESCE(p_working_days_json,JSON_ARRAY()),'$[*]' COLUMNS(day_name VARCHAR(20) PATH '$')) x
 ON DUPLICATE KEY UPDATE status=1,updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;

 INSERT INTO academic_calendar_days
 (academic_year_id,calendar_date,day_type,description,status,created_by,updated_by)
 SELECT p_academic_year_id,x.calendar_date,UPPER(x.day_type),x.description,1,p_actor_id,p_actor_id
 FROM JSON_TABLE(COALESCE(p_holidays_json,JSON_ARRAY()),'$[*]' COLUMNS(
   calendar_date DATE PATH '$.Date',day_type VARCHAR(30) PATH '$.Type',description VARCHAR(255) PATH '$.Description'
 )) x
 ON DUPLICATE KEY UPDATE day_type=VALUES(day_type),description=VALUES(description),
   status=1,updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;
END$$

DROP PROCEDURE IF EXISTS sp_tt_classroom_list$$
CREATE PROCEDURE sp_tt_classroom_list(IN p_college_id BIGINT,IN p_active_only TINYINT)
BEGIN
 SELECT classroom_id AS ClassroomId,college_id AS CollegeId,classroom_code AS ClassroomCode,
        classroom_name AS ClassroomName,room_type AS RoomType,capacity AS Capacity,status AS Active
 FROM classrooms
 WHERE (p_college_id IS NULL OR college_id=p_college_id)
   AND (p_active_only=0 OR status=1)
 ORDER BY classroom_name,classroom_code;
END$$

DROP PROCEDURE IF EXISTS sp_tt_classroom_create$$
CREATE PROCEDURE sp_tt_classroom_create(
 IN p_college_id BIGINT,IN p_classroom_code VARCHAR(50),IN p_classroom_name VARCHAR(100),
 IN p_room_type VARCHAR(30),IN p_capacity INT,IN p_status TINYINT,IN p_actor_id BIGINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM colleges WHERE college_id=p_college_id AND status=1) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='College not found or inactive.';
 END IF;
 INSERT INTO classrooms(college_id,classroom_code,classroom_name,room_type,capacity,status,created_by,updated_by)
 VALUES(p_college_id,TRIM(p_classroom_code),TRIM(p_classroom_name),NULLIF(TRIM(p_room_type),''),
        p_capacity,p_status,p_actor_id,p_actor_id);
 SELECT LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_tt_classroom_update$$
CREATE PROCEDURE sp_tt_classroom_update(
 IN p_classroom_id BIGINT,IN p_college_id BIGINT,IN p_classroom_code VARCHAR(50),
 IN p_classroom_name VARCHAR(100),IN p_room_type VARCHAR(30),IN p_capacity INT,
 IN p_status TINYINT,IN p_actor_id BIGINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM classrooms WHERE classroom_id=p_classroom_id AND college_id=p_college_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Classroom not found for this college.';
 END IF;
 UPDATE classrooms SET classroom_code=TRIM(p_classroom_code),classroom_name=TRIM(p_classroom_name),
   room_type=NULLIF(TRIM(p_room_type),''),capacity=p_capacity,status=p_status,
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE classroom_id=p_classroom_id;
END$$


DROP PROCEDURE IF EXISTS sp_tt_timetable_list$$
CREATE PROCEDURE sp_tt_timetable_list(
 IN p_academic_year_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,
 IN p_section_id BIGINT,IN p_status VARCHAR(30),IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,COALESCE(c.course_name,'') AS CourseName,
        t.branch_id AS BranchId,COALESCE(b.branch_name,'') AS BranchName,
        t.semester_id AS SemesterId,COALESCE(sem.semester_name,'') AS SemesterName,
        t.section_id AS SectionId,s.section_name AS SectionName,s.capacity AS SectionCapacity,
        s.college_id AS CollegeId,t.timetable_name AS TimetableName,t.status AS Status,
        t.effective_from AS EffectiveFrom,t.effective_to AS EffectiveTo,t.published_at AS PublishedAt,
        t.revision AS Revision
 FROM timetables t
 JOIN sections s ON s.section_id=t.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id
 LEFT JOIN courses c ON c.course_id=t.course_id
 LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id
 WHERE (p_academic_year_id IS NULL OR t.academic_year_id=p_academic_year_id)
   AND (p_course_id IS NULL OR t.course_id=p_course_id)
   AND (p_branch_id IS NULL OR t.branch_id=p_branch_id)
   AND (p_semester_id IS NULL OR t.semester_id=p_semester_id)
   AND (p_section_id IS NULL OR t.section_id=p_section_id)
   AND (p_status IS NULL OR UPPER(t.status)=UPPER(p_status))
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY t.academic_year_id DESC,t.semester_id,t.section_id,t.timetable_id DESC;
END$$

DROP PROCEDURE IF EXISTS sp_tt_timetable_detail$$
CREATE PROCEDURE sp_tt_timetable_detail(IN p_timetable_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,COALESCE(c.course_name,'') AS CourseName,
        t.branch_id AS BranchId,COALESCE(b.branch_name,'') AS BranchName,
        t.semester_id AS SemesterId,COALESCE(sem.semester_name,'') AS SemesterName,
        t.section_id AS SectionId,s.section_name AS SectionName,s.capacity AS SectionCapacity,
        s.college_id AS CollegeId,t.timetable_name AS TimetableName,t.status AS Status,
        t.effective_from AS EffectiveFrom,t.effective_to AS EffectiveTo,t.published_at AS PublishedAt,
        t.revision AS Revision
 FROM timetables t JOIN sections s ON s.section_id=t.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id
 LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id
 WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id);

 SELECT timetable_slot_id AS TimetableSlotId,slot_number AS SlotNumber,slot_name AS SlotName,
        start_time AS StartTime,end_time AS EndTime,status AS Active
 FROM timetable_slots WHERE timetable_id=p_timetable_id AND status=1 ORDER BY slot_number;

 SELECT r.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        su.subject_type AS SubjectType,r.periods_per_week AS PeriodsPerWeek,r.block_size AS BlockSize,
        'CONFIGURED' AS Source
 FROM timetable_subject_requirements r JOIN subjects su ON su.subject_id=r.subject_id
 WHERE r.timetable_id=p_timetable_id AND r.status=1 ORDER BY su.subject_name;

 SELECT e.timetable_entry_id AS TimetableEntryId,e.timetable_id AS TimetableId,e.timetable_slot_id AS TimetableSlotId,
        ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,
        e.day_of_week AS DayOfWeek,e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.section_id AS SectionId,s.section_name AS SectionName,e.classroom_id AS ClassroomId,
        cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,
        COALESCE(cr.classroom_name,e.classroom) AS Classroom,e.entry_type AS EntryType,
        e.generated_source AS GeneratedSource,e.schedule_group_key AS ScheduleGroupKey,e.status AS Active
 FROM timetable_entries e
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN sections s ON s.section_id=e.section_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.timetable_id=p_timetable_id AND e.status=1 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_timetable_create$$
CREATE PROCEDURE sp_tt_timetable_create(
 IN p_academic_year_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_section_id BIGINT,
 IN p_timetable_name VARCHAR(150),IN p_effective_from DATE,IN p_effective_to DATE,
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_section_college BIGINT;
 SELECT college_id INTO v_section_college FROM sections WHERE section_id=p_section_id AND status=1 AND is_archived=0;
 IF v_section_college IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section not found or inactive.'; END IF;
 IF p_is_super_admin=0 AND v_section_college<>p_college_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section does not belong to your college.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM academicyears WHERE academic_year_id=p_academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Academic year not found.'; END IF;
 IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to<p_effective_from THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='EffectiveTo cannot be earlier than EffectiveFrom.'; END IF;
 INSERT INTO timetables(academic_year_id,course_id,branch_id,semester_id,section_id,timetable_name,status,effective_from,effective_to,created_by,updated_by)
 VALUES(p_academic_year_id,p_course_id,p_branch_id,p_semester_id,p_section_id,TRIM(p_timetable_name),'DRAFT',
        p_effective_from,p_effective_to,p_actor_id,p_actor_id);
 SELECT LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_tt_timetable_update$$
CREATE PROCEDURE sp_tt_timetable_update(
 IN p_timetable_id BIGINT,IN p_timetable_name VARCHAR(150),IN p_effective_from DATE,IN p_effective_to DATE,
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
   WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;
 UPDATE timetables SET timetable_name=TRIM(p_timetable_name),effective_from=p_effective_from,effective_to=p_effective_to,
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1
 WHERE timetable_id=p_timetable_id;
END$$


DROP PROCEDURE IF EXISTS sp_tt_slots_sync$$
CREATE PROCEDURE sp_tt_slots_sync(IN p_timetable_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE done INT DEFAULT 0;
 DECLARE v_id BIGINT; DECLARE v_num INT; DECLARE v_name VARCHAR(100); DECLARE v_start TIME; DECLARE v_end TIME; DECLARE v_order INT;
 DECLARE cur CURSOR FOR
   SELECT period_configuration_id,COALESCE(period_number,display_order),period_name,start_time,end_time,display_order
   FROM timetable_period_configurations
   WHERE academic_year_id=(SELECT academic_year_id FROM timetables WHERE timetable_id=p_timetable_id)
     AND status=1 AND period_type='CLASS' ORDER BY display_order,start_time;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

 IF NOT EXISTS (SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
                WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;

 IF EXISTS (SELECT 1 FROM timetable_entries WHERE timetable_id=p_timetable_id AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Remove active timetable entries before synchronizing slots.'; END IF;

 UPDATE timetable_slots SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE timetable_id=p_timetable_id;

 OPEN cur;
 read_loop: LOOP
   FETCH cur INTO v_id,v_num,v_name,v_start,v_end,v_order;
   IF done=1 THEN LEAVE read_loop; END IF;
   INSERT INTO timetable_slots(timetable_id,slot_number,slot_name,start_time,end_time,status,created_by,updated_by)
   VALUES(p_timetable_id,v_num,v_name,v_start,v_end,1,p_actor_id,p_actor_id)
   ON DUPLICATE KEY UPDATE slot_name=VALUES(slot_name),start_time=VALUES(start_time),end_time=VALUES(end_time),
     status=1,updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;
 END LOOP;
 CLOSE cur;

 SELECT timetable_slot_id AS TimetableSlotId,slot_number AS SlotNumber,slot_name AS SlotName,
        start_time AS StartTime,end_time AS EndTime,status AS Active
 FROM timetable_slots WHERE timetable_id=p_timetable_id AND status=1 ORDER BY slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_requirements_get$$
CREATE PROCEDURE sp_tt_requirements_get(IN p_timetable_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
                WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;

 SELECT r.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        su.subject_type AS SubjectType,r.periods_per_week AS PeriodsPerWeek,r.block_size AS BlockSize,
        'CONFIGURED' AS Source
 FROM timetable_subject_requirements r JOIN subjects su ON su.subject_id=r.subject_id
 WHERE r.timetable_id=p_timetable_id AND r.status=1 ORDER BY su.subject_name;

 SELECT fsa.subject_id AS SubjectId,fsa.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,
        f.faculty_name AS FacultyName,SUM(fsa.periods_per_week) AS AllocatedPeriodsPerWeek
 FROM faculty_subject_allocations fsa
 JOIN faculty f ON f.faculty_id=fsa.faculty_id
 JOIN timetables t ON t.timetable_id=p_timetable_id
 WHERE fsa.status=1 AND f.status=1 AND fsa.deleted_at IS NULL
   AND fsa.subject_id IS NOT NULL AND fsa.subject_id IN
       (SELECT subject_id FROM timetable_subject_requirements WHERE timetable_id=p_timetable_id AND status=1)
   AND fsa.branch_id=t.branch_id AND fsa.semester_id=t.semester_id
   AND (fsa.course_id IS NULL OR fsa.course_id=t.course_id)
   AND (fsa.section_id IS NULL OR fsa.section_id=t.section_id)
   AND (fsa.academic_year_id IS NULL OR fsa.academic_year_id=t.academic_year_id)
 GROUP BY fsa.subject_id,fsa.faculty_id,f.faculty_code,f.faculty_name;
END$$

DROP PROCEDURE IF EXISTS sp_tt_requirements_save$$
CREATE PROCEDURE sp_tt_requirements_save(
 IN p_timetable_id BIGINT,IN p_requirements_json JSON,IN p_actor_id BIGINT,
 IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
                WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;

 UPDATE timetable_subject_requirements SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE timetable_id=p_timetable_id AND status<>0;

 INSERT INTO timetable_subject_requirements(timetable_id,subject_id,periods_per_week,block_size,status,created_by,updated_by)
 SELECT p_timetable_id,x.subject_id,x.periods_per_week,x.block_size,1,p_actor_id,p_actor_id
 FROM JSON_TABLE(COALESCE(p_requirements_json,JSON_ARRAY()),'$[*]' COLUMNS(
   subject_id BIGINT PATH '$.SubjectId',
   periods_per_week INT PATH '$.PeriodsPerWeek',
   block_size INT PATH '$.BlockSize'
 )) x
 ON DUPLICATE KEY UPDATE periods_per_week=VALUES(periods_per_week),block_size=VALUES(block_size),
   status=1,updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP;

 CALL sp_tt_requirements_get(p_timetable_id,p_college_id,p_is_super_admin);
END$$


DROP PROCEDURE IF EXISTS sp_tt_generate$$
CREATE PROCEDURE sp_tt_generate(
 IN p_timetable_id BIGINT,IN p_replace_generated TINYINT,IN p_missing_only TINYINT,
 IN p_classroom_ids_json JSON,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
main: BEGIN
 DECLARE done INT DEFAULT 0;
 DECLARE v_subject BIGINT; DECLARE v_periods INT; DECLARE v_block INT; DECLARE v_name VARCHAR(255);
 DECLARE v_existing INT; DECLARE v_target INT; DECLARE v_done INT;
 DECLARE v_day VARCHAR(20); DECLARE v_slot BIGINT; DECLARE v_faculty BIGINT; DECLARE v_room BIGINT; DECLARE v_candidate_count INT DEFAULT 0;
 DECLARE v_rooms INT; DECLARE v_scheduled INT DEFAULT 0; DECLARE v_added INT DEFAULT 0;
 DECLARE cur CURSOR FOR
   SELECT r.subject_id,r.periods_per_week,r.block_size,su.subject_name
   FROM timetable_subject_requirements r JOIN subjects su ON su.subject_id=r.subject_id
   WHERE r.timetable_id=p_timetable_id AND r.status=1 ORDER BY r.subject_id;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;

 IF NOT EXISTS (SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
                WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;

 IF NOT EXISTS (SELECT 1 FROM timetable_slots WHERE timetable_id=p_timetable_id AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synchronize timetable slots before generation.'; END IF;

 CREATE TEMPORARY TABLE IF NOT EXISTS tmp_tt_rooms(classroom_id BIGINT PRIMARY KEY);
 TRUNCATE TABLE tmp_tt_rooms;
 INSERT IGNORE INTO tmp_tt_rooms(classroom_id)
 SELECT CAST(j.classroom_id AS UNSIGNED)
 FROM JSON_TABLE(COALESCE(p_classroom_ids_json,JSON_ARRAY()),'$[*]'
      COLUMNS(classroom_id BIGINT PATH '$')) j
 JOIN classrooms c ON c.classroom_id=j.classroom_id AND c.status=1
 JOIN sections s ON s.section_id=(SELECT section_id FROM timetables WHERE timetable_id=p_timetable_id)
 WHERE c.college_id=s.college_id;
 SELECT COUNT(*) INTO v_rooms FROM tmp_tt_rooms;

 IF p_replace_generated=1 THEN
   UPDATE timetable_entries SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
   WHERE timetable_id=p_timetable_id AND status=1 AND generated_source='GENERATED';
 END IF;

 CREATE TEMPORARY TABLE IF NOT EXISTS tmp_tt_unscheduled(
   subject_id BIGINT,subject_name VARCHAR(255),reason_code VARCHAR(50),message VARCHAR(500)
 );
 TRUNCATE TABLE tmp_tt_unscheduled;

 OPEN cur;
 req_loop: LOOP
   FETCH cur INTO v_subject,v_periods,v_block,v_name;
   IF done=1 THEN LEAVE req_loop; END IF;

   SELECT COUNT(*) INTO v_existing FROM timetable_entries
   WHERE timetable_id=p_timetable_id AND subject_id=v_subject AND status=1;
   IF p_missing_only=1 OR p_replace_generated=0 THEN
      SET v_target=GREATEST(v_periods-v_existing,0);
   ELSE
      SET v_target=v_periods;
   END IF;
   SET v_done=0;

   slot_loop: WHILE v_done<v_target DO
     DROP TEMPORARY TABLE IF EXISTS tmp_tt_candidate;
     CREATE TEMPORARY TABLE tmp_tt_candidate(
       day_of_week VARCHAR(20),slot_id BIGINT,faculty_id BIGINT,classroom_id BIGINT
     );

     IF v_rooms>0 THEN
       INSERT INTO tmp_tt_candidate(day_of_week,slot_id,faculty_id,classroom_id)
       SELECT w.day_of_week,ts.timetable_slot_id,fsa.faculty_id,c.classroom_id
       FROM academic_working_days w
       JOIN timetable_slots ts ON ts.timetable_id=p_timetable_id AND ts.status=1
       JOIN timetables t ON t.timetable_id=p_timetable_id
       JOIN faculty_subject_allocations fsa
         ON fsa.subject_id=v_subject AND fsa.branch_id=t.branch_id AND fsa.semester_id=t.semester_id
        AND (fsa.course_id IS NULL OR fsa.course_id=t.course_id)
        AND (fsa.section_id IS NULL OR fsa.section_id=t.section_id)
        AND (fsa.academic_year_id IS NULL OR fsa.academic_year_id=t.academic_year_id)
        AND fsa.status=1 AND fsa.deleted_at IS NULL
       JOIN faculty f ON f.faculty_id=fsa.faculty_id AND f.status=1
       JOIN tmp_tt_rooms r ON 1=1 JOIN classrooms c ON c.classroom_id=r.classroom_id
       WHERE w.academic_year_id=t.academic_year_id AND w.status=1
         AND NOT EXISTS (
           SELECT 1 FROM timetable_entries e JOIN timetable_slots x ON x.timetable_slot_id=e.timetable_slot_id
           JOIN timetables ot ON ot.timetable_id=e.timetable_id
           WHERE e.status=1 AND e.day_of_week=w.day_of_week AND x.start_time<ts.end_time AND x.end_time>ts.start_time
             AND (e.faculty_id=fsa.faculty_id OR e.section_id=t.section_id OR e.classroom_id=c.classroom_id)
             AND COALESCE(ot.effective_from,'1000-01-01')<=COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ot.effective_to,'9999-12-31')>=COALESCE(t.effective_from,'1000-01-01')
         )
       ORDER BY FIELD(w.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number,c.classroom_id
       LIMIT 1;
     ELSE
       INSERT INTO tmp_tt_candidate(day_of_week,slot_id,faculty_id,classroom_id)
       SELECT w.day_of_week,ts.timetable_slot_id,fsa.faculty_id,NULL
       FROM academic_working_days w
       JOIN timetable_slots ts ON ts.timetable_id=p_timetable_id AND ts.status=1
       JOIN timetables t ON t.timetable_id=p_timetable_id
       JOIN faculty_subject_allocations fsa
         ON fsa.subject_id=v_subject AND fsa.branch_id=t.branch_id AND fsa.semester_id=t.semester_id
        AND (fsa.course_id IS NULL OR fsa.course_id=t.course_id)
        AND (fsa.section_id IS NULL OR fsa.section_id=t.section_id)
        AND (fsa.academic_year_id IS NULL OR fsa.academic_year_id=t.academic_year_id)
        AND fsa.status=1 AND fsa.deleted_at IS NULL
       JOIN faculty f ON f.faculty_id=fsa.faculty_id AND f.status=1
       WHERE w.academic_year_id=t.academic_year_id AND w.status=1
         AND NOT EXISTS (
           SELECT 1 FROM timetable_entries e JOIN timetable_slots x ON x.timetable_slot_id=e.timetable_slot_id
           WHERE e.status=1 AND e.day_of_week=w.day_of_week AND x.start_time<ts.end_time AND x.end_time>ts.start_time
             AND (e.faculty_id=fsa.faculty_id OR e.section_id=t.section_id)
         )
       ORDER BY FIELD(w.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number
       LIMIT 1;
     END IF;

     SELECT COUNT(*) INTO v_candidate_count FROM tmp_tt_candidate;
     IF v_candidate_count=0 THEN
       INSERT INTO tmp_tt_unscheduled VALUES(v_subject,v_name,'NO_AVAILABLE_SLOT','No free working-day/period/faculty/classroom combination was found.');
       LEAVE req_loop;
     END IF;
     SELECT day_of_week,slot_id,faculty_id,classroom_id INTO v_day,v_slot,v_faculty,v_room
     FROM tmp_tt_candidate LIMIT 1;

     INSERT INTO timetable_entries
     (timetable_id,timetable_slot_id,faculty_id,subject_id,section_id,day_of_week,classroom,classroom_id,
      entry_type,generated_source,schedule_group_key,status,created_by,updated_by)
     SELECT p_timetable_id,v_slot,v_faculty,v_subject,t.section_id,v_day,
            c.classroom_name,v_room,'LECTURE','GENERATED',
            LEFT(CONCAT('GEN-',p_timetable_id,'-',v_subject,'-',UUID()),64),1,p_actor_id,p_actor_id
     FROM timetables t LEFT JOIN classrooms c ON c.classroom_id=v_room
     WHERE t.timetable_id=p_timetable_id;

     SET v_done=v_done+1; SET v_scheduled=v_scheduled+1; SET v_added=v_added+1;
   END WHILE slot_loop;
 END LOOP;
 CLOSE cur;

 SELECT p_timetable_id AS TimetableId,v_scheduled AS ScheduledCount,v_added AS AddedCount;
 SELECT subject_id AS SubjectId,subject_name AS SubjectName,reason_code AS ReasonCode,message AS Message
 FROM tmp_tt_unscheduled;
 SELECT 'GENERATION' AS Type,NULL AS FacultyId,NULL AS ClassroomId,NULL AS SectionId,NULL AS ConflictingEntryId,
        'Generation completed; see unscheduled rows for subjects that could not be placed.' AS Message
 WHERE EXISTS(SELECT 1 FROM tmp_tt_unscheduled);

 DROP TEMPORARY TABLE IF EXISTS tmp_tt_candidate;
 DROP TEMPORARY TABLE IF EXISTS tmp_tt_unscheduled;
 DROP TEMPORARY TABLE IF EXISTS tmp_tt_rooms;
END$$


DROP PROCEDURE IF EXISTS sp_tt_entry_add$$
CREATE PROCEDURE sp_tt_entry_add(
 IN p_timetable_id BIGINT,IN p_slot_ids_json JSON,IN p_day_of_week VARCHAR(20),
 IN p_subject_id BIGINT,IN p_faculty_id BIGINT,IN p_classroom_id BIGINT,IN p_entry_type VARCHAR(30),
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_section BIGINT; DECLARE v_college BIGINT; DECLARE v_ok INT DEFAULT 0; DECLARE v_conflicts INT DEFAULT 0;
 SELECT t.section_id,s.college_id INTO v_section,v_college
 FROM timetables t JOIN sections s ON s.section_id=t.section_id
 WHERE t.timetable_id=p_timetable_id;
 IF v_section IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;
 IF p_is_super_admin=0 AND v_college<>p_college_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable does not belong to your college.'; END IF;

 SELECT COUNT(*) INTO v_ok
 FROM timetables t JOIN faculty_subject_allocations fsa ON fsa.branch_id=t.branch_id AND fsa.semester_id=t.semester_id
 WHERE t.timetable_id=p_timetable_id AND fsa.faculty_id=p_faculty_id AND fsa.subject_id=p_subject_id
   AND fsa.status=1 AND fsa.deleted_at IS NULL
   AND (fsa.course_id IS NULL OR fsa.course_id=t.course_id)
   AND (fsa.section_id IS NULL OR fsa.section_id=t.section_id)
   AND (fsa.academic_year_id IS NULL OR fsa.academic_year_id=t.academic_year_id);
 IF v_ok=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty is not allocated to this subject for the timetable context.'; END IF;

 IF p_classroom_id IS NOT NULL AND NOT EXISTS
   (SELECT 1 FROM classrooms WHERE classroom_id=p_classroom_id AND college_id=v_college AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Classroom not found or inactive.'; END IF;

 DROP TEMPORARY TABLE IF EXISTS tmp_tt_slots_add;
 CREATE TEMPORARY TABLE tmp_tt_slots_add(slot_id BIGINT PRIMARY KEY);
 INSERT IGNORE INTO tmp_tt_slots_add
 SELECT CAST(x.slot_id AS UNSIGNED)
 FROM JSON_TABLE(COALESCE(p_slot_ids_json,JSON_ARRAY()),'$[*]' COLUMNS(slot_id BIGINT PATH '$')) x
 JOIN timetable_slots ts ON ts.timetable_slot_id=x.slot_id AND ts.timetable_id=p_timetable_id AND ts.status=1;

 IF (SELECT COUNT(*) FROM tmp_tt_slots_add)<>JSON_LENGTH(COALESCE(p_slot_ids_json,JSON_ARRAY())) THEN
   DROP TEMPORARY TABLE tmp_tt_slots_add;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='One or more timetable slots are invalid.';
 END IF;

 SELECT COUNT(*) INTO v_conflicts
 FROM timetable_entries e JOIN timetable_slots es ON es.timetable_slot_id=e.timetable_slot_id
 JOIN tmp_tt_slots_add x ON x.slot_id=es.timetable_slot_id
 WHERE e.status=1 AND e.day_of_week=UPPER(TRIM(p_day_of_week))
   AND (e.faculty_id=p_faculty_id OR e.section_id=v_section OR (p_classroom_id IS NOT NULL AND e.classroom_id=p_classroom_id));
 IF v_conflicts>0 THEN
   DROP TEMPORARY TABLE tmp_tt_slots_add;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty, section or classroom is already booked for the selected slot.';
 END IF;

 INSERT INTO timetable_entries
 (timetable_id,timetable_slot_id,faculty_id,subject_id,section_id,day_of_week,classroom,classroom_id,
  entry_type,generated_source,status,created_by,updated_by)
 SELECT p_timetable_id,x.slot_id,p_faculty_id,p_subject_id,v_section,UPPER(TRIM(p_day_of_week)),
        c.classroom_name,p_classroom_id,UPPER(TRIM(p_entry_type)),'MANUAL',1,p_actor_id,p_actor_id
 FROM tmp_tt_slots_add x LEFT JOIN classrooms c ON c.classroom_id=p_classroom_id;

 DROP TEMPORARY TABLE tmp_tt_slots_add;

 SELECT e.timetable_entry_id AS TimetableEntryId,e.timetable_id AS TimetableId,e.timetable_slot_id AS TimetableSlotId,
        ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,
        e.day_of_week AS DayOfWeek,e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.section_id AS SectionId,s.section_name AS SectionName,e.classroom_id AS ClassroomId,
        cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,COALESCE(cr.classroom_name,e.classroom) AS Classroom,
        e.entry_type AS EntryType,e.generated_source AS GeneratedSource,e.schedule_group_key AS ScheduleGroupKey,e.status AS Active
 FROM timetable_entries e JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id JOIN sections s ON s.section_id=e.section_id
 LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.timetable_id=p_timetable_id AND e.status=1
 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_entry_update$$
CREATE PROCEDURE sp_tt_entry_update(
 IN p_timetable_id BIGINT,IN p_entry_id BIGINT,IN p_slot_id BIGINT,IN p_day_of_week VARCHAR(20),
 IN p_subject_id BIGINT,IN p_faculty_id BIGINT,IN p_classroom_id BIGINT,IN p_entry_type VARCHAR(30),
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_section BIGINT; DECLARE v_college BIGINT;
 SELECT t.section_id,s.college_id INTO v_section,v_college FROM timetables t JOIN sections s ON s.section_id=t.section_id WHERE t.timetable_id=p_timetable_id;
 IF v_section IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;
 IF p_is_super_admin=0 AND v_college<>p_college_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable does not belong to your college.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM timetable_entries WHERE timetable_entry_id=p_entry_id AND timetable_id=p_timetable_id AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable entry not found.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM timetable_slots WHERE timetable_slot_id=p_slot_id AND timetable_id=p_timetable_id AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable slot not found.'; END IF;
 IF p_classroom_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classrooms WHERE classroom_id=p_classroom_id AND college_id=v_college AND status=1)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Classroom not found or inactive.'; END IF;

 IF EXISTS (
   SELECT 1 FROM timetable_entries e JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
   WHERE e.status=1 AND e.timetable_entry_id<>p_entry_id AND e.day_of_week=UPPER(TRIM(p_day_of_week))
     AND e.timetable_id=p_timetable_id AND e.timetable_slot_id=p_slot_id
     AND (e.faculty_id=p_faculty_id OR e.section_id=v_section OR (p_classroom_id IS NOT NULL AND e.classroom_id=p_classroom_id))
 ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty, section or classroom is already booked for the selected slot.'; END IF;

 UPDATE timetable_entries e
 SET timetable_slot_id=p_slot_id,day_of_week=UPPER(TRIM(p_day_of_week)),subject_id=p_subject_id,faculty_id=p_faculty_id,
     classroom_id=p_classroom_id,classroom=(SELECT classroom_name FROM classrooms WHERE classroom_id=p_classroom_id),
     entry_type=UPPER(TRIM(p_entry_type)),generated_source='MANUAL',updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE e.timetable_entry_id=p_entry_id AND e.timetable_id=p_timetable_id;
END$$

DROP PROCEDURE IF EXISTS sp_tt_entry_move$$
CREATE PROCEDURE sp_tt_entry_move(
 IN p_timetable_id BIGINT,IN p_entry_id BIGINT,IN p_slot_id BIGINT,IN p_day_of_week VARCHAR(20),
 IN p_classroom_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_subject BIGINT; DECLARE v_faculty BIGINT; DECLARE v_section BIGINT;
 SELECT subject_id,faculty_id,section_id INTO v_subject,v_faculty,v_section FROM timetable_entries WHERE timetable_entry_id=p_entry_id AND timetable_id=p_timetable_id AND status=1;
 IF v_section IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable entry not found.'; END IF;
 CALL sp_tt_entry_update(p_timetable_id,p_entry_id,p_slot_id,p_day_of_week,v_subject,v_faculty,p_classroom_id,'LECTURE',p_actor_id,p_college_id,p_is_super_admin);
END$$

DROP PROCEDURE IF EXISTS sp_tt_entry_delete$$
CREATE PROCEDURE sp_tt_entry_delete(IN p_timetable_id BIGINT,IN p_entry_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=t.section_id
                WHERE e.timetable_entry_id=p_entry_id AND e.timetable_id=p_timetable_id AND e.status=1
                  AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable entry not found.'; END IF;
 UPDATE timetable_entries SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
 WHERE timetable_entry_id=p_entry_id AND timetable_id=p_timetable_id;
 UPDATE timetables SET revision=revision+1,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE timetable_id=p_timetable_id;
END$$

DROP PROCEDURE IF EXISTS sp_tt_entry_list$$
CREATE PROCEDURE sp_tt_entry_list(IN p_timetable_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT e.timetable_entry_id AS TimetableEntryId,e.timetable_id AS TimetableId,e.timetable_slot_id AS TimetableSlotId,
        ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,
        e.day_of_week AS DayOfWeek,e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,
        e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.section_id AS SectionId,s.section_name AS SectionName,e.classroom_id AS ClassroomId,
        cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,COALESCE(cr.classroom_name,e.classroom) AS Classroom,
        e.entry_type AS EntryType,e.generated_source AS GeneratedSource,e.schedule_group_key AS ScheduleGroupKey,e.status AS Active
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id JOIN subjects su ON su.subject_id=e.subject_id
 JOIN faculty f ON f.faculty_id=e.faculty_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND (p_timetable_id IS NULL OR e.timetable_id=p_timetable_id)
   AND (p_faculty_id IS NULL OR e.faculty_id=p_faculty_id)
   AND (p_day_of_week IS NULL OR e.day_of_week=UPPER(p_day_of_week))
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY e.day_of_week,ts.slot_number;
END$$


DROP PROCEDURE IF EXISTS sp_tt_validate$$
CREATE PROCEDURE sp_tt_validate(IN p_timetable_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_conflict INT DEFAULT 0; DECLARE v_unscheduled INT DEFAULT 0;
 SELECT COUNT(*) INTO v_conflict FROM (
   SELECT e1.timetable_entry_id FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
   JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
   JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
   WHERE e1.timetable_id=p_timetable_id AND e1.status=1 AND e1.day_of_week=e2.day_of_week
     AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time
     AND (e1.faculty_id=e2.faculty_id OR e1.section_id=e2.section_id OR (e1.classroom_id IS NOT NULL AND e1.classroom_id=e2.classroom_id))
   GROUP BY e1.timetable_entry_id
 ) q;
 SELECT COUNT(*) INTO v_unscheduled FROM timetable_subject_requirements r
 WHERE r.timetable_id=p_timetable_id AND r.status=1
   AND (SELECT COUNT(*) FROM timetable_entries e WHERE e.timetable_id=p_timetable_id AND e.subject_id=r.subject_id AND e.status=1)<r.periods_per_week;

 SELECT CASE WHEN v_conflict=0 AND v_unscheduled=0 THEN 1 ELSE 0 END AS Valid;

 SELECT 'FACULTY' AS Type,e1.faculty_id AS FacultyId,NULL AS ClassroomId,e1.section_id AS SectionId,
        e2.timetable_entry_id AS ConflictingEntryId,'Faculty has overlapping timetable entries.' AS Message
 FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
 JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
 JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
 WHERE e1.timetable_id=p_timetable_id AND e1.status=1 AND e1.day_of_week=e2.day_of_week
   AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time AND e1.faculty_id=e2.faculty_id
 UNION ALL
 SELECT 'SECTION',NULL,NULL,e1.section_id,e2.timetable_entry_id,'Section has overlapping timetable entries.'
 FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
 JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
 JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
 WHERE e1.timetable_id=p_timetable_id AND e1.status=1 AND e1.day_of_week=e2.day_of_week
   AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time AND e1.section_id=e2.section_id
 UNION ALL
 SELECT 'CLASSROOM',NULL,e1.classroom_id,e1.section_id,e2.timetable_entry_id,'Classroom has overlapping timetable entries.'
 FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
 JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
 JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
 WHERE e1.timetable_id=p_timetable_id AND e1.status=1 AND e1.classroom_id IS NOT NULL AND e1.classroom_id=e2.classroom_id
   AND e1.day_of_week=e2.day_of_week AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time;

 SELECT r.subject_id AS SubjectId,su.subject_name AS SubjectName,'INSUFFICIENT_PERIODS' AS ReasonCode,
        CONCAT('Required ',r.periods_per_week,' periods but only ',COUNT(e.timetable_entry_id),' are scheduled.') AS Message
 FROM timetable_subject_requirements r JOIN subjects su ON su.subject_id=r.subject_id
 LEFT JOIN timetable_entries e ON e.timetable_id=r.timetable_id AND e.subject_id=r.subject_id AND e.status=1
 WHERE r.timetable_id=p_timetable_id AND r.status=1 GROUP BY r.subject_id,su.subject_name,r.periods_per_week
 HAVING COUNT(e.timetable_entry_id)<r.periods_per_week;

 SELECT CAST(NULL AS CHAR) AS Warning WHERE 1=0;
END$$

DROP PROCEDURE IF EXISTS sp_tt_publish$$
CREATE PROCEDURE sp_tt_publish(IN p_timetable_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_valid INT;
 SELECT CASE WHEN
   NOT EXISTS(SELECT 1 FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
     JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
     JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
     WHERE e1.timetable_id=p_timetable_id AND e1.status=1 AND e1.day_of_week=e2.day_of_week
       AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time
       AND (e1.faculty_id=e2.faculty_id OR e1.section_id=e2.section_id OR (e1.classroom_id IS NOT NULL AND e1.classroom_id=e2.classroom_id)))
   AND NOT EXISTS(SELECT 1 FROM timetable_subject_requirements r WHERE r.timetable_id=p_timetable_id AND r.status=1
     AND (SELECT COUNT(*) FROM timetable_entries e WHERE e.timetable_id=p_timetable_id AND e.subject_id=r.subject_id AND e.status=1)<r.periods_per_week)
 THEN 1 ELSE 0 END INTO v_valid;
 IF v_valid=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable validation failed. Resolve conflicts and unscheduled requirements before publishing.'; END IF;
 UPDATE timetables SET status='PUBLISHED',is_published=1,published_at=CURRENT_TIMESTAMP,published_by=p_actor_id,
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE timetable_id=p_timetable_id;
END$$

DROP PROCEDURE IF EXISTS sp_tt_reopen$$
CREATE PROCEDURE sp_tt_reopen(IN p_timetable_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 IF NOT EXISTS (SELECT 1 FROM timetables t JOIN sections s ON s.section_id=t.section_id
                WHERE t.timetable_id=p_timetable_id AND (p_is_super_admin=1 OR s.college_id=p_college_id))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found.'; END IF;
 UPDATE timetables SET status='DRAFT',is_published=0,published_at=NULL,published_by=NULL,
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE timetable_id=p_timetable_id;
END$$


DROP PROCEDURE IF EXISTS sp_tt_view_faculty$$
CREATE PROCEDURE sp_tt_view_faculty(IN p_faculty_id BIGINT,IN p_academic_year_id BIGINT,IN p_date DATE,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,
        e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id LEFT JOIN courses c ON c.course_id=t.course_id
 LEFT JOIN branches b ON b.branch_id=t.branch_id JOIN semesters sem ON sem.semester_id=t.semester_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND e.faculty_id=p_faculty_id AND (p_academic_year_id IS NULL OR t.academic_year_id=p_academic_year_id)
   AND (p_date IS NULL OR e.day_of_week=UPPER(DAYNAME(p_date))) AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_view_student$$
CREATE PROCEDURE sp_tt_view_student(IN p_student_id BIGINT,IN p_academic_year_id BIGINT,IN p_date DATE,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,
        e.subject_id AS SubjectId,su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM student_sections ss JOIN sections s ON s.section_id=ss.section_id AND ss.is_active=1
 JOIN timetable_entries e ON e.section_id=s.section_id AND e.status=1 JOIN timetables t ON t.timetable_id=e.timetable_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id LEFT JOIN courses c ON c.course_id=t.course_id
 LEFT JOIN branches b ON b.branch_id=t.branch_id JOIN semesters sem ON sem.semester_id=t.semester_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE ss.student_id=p_student_id AND (p_academic_year_id IS NULL OR ss.academic_year_id=p_academic_year_id)
   AND (p_date IS NULL OR e.day_of_week=UPPER(DAYNAME(p_date))) AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_view_classroom$$
CREATE PROCEDURE sp_tt_view_classroom(IN p_classroom_id BIGINT,IN p_academic_year_id BIGINT,IN p_date DATE,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,e.subject_id AS SubjectId,
        su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND e.classroom_id=p_classroom_id AND (p_academic_year_id IS NULL OR t.academic_year_id=p_academic_year_id)
   AND (p_date IS NULL OR e.day_of_week=UPPER(DAYNAME(p_date))) AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_view_section$$
CREATE PROCEDURE sp_tt_view_section(IN p_section_id BIGINT,IN p_academic_year_id BIGINT,IN p_date DATE,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,e.subject_id AS SubjectId,
        su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND e.section_id=p_section_id AND (p_academic_year_id IS NULL OR t.academic_year_id=p_academic_year_id)
   AND (p_date IS NULL OR e.day_of_week=UPPER(DAYNAME(p_date))) AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY FIELD(e.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_occurrences$$
CREATE PROCEDURE sp_tt_occurrences(IN p_date DATE,IN p_section_id BIGINT,IN p_faculty_id BIGINT,IN p_classroom_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_ay BIGINT DEFAULT NULL; DECLARE v_working TINYINT DEFAULT 0; DECLARE v_type VARCHAR(30); DECLARE v_desc VARCHAR(255);
 SELECT MAX(t.academic_year_id) INTO v_ay
 FROM timetables t JOIN sections s ON s.section_id=t.section_id
 WHERE p_date BETWEEN COALESCE(t.effective_from,'1000-01-01') AND COALESCE(t.effective_to,'9999-12-31')
   AND (p_section_id IS NULL OR t.section_id=p_section_id)
   AND (p_is_super_admin=1 OR s.college_id=p_college_id);

 SELECT MAX(acd.day_type),MAX(acd.description) INTO v_type,v_desc
 FROM academic_calendar_days acd WHERE acd.academic_year_id=v_ay AND acd.calendar_date=p_date AND acd.status=1;

 IF v_type='NON_WORKING' THEN SET v_working=0;
 ELSEIF v_type='WORKING_OVERRIDE' THEN SET v_working=1;
 ELSE
   SELECT COUNT(*) INTO v_working FROM academic_working_days
   WHERE academic_year_id=v_ay AND day_of_week=UPPER(DAYNAME(p_date)) AND status=1;
 END IF;

 SELECT p_date AS Date,v_working AS WorkingDay,v_type AS ExceptionType,v_desc AS ExceptionDescription;

 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,e.subject_id AS SubjectId,
        su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=e.section_id
 JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id
 JOIN semesters sem ON sem.semester_id=t.semester_id JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id
 JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE e.status=1 AND e.day_of_week=UPPER(DAYNAME(p_date))
   AND (p_section_id IS NULL OR e.section_id=p_section_id) AND (p_faculty_id IS NULL OR e.faculty_id=p_faculty_id)
   AND (p_classroom_id IS NULL OR e.classroom_id=p_classroom_id)
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
   AND COALESCE(t.effective_from,'1000-01-01')<=p_date AND COALESCE(t.effective_to,'9999-12-31')>=p_date
 ORDER BY ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_legacy_create$$
CREATE PROCEDURE sp_tt_legacy_create(
 IN p_academic_year_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_section_id BIGINT,
 IN p_subject_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),IN p_start_time TIME,IN p_end_time TIME,
 IN p_room_no VARCHAR(100),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_timetable BIGINT; DECLARE v_slot BIGINT; DECLARE v_college BIGINT; DECLARE v_room BIGINT;
 SELECT college_id INTO v_college FROM sections WHERE section_id=p_section_id AND status=1 AND is_archived=0;
 IF v_college IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section not found.'; END IF;
 IF p_is_super_admin=0 AND v_college<>p_college_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section does not belong to your college.'; END IF;

 IF NOT EXISTS (
   SELECT 1 FROM sections
   WHERE section_id=p_section_id
     AND academic_year_id=p_academic_year_id
     AND (semester_id=p_semester_id OR (semester_id IS NULL AND p_semester_id IS NULL))
 ) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section does not match the supplied academic year or semester.';
 END IF;

 SELECT timetable_id INTO v_timetable FROM timetables
 WHERE academic_year_id=p_academic_year_id AND semester_id=p_semester_id AND section_id=p_section_id LIMIT 1;

 IF v_timetable IS NULL THEN
   INSERT INTO timetables(academic_year_id,course_id,branch_id,semester_id,section_id,timetable_name,status,created_by,updated_by)
   VALUES(p_academic_year_id,p_course_id,p_branch_id,p_semester_id,p_section_id,
          CONCAT(TRIM(p_day_of_week),' ',TIME_FORMAT(p_start_time,'%H:%i'),'-',TIME_FORMAT(p_end_time,'%H:%i')),
          'DRAFT',p_actor_id,p_actor_id);
   SET v_timetable=LAST_INSERT_ID();
 END IF;

 SELECT timetable_slot_id INTO v_slot FROM timetable_slots
 WHERE timetable_id=v_timetable AND start_time=p_start_time AND end_time=p_end_time AND status=1 LIMIT 1;

 IF v_slot IS NULL THEN
   SELECT COALESCE(MAX(slot_number),0)+1 INTO @slot_no FROM timetable_slots WHERE timetable_id=v_timetable;
   INSERT INTO timetable_slots(timetable_id,slot_number,slot_name,start_time,end_time,status,created_by,updated_by)
   VALUES(v_timetable,@slot_no,CONCAT('Period ',@slot_no),p_start_time,p_end_time,1,p_actor_id,p_actor_id);
   SET v_slot=LAST_INSERT_ID();
 END IF;

 SELECT classroom_id INTO v_room FROM classrooms
 WHERE college_id=v_college AND status=1 AND UPPER(classroom_name)=UPPER(TRIM(p_room_no)) LIMIT 1;

 IF EXISTS (
   SELECT 1 FROM timetable_entries e JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
   WHERE e.status=1 AND e.day_of_week=UPPER(TRIM(p_day_of_week)) AND ts.start_time<p_end_time AND ts.end_time>p_start_time
     AND (e.faculty_id=p_faculty_id OR e.section_id=p_section_id)
 ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty or section is already booked during the requested time.'; END IF;

 INSERT INTO timetable_entries(timetable_id,timetable_slot_id,faculty_id,subject_id,section_id,day_of_week,classroom,classroom_id,entry_type,generated_source,status,created_by,updated_by)
 VALUES(v_timetable,v_slot,p_faculty_id,p_subject_id,p_section_id,UPPER(TRIM(p_day_of_week)),p_room_no,v_room,'LECTURE','MANUAL',1,p_actor_id,p_actor_id);
 SELECT v_timetable;
END$$

DROP PROCEDURE IF EXISTS sp_tt_legacy_update$$
CREATE PROCEDURE sp_tt_legacy_update(
 IN p_timetable_id BIGINT,IN p_academic_year_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_section_id BIGINT,
 IN p_subject_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),IN p_start_time TIME,IN p_end_time TIME,IN p_room_no VARCHAR(100),
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_entry BIGINT; DECLARE v_slot BIGINT; DECLARE v_college BIGINT;
 SELECT college_id INTO v_college FROM sections WHERE section_id=p_section_id;
 IF v_college IS NULL OR (p_is_super_admin=0 AND v_college<>p_college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section not found or access denied.'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM sections
   WHERE section_id=p_section_id
     AND academic_year_id=p_academic_year_id
 ) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section does not match the supplied academic year.';
 END IF;
 SELECT MIN(timetable_entry_id) INTO v_entry FROM timetable_entries WHERE timetable_id=p_timetable_id AND status=1;
 IF v_entry IS NULL THEN
   CALL sp_tt_legacy_create(p_academic_year_id,p_course_id,p_branch_id,p_semester_id,p_section_id,p_subject_id,p_faculty_id,p_day_of_week,p_start_time,p_end_time,p_room_no,p_actor_id,p_college_id,p_is_super_admin);
 ELSE
   SELECT timetable_slot_id INTO v_slot FROM timetable_slots WHERE timetable_id=p_timetable_id AND start_time=p_start_time AND end_time=p_end_time AND status=1 LIMIT 1;
   IF v_slot IS NULL THEN
     SELECT COALESCE(MAX(slot_number),0)+1 INTO @slot_no2 FROM timetable_slots WHERE timetable_id=p_timetable_id;
     INSERT INTO timetable_slots(timetable_id,slot_number,slot_name,start_time,end_time,status,created_by,updated_by)
     VALUES(p_timetable_id,@slot_no2,CONCAT('Period ',@slot_no2),p_start_time,p_end_time,1,p_actor_id,p_actor_id);
     SET v_slot=LAST_INSERT_ID();
   END IF;
   UPDATE timetable_entries SET timetable_slot_id=v_slot,faculty_id=p_faculty_id,subject_id=p_subject_id,section_id=p_section_id,
      day_of_week=UPPER(TRIM(p_day_of_week)),classroom=p_room_no,generated_source='MANUAL',updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP
   WHERE timetable_entry_id=v_entry AND timetable_id=p_timetable_id;
   UPDATE timetables SET academic_year_id=p_academic_year_id,course_id=p_course_id,branch_id=p_branch_id,semester_id=p_semester_id,
      section_id=p_section_id,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE timetable_id=p_timetable_id;
 END IF;
END$$

DROP PROCEDURE IF EXISTS sp_tt_legacy_list$$
CREATE PROCEDURE sp_tt_legacy_list(
 IN p_semester_id BIGINT,IN p_branch_id BIGINT,IN p_section_id BIGINT,IN p_faculty_id BIGINT,IN p_day_of_week VARCHAR(20),
 IN p_published TINYINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 SELECT t.timetable_id AS TimetableId,e.timetable_entry_id AS TimetableEntryId,t.academic_year_id AS AcademicYearId,ay.academic_year_name AS AcademicYearName,
        t.course_id AS CourseId,c.course_name AS CourseName,t.branch_id AS BranchId,b.branch_name AS BranchName,t.semester_id AS SemesterId,sem.semester_name AS SemesterName,
        e.section_id AS SectionId,s.capacity AS SectionCapacity,s.section_code AS SectionCode,s.section_name AS SectionName,e.subject_id AS SubjectId,
        su.subject_code AS SubjectCode,su.subject_name AS SubjectName,e.faculty_id AS FacultyId,f.faculty_code AS FacultyCode,f.faculty_name AS FacultyName,
        e.classroom_id AS ClassroomId,cr.classroom_code AS ClassroomCode,cr.classroom_name AS ClassroomName,e.day_of_week AS DayOfWeek,
        e.timetable_slot_id AS TimetableSlotId,ts.slot_number AS SlotNumber,ts.slot_name AS SlotName,ts.start_time AS StartTime,ts.end_time AS EndTime,e.entry_type AS EntryType
 FROM timetables t JOIN timetable_entries e ON e.timetable_id=t.timetable_id AND e.status=1
 JOIN sections s ON s.section_id=t.section_id JOIN academicyears ay ON ay.academic_year_id=t.academic_year_id
 LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id JOIN semesters sem ON sem.semester_id=t.semester_id
 JOIN subjects su ON su.subject_id=e.subject_id JOIN faculty f ON f.faculty_id=e.faculty_id JOIN timetable_slots ts ON ts.timetable_slot_id=e.timetable_slot_id
 LEFT JOIN classrooms cr ON cr.classroom_id=e.classroom_id
 WHERE (p_semester_id IS NULL OR t.semester_id=p_semester_id) AND (p_branch_id IS NULL OR t.branch_id=p_branch_id)
   AND (p_section_id IS NULL OR t.section_id=p_section_id) AND (p_faculty_id IS NULL OR e.faculty_id=p_faculty_id)
   AND (p_day_of_week IS NULL OR e.day_of_week=UPPER(p_day_of_week))
   AND (p_published IS NULL OR t.is_published=p_published)
   AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ORDER BY t.timetable_id,e.day_of_week,ts.slot_number;
END$$

DROP PROCEDURE IF EXISTS sp_tt_legacy_entry_create$$
CREATE PROCEDURE sp_tt_legacy_entry_create(
 IN p_timetable_id BIGINT,IN p_slot_id BIGINT,IN p_faculty_id BIGINT,IN p_subject_id BIGINT,IN p_section_id BIGINT,
 IN p_day_of_week VARCHAR(20),IN p_classroom VARCHAR(100),IN p_entry_type VARCHAR(30),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_college BIGINT;
 SELECT s.college_id INTO v_college FROM timetables t JOIN sections s ON s.section_id=t.section_id WHERE t.timetable_id=p_timetable_id;
 IF v_college IS NULL OR (p_is_super_admin=0 AND v_college<>p_college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found or access denied.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM timetable_slots WHERE timetable_slot_id=p_slot_id AND timetable_id=p_timetable_id AND status=1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable slot not found.'; END IF;
 IF EXISTS (SELECT 1 FROM timetable_entries e WHERE e.timetable_id=p_timetable_id AND e.timetable_slot_id=p_slot_id AND e.day_of_week=UPPER(TRIM(p_day_of_week)) AND e.status=1
            AND (e.faculty_id=p_faculty_id OR e.section_id=p_section_id)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty or section is already booked for this slot.'; END IF;
 INSERT INTO timetable_entries(timetable_id,timetable_slot_id,faculty_id,subject_id,section_id,day_of_week,classroom,entry_type,generated_source,status,created_by,updated_by)
 VALUES(p_timetable_id,p_slot_id,p_faculty_id,p_subject_id,p_section_id,UPPER(TRIM(p_day_of_week)),p_classroom,UPPER(TRIM(p_entry_type)),'MANUAL',1,p_actor_id,p_actor_id);
 SELECT LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_tt_legacy_entry_update$$
CREATE PROCEDURE sp_tt_legacy_entry_update(
 IN p_entry_id BIGINT,IN p_timetable_id BIGINT,IN p_slot_id BIGINT,IN p_faculty_id BIGINT,IN p_subject_id BIGINT,IN p_section_id BIGINT,
 IN p_day_of_week VARCHAR(20),IN p_classroom VARCHAR(100),IN p_entry_type VARCHAR(30),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_college BIGINT;
 SELECT s.college_id INTO v_college FROM timetables t JOIN sections s ON s.section_id=t.section_id WHERE t.timetable_id=p_timetable_id;
 IF v_college IS NULL OR (p_is_super_admin=0 AND v_college<>p_college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found or access denied.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM timetable_entries WHERE timetable_entry_id=p_entry_id AND timetable_id=p_timetable_id AND status=1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable entry not found.'; END IF;
 UPDATE timetable_entries SET timetable_slot_id=p_slot_id,faculty_id=p_faculty_id,subject_id=p_subject_id,section_id=p_section_id,
   day_of_week=UPPER(TRIM(p_day_of_week)),classroom=p_classroom,entry_type=UPPER(TRIM(p_entry_type)),generated_source='MANUAL',
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE timetable_entry_id=p_entry_id AND timetable_id=p_timetable_id;
END$$


DROP PROCEDURE IF EXISTS sp_tt_legacy_entry_delete$$
CREATE PROCEDURE sp_tt_legacy_entry_delete(
 IN p_entry_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_timetable BIGINT; DECLARE v_college BIGINT;
 SELECT e.timetable_id,s.college_id INTO v_timetable,v_college
 FROM timetable_entries e JOIN timetables t ON t.timetable_id=e.timetable_id JOIN sections s ON s.section_id=t.section_id
 WHERE e.timetable_entry_id=p_entry_id AND e.status=1;
 IF v_timetable IS NULL OR (p_is_super_admin=0 AND v_college<>p_college_id)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable entry not found or access denied.'; END IF;
 UPDATE timetable_entries SET status=0,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE timetable_entry_id=p_entry_id;
 UPDATE timetables SET revision=revision+1,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE timetable_id=v_timetable;
END$$



-- ================================================================
-- Additive advanced workflow APIs: revision drafts + atomic batches
-- Requires Database/Sql/Stored Procedures/TimeTableManagement/TimetableRevisionMigration.sql first.
-- ================================================================
DROP PROCEDURE IF EXISTS sp_tt_revision_create$$
CREATE PROCEDURE sp_tt_revision_create(
 IN p_timetable_id BIGINT,
 IN p_expected_revision BIGINT,
 IN p_reason VARCHAR(500),
 IN p_actor_id BIGINT,
 IN p_college_id BIGINT,
 IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_source_revision BIGINT DEFAULT NULL;
 DECLARE v_source_status VARCHAR(30) DEFAULT NULL;
 DECLARE v_college_id BIGINT DEFAULT NULL;
 DECLARE v_new_id BIGINT DEFAULT NULL;
 DECLARE v_new_revision_number INT DEFAULT NULL;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT t.revision,t.status,s.college_id
   INTO v_source_revision,v_source_status,v_college_id
 FROM timetables t JOIN sections s ON s.section_id=t.section_id
 WHERE t.timetable_id=p_timetable_id FOR UPDATE;
 IF v_source_revision IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Source timetable not found.'; END IF;
 IF p_is_super_admin=0 AND (p_college_id IS NULL OR v_college_id<>p_college_id) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable not found or access denied.';
 END IF;
 IF UPPER(v_source_status)<>'PUBLISHED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only a published timetable can be revised.'; END IF;
 IF v_source_revision<>p_expected_revision THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Revision conflict: source timetable changed. Refresh and retry.'; END IF;
 SET v_new_revision_number = COALESCE((SELECT MAX(revision_number) FROM timetables WHERE
   academic_year_id=(SELECT academic_year_id FROM timetables WHERE timetable_id=p_timetable_id) AND
   semester_id=(SELECT semester_id FROM timetables WHERE timetable_id=p_timetable_id) AND
   section_id=(SELECT section_id FROM timetables WHERE timetable_id=p_timetable_id)),1)+1;
 INSERT INTO timetables(academic_year_id,course_id,branch_id,semester_id,section_id,subject_id,faculty_id,day_of_week,start_time,end_time,room_no,
   is_published,timetable_name,status,effective_from,effective_to,published_at,published_by,created_by,updated_by,revision,source_timetable_id,revision_number)
 SELECT academic_year_id,course_id,branch_id,semester_id,section_id,subject_id,faculty_id,day_of_week,start_time,end_time,room_no,
   0,CONCAT(LEFT(timetable_name,120),' - Revision ',v_new_revision_number),'DRAFT',effective_from,effective_to,NULL,NULL,p_actor_id,p_actor_id,1,timetable_id,v_new_revision_number
 FROM timetables WHERE timetable_id=p_timetable_id;
 SET v_new_id=LAST_INSERT_ID();
 INSERT INTO timetable_slots(timetable_id,slot_number,slot_name,start_time,end_time,status,created_by,updated_by)
 SELECT v_new_id,slot_number,slot_name,start_time,end_time,status,p_actor_id,p_actor_id
 FROM timetable_slots WHERE timetable_id=p_timetable_id ORDER BY slot_number;
 INSERT INTO timetable_entries(timetable_id,timetable_slot_id,faculty_id,subject_id,section_id,day_of_week,classroom,classroom_id,entry_type,generated_source,schedule_group_key,status,created_by,updated_by)
 SELECT v_new_id,newslot.timetable_slot_id,e.faculty_id,e.subject_id,e.section_id,e.day_of_week,e.classroom,e.classroom_id,e.entry_type,e.generated_source,e.schedule_group_key,e.status,p_actor_id,p_actor_id
 FROM timetable_entries e
 JOIN timetable_slots oldslot ON oldslot.timetable_slot_id=e.timetable_slot_id
 JOIN timetable_slots newslot ON newslot.timetable_id=v_new_id AND newslot.slot_number=oldslot.slot_number
 WHERE e.timetable_id=p_timetable_id;
 INSERT INTO timetable_subject_requirements(timetable_id,subject_id,periods_per_week,block_size,status,created_by,updated_by)
 SELECT v_new_id,subject_id,periods_per_week,block_size,status,p_actor_id,p_actor_id
 FROM timetable_subject_requirements WHERE timetable_id=p_timetable_id;
 INSERT INTO timetable_publish_history(timetable_id,action,previous_status,new_status,remarks,action_by)
 VALUES(v_new_id,'REVISION_CREATED','PUBLISHED','DRAFT',LEFT(CONCAT('Source timetable ',p_timetable_id,': ',p_reason),500),p_actor_id);
 COMMIT;
 SELECT p_timetable_id AS SourceTimetableId,v_new_id AS RevisionTimetableId,v_new_revision_number AS RevisionNumber,'DRAFT' AS Status;
END$$

DROP PROCEDURE IF EXISTS sp_tt_publish_batch$$
CREATE PROCEDURE sp_tt_publish_batch(
 IN p_items_json JSON,
 IN p_actor_id BIGINT,
 IN p_college_id BIGINT,
 IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_count INT DEFAULT 0;
 DECLARE v_i INT DEFAULT 0;
 DECLARE v_timetable_id BIGINT DEFAULT NULL;
 DECLARE v_expected_revision BIGINT DEFAULT NULL;
 DECLARE v_current_revision BIGINT DEFAULT NULL;
 DECLARE v_status VARCHAR(30) DEFAULT NULL;
 DECLARE v_college_id BIGINT DEFAULT NULL;
 DECLARE v_bad INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 SET v_count=JSON_LENGTH(p_items_json);
 IF v_count IS NULL OR v_count<1 OR v_count>100 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Batch must contain between 1 and 100 timetables.'; END IF;
 START TRANSACTION;
 -- Validate every timetable first. No status is changed until all items pass.
 WHILE v_i<v_count DO
   SET v_timetable_id=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json,CONCAT('$[',v_i,'].timetableId'))) AS UNSIGNED);
   SET v_expected_revision=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json,CONCAT('$[',v_i,'].expectedRevision'))) AS UNSIGNED);
   SET v_current_revision=NULL; SET v_status=NULL; SET v_college_id=NULL;
   SELECT t.revision,t.status,s.college_id INTO v_current_revision,v_status,v_college_id
   FROM timetables t JOIN sections s ON s.section_id=t.section_id
   WHERE t.timetable_id=v_timetable_id FOR UPDATE;
   IF v_current_revision IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A timetable in the batch was not found.'; END IF;
   IF p_is_super_admin=0 AND (p_college_id IS NULL OR v_college_id<>p_college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Batch contains a timetable outside your college.'; END IF;
   IF UPPER(v_status) NOT IN ('DRAFT','GENERATED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Every timetable must be a draft or generated timetable.'; END IF;
   IF v_current_revision<>v_expected_revision THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Revision conflict in publication batch. Refresh and retry.'; END IF;
   SELECT COUNT(*) INTO v_bad
   FROM timetable_entries e1 JOIN timetable_slots s1 ON s1.timetable_slot_id=e1.timetable_slot_id
   JOIN timetable_entries e2 ON e2.timetable_id=e1.timetable_id AND e2.timetable_entry_id>e1.timetable_entry_id AND e2.status=1
   JOIN timetable_slots s2 ON s2.timetable_slot_id=e2.timetable_slot_id
   WHERE e1.timetable_id=v_timetable_id AND e1.status=1 AND e1.day_of_week=e2.day_of_week
    AND s1.start_time<s2.end_time AND s2.start_time<s1.end_time
    AND (e1.faculty_id=e2.faculty_id OR e1.section_id=e2.section_id OR (e1.classroom_id IS NOT NULL AND e1.classroom_id=e2.classroom_id));
   IF v_bad>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Publication batch validation failed: schedule conflict detected.'; END IF;
   SELECT COUNT(*) INTO v_bad FROM timetable_subject_requirements r
   WHERE r.timetable_id=v_timetable_id AND r.status=1
   AND (SELECT COUNT(*) FROM timetable_entries e WHERE e.timetable_id=v_timetable_id AND e.subject_id=r.subject_id AND e.status=1)<r.periods_per_week;
   IF v_bad>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Publication batch validation failed: subject requirements are incomplete.'; END IF;
   SET v_i=v_i+1;
 END WHILE;
 SET v_i=0;
 WHILE v_i<v_count DO
   SET v_timetable_id=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json,CONCAT('$[',v_i,'].timetableId'))) AS UNSIGNED);
   INSERT INTO timetable_publish_history(timetable_id,action,previous_status,new_status,remarks,action_by)
   SELECT timetable_id,'PUBLISH_BATCH',status,'PUBLISHED','Published as part of an atomic publication batch',p_actor_id
   FROM timetables WHERE timetable_id=v_timetable_id;
   UPDATE timetables SET status='PUBLISHED',is_published=1,published_at=CURRENT_TIMESTAMP,published_by=p_actor_id,
     updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE timetable_id=v_timetable_id;
   SET v_i=v_i+1;
 END WHILE;
 COMMIT;
 SELECT 1 AS Published, v_count AS PublishedCount;
END$$

DELIMITER ;
