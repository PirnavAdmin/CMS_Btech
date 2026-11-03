USE cms_btech;

-- ============================================================
-- TIMETABLE VALIDATION UPGRADE - NON-DESTRUCTIVE
-- ============================================================
-- This script ONLY recreates the following stored procedures:
--   1. sp_tt_generate
--   2. sp_tt_entry_add
--   3. sp_tt_entry_update
--   4. sp_tt_validate
--   5. sp_tt_publish
--
-- Existing timetable/student/faculty/classroom data is NOT deleted,
-- truncated, updated, or migrated by this script.
-- DROP PROCEDURE affects only the stored-procedure definition.
--
-- Rules added:
--   * Same subject + same section + same day: maximum 2 classes.
--   * Faculty + same day: maximum 4 classes across overlapping timetables.
--   * Generator prefers the day where the assigned faculty currently
--     has fewer classes, while retaining existing conflict checks.
-- ============================================================

DELIMITER $$

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
 DECLARE v_max_subject_per_day INT DEFAULT 2;
 DECLARE v_max_faculty_per_day INT DEFAULT 4;
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
         AND (
           SELECT COUNT(*)
           FROM timetable_entries se
           WHERE se.timetable_id=p_timetable_id
             AND se.section_id=t.section_id
             AND se.subject_id=v_subject
             AND se.day_of_week=w.day_of_week
             AND se.status=1
         ) < v_max_subject_per_day
         AND (
           SELECT COUNT(*)
           FROM timetable_entries fe
           JOIN timetables ft ON ft.timetable_id=fe.timetable_id
           WHERE fe.faculty_id=fsa.faculty_id
             AND fe.day_of_week=w.day_of_week
             AND fe.status=1
             AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(t.effective_from,'1000-01-01')
         ) < v_max_faculty_per_day
         AND NOT EXISTS (
           SELECT 1 FROM timetable_entries e JOIN timetable_slots x ON x.timetable_slot_id=e.timetable_slot_id
           JOIN timetables ot ON ot.timetable_id=e.timetable_id
           WHERE e.status=1 AND e.day_of_week=w.day_of_week AND x.start_time<ts.end_time AND x.end_time>ts.start_time
             AND (e.faculty_id=fsa.faculty_id OR e.section_id=t.section_id OR e.classroom_id=c.classroom_id)
             AND COALESCE(ot.effective_from,'1000-01-01')<=COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ot.effective_to,'9999-12-31')>=COALESCE(t.effective_from,'1000-01-01')
         )
       ORDER BY
         (
           SELECT COUNT(*)
           FROM timetable_entries fe
           JOIN timetables ft ON ft.timetable_id=fe.timetable_id
           WHERE fe.faculty_id=fsa.faculty_id
             AND fe.day_of_week=w.day_of_week
             AND fe.status=1
             AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(t.effective_from,'1000-01-01')
         ),
         FIELD(w.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),
         ts.slot_number,c.classroom_id
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
         AND (
           SELECT COUNT(*)
           FROM timetable_entries se
           WHERE se.timetable_id=p_timetable_id
             AND se.section_id=t.section_id
             AND se.subject_id=v_subject
             AND se.day_of_week=w.day_of_week
             AND se.status=1
         ) < v_max_subject_per_day
         AND (
           SELECT COUNT(*)
           FROM timetable_entries fe
           JOIN timetables ft ON ft.timetable_id=fe.timetable_id
           WHERE fe.faculty_id=fsa.faculty_id
             AND fe.day_of_week=w.day_of_week
             AND fe.status=1
             AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(t.effective_from,'1000-01-01')
         ) < v_max_faculty_per_day
         AND NOT EXISTS (
           SELECT 1 FROM timetable_entries e JOIN timetable_slots x ON x.timetable_slot_id=e.timetable_slot_id
           WHERE e.status=1 AND e.day_of_week=w.day_of_week AND x.start_time<ts.end_time AND x.end_time>ts.start_time
             AND (e.faculty_id=fsa.faculty_id OR e.section_id=t.section_id)
         )
       ORDER BY
         (
           SELECT COUNT(*)
           FROM timetable_entries fe
           JOIN timetables ft ON ft.timetable_id=fe.timetable_id
           WHERE fe.faculty_id=fsa.faculty_id
             AND fe.day_of_week=w.day_of_week
             AND fe.status=1
             AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(t.effective_to,'9999-12-31')
             AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(t.effective_from,'1000-01-01')
         ),
         FIELD(w.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),
         ts.slot_number
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

 IF (
   (SELECT COUNT(*) FROM timetable_entries e
    WHERE e.timetable_id=p_timetable_id
      AND e.section_id=v_section
      AND e.subject_id=p_subject_id
      AND e.day_of_week=UPPER(TRIM(p_day_of_week))
      AND e.status=1)
   + (SELECT COUNT(*) FROM tmp_tt_slots_add)
 ) > 2 THEN
   DROP TEMPORARY TABLE tmp_tt_slots_add;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject cannot be scheduled more than 2 times on the same day for this section.';
 END IF;

 IF (
   (SELECT COUNT(*)
    FROM timetable_entries e
    JOIN timetables ft ON ft.timetable_id=e.timetable_id
    JOIN timetables tcur ON tcur.timetable_id=p_timetable_id
    WHERE e.faculty_id=p_faculty_id
      AND e.day_of_week=UPPER(TRIM(p_day_of_week))
      AND e.status=1
      AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(tcur.effective_to,'9999-12-31')
      AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(tcur.effective_from,'1000-01-01'))
   + (SELECT COUNT(*) FROM tmp_tt_slots_add)
 ) > 4 THEN
   DROP TEMPORARY TABLE tmp_tt_slots_add;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty cannot have more than 4 classes on the same day.';
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

 IF (
   SELECT COUNT(*)
   FROM timetable_entries e
   WHERE e.timetable_id=p_timetable_id
     AND e.section_id=v_section
     AND e.subject_id=p_subject_id
     AND e.day_of_week=UPPER(TRIM(p_day_of_week))
     AND e.status=1
     AND e.timetable_entry_id<>p_entry_id
 ) >= 2 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject cannot be scheduled more than 2 times on the same day for this section.';
 END IF;

 IF (
   SELECT COUNT(*)
   FROM timetable_entries e
   JOIN timetables ft ON ft.timetable_id=e.timetable_id
   JOIN timetables tcur ON tcur.timetable_id=p_timetable_id
   WHERE e.faculty_id=p_faculty_id
     AND e.day_of_week=UPPER(TRIM(p_day_of_week))
     AND e.status=1
     AND e.timetable_entry_id<>p_entry_id
     AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(tcur.effective_to,'9999-12-31')
     AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(tcur.effective_from,'1000-01-01')
 ) >= 4 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty cannot have more than 4 classes on the same day.';
 END IF;

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

DROP PROCEDURE IF EXISTS sp_tt_validate$$
CREATE PROCEDURE sp_tt_validate(IN p_timetable_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_conflict INT DEFAULT 0; DECLARE v_unscheduled INT DEFAULT 0;
 DECLARE v_subject_daily INT DEFAULT 0; DECLARE v_faculty_daily INT DEFAULT 0;
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

 SELECT COUNT(*) INTO v_subject_daily
 FROM (
   SELECT e.section_id,e.subject_id,e.day_of_week
   FROM timetable_entries e
   WHERE e.timetable_id=p_timetable_id AND e.status=1
   GROUP BY e.section_id,e.subject_id,e.day_of_week
   HAVING COUNT(*)>2
 ) x;

 SELECT COUNT(*) INTO v_faculty_daily
 FROM (
   SELECT e.faculty_id,e.day_of_week
   FROM timetable_entries e
   JOIN timetables ft ON ft.timetable_id=e.timetable_id
   JOIN timetables tcur ON tcur.timetable_id=p_timetable_id
   WHERE e.status=1 AND e.faculty_id IS NOT NULL
     AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(tcur.effective_to,'9999-12-31')
     AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(tcur.effective_from,'1000-01-01')
   GROUP BY e.faculty_id,e.day_of_week
   HAVING COUNT(*)>4
 ) x;

 SELECT CASE WHEN v_conflict=0 AND v_unscheduled=0 AND v_subject_daily=0 AND v_faculty_daily=0 THEN 1 ELSE 0 END AS Valid;

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

 SELECT 'SUBJECT_DAILY_LIMIT' AS Type,NULL AS FacultyId,NULL AS ClassroomId,e.section_id AS SectionId,
        NULL AS ConflictingEntryId,
        CONCAT('Subject ',su.subject_name,' is scheduled ',COUNT(*),' times on ',e.day_of_week,'. Maximum allowed is 2.') AS Message
 FROM timetable_entries e
 JOIN subjects su ON su.subject_id=e.subject_id
 WHERE e.timetable_id=p_timetable_id AND e.status=1
 GROUP BY e.section_id,e.subject_id,su.subject_name,e.day_of_week
 HAVING COUNT(*)>2;

 SELECT 'FACULTY_DAILY_LIMIT' AS Type,e.faculty_id AS FacultyId,NULL AS ClassroomId,NULL AS SectionId,
        NULL AS ConflictingEntryId,
        CONCAT('Faculty has ',COUNT(*),' classes on ',e.day_of_week,'. Maximum allowed is 4.') AS Message
 FROM timetable_entries e
 JOIN timetables ft ON ft.timetable_id=e.timetable_id
 JOIN timetables tcur ON tcur.timetable_id=p_timetable_id
 WHERE e.status=1 AND e.faculty_id IS NOT NULL
   AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(tcur.effective_to,'9999-12-31')
   AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(tcur.effective_from,'1000-01-01')
 GROUP BY e.faculty_id,e.day_of_week
 HAVING COUNT(*)>4;

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
   AND NOT EXISTS(
     SELECT 1
     FROM timetable_entries e
     WHERE e.timetable_id=p_timetable_id AND e.status=1
     GROUP BY e.section_id,e.subject_id,e.day_of_week
     HAVING COUNT(*)>2
   )
   AND NOT EXISTS(
     SELECT 1
     FROM timetable_entries e
     JOIN timetables ft ON ft.timetable_id=e.timetable_id
     JOIN timetables tcur ON tcur.timetable_id=p_timetable_id
     WHERE e.status=1 AND e.faculty_id IS NOT NULL
       AND COALESCE(ft.effective_from,'1000-01-01') <= COALESCE(tcur.effective_to,'9999-12-31')
       AND COALESCE(ft.effective_to,'9999-12-31') >= COALESCE(tcur.effective_from,'1000-01-01')
     GROUP BY e.faculty_id,e.day_of_week
     HAVING COUNT(*)>4
   )
 THEN 1 ELSE 0 END INTO v_valid;
 IF v_valid=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Timetable validation failed. Resolve conflicts and unscheduled requirements before publishing.'; END IF;
 UPDATE timetables SET status='PUBLISHED',is_published=1,published_at=CURRENT_TIMESTAMP,published_by=p_actor_id,
   updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE timetable_id=p_timetable_id;
END$$

DELIMITER ;



-- ============================================================
-- TIMETABLE LIFECYCLE FIX
-- Database: cms_btech
--
-- Purpose:
--   Fix the timetable lifecycle:
--       DRAFT -> GENERATED -> PUBLISHED
--
-- Changes:
--   1. sp_tt_generate now sets timetables.status='GENERATED'
--      after at least one class is successfully scheduled.
--   2. sp_tt_publish now allows publishing only when the parent
--      timetable status is GENERATED and the caller has access.
--
-- Safety:
--   * No table is dropped.
--   * No existing timetable data is deleted.
--   * No existing timetable entries are modified except the
--     parent timetable lifecycle fields after successful generation.
--   * Existing Generate/Publish API signatures are unchanged.
--   * sp_tt_reopen is not changed.
--
-- IMPORTANT:
--   Run this file against the same cms_btech database used by the API.
-- ============================================================

USE cms_btech;

DELIMITER $$

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

 -- Lifecycle fix:
 -- A successful generation must move the parent timetable from DRAFT to GENERATED.
 -- Existing timetable entries/data are not deleted by this change.
 IF v_scheduled > 0 THEN
   UPDATE timetables
   SET status='GENERATED',
       is_published=0,
       published_at=NULL,
       published_by=NULL,
       updated_by=p_actor_id,
       updated_at=CURRENT_TIMESTAMP,
       revision=revision+1
   WHERE timetable_id=p_timetable_id;
 END IF;

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

DROP PROCEDURE IF EXISTS sp_tt_publish$$

CREATE PROCEDURE sp_tt_publish(IN p_timetable_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT)
BEGIN
 DECLARE v_valid INT;

 -- Lifecycle fix:
 -- Only a successfully generated timetable can be published.
 IF NOT EXISTS (
   SELECT 1
   FROM timetables t
   JOIN sections s ON s.section_id=t.section_id
   WHERE t.timetable_id=p_timetable_id
     AND t.status='GENERATED'
     AND (p_is_super_admin=1 OR s.college_id=p_college_id)
 ) THEN
   SIGNAL SQLSTATE '45000'
   SET MESSAGE_TEXT='Only a generated timetable can be published.';
 END IF;

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

DELIMITER ;

-- ============================================================
-- Verification
-- ============================================================
-- After running the script, check:
--
-- SELECT timetable_id,status,is_published,published_at,published_by
-- FROM timetables
-- ORDER BY timetable_id DESC
-- LIMIT 20;
--
-- Expected lifecycle:
--   Before Generate : DRAFT
--   After Generate  : GENERATED
--   After Publish   : PUBLISHED
--   After Reopen    : DRAFT
-- ============================================================

