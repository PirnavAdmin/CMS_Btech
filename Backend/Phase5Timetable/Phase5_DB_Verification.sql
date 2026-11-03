-- Run after Phase5_Advanced_Timetable_Migration.sql and API smoke tests.

SHOW TABLES LIKE 'timetable_period_configurations';
SHOW TABLES LIKE 'academic_working_days';
SHOW TABLES LIKE 'academic_calendar_settings';
SHOW TABLES LIKE 'academic_calendar_days';
SHOW TABLES LIKE 'classrooms';
SHOW TABLES LIKE 'timetable_subject_requirements';

DESCRIBE timetables;
DESCRIBE timetable_entries;

SELECT * FROM timetable_period_configurations ORDER BY academic_year_id, display_order;
SELECT * FROM academic_working_days ORDER BY academic_year_id, academic_working_day_id;
SELECT * FROM academic_calendar_settings ORDER BY academic_year_id;
SELECT * FROM academic_calendar_days ORDER BY academic_year_id, calendar_date;
SELECT * FROM classrooms ORDER BY college_id, classroom_id;
SELECT * FROM timetable_subject_requirements ORDER BY timetable_id, subject_id;

SELECT timetable_id, academic_year_id, course_id, branch_id, semester_id, section_id,
       timetable_name, status, is_published, revision, effective_from, effective_to
FROM timetables
ORDER BY timetable_id;

SELECT e.timetable_entry_id, e.timetable_id, e.day_of_week,
       s.slot_number, s.start_time, s.end_time,
       e.subject_id, e.faculty_id, e.section_id,
       e.classroom_id, e.classroom, e.generated_source, e.schedule_group_key, e.status
FROM timetable_entries e
JOIN timetable_slots s ON s.timetable_slot_id = e.timetable_slot_id
ORDER BY e.timetable_id, e.day_of_week, s.start_time, e.timetable_entry_id;

-- Confirm no active faculty double-book within exactly the same slot interval.
SELECT a.faculty_id, a.day_of_week, sa.start_time, sa.end_time, COUNT(*) AS conflict_count
FROM timetable_entries a
JOIN timetable_slots sa ON sa.timetable_slot_id = a.timetable_slot_id
JOIN timetable_entries b
  ON b.timetable_entry_id > a.timetable_entry_id
 AND b.faculty_id = a.faculty_id
 AND UPPER(b.day_of_week) = UPPER(a.day_of_week)
 AND b.status = 1
JOIN timetable_slots sb ON sb.timetable_slot_id = b.timetable_slot_id
 AND sa.start_time < sb.end_time
 AND sa.end_time > sb.start_time
WHERE a.status = 1
GROUP BY a.faculty_id, a.day_of_week, sa.start_time, sa.end_time;
