-- Ticket 159 uses existing tables; no schema change is required.

-- 1. Sessions
SELECT
    attendance_session_id,
    college_id,
    academic_year_id,
    semester_id,
    section_id,
    subject_id,
    faculty_id,
    timetable_id,
    timetable_entry_id,
    timetable_slot_id,
    attendance_date,
    session_status,
    remarks,
    created_at,
    created_by,
    updated_at,
    updated_by
FROM student_attendance
ORDER BY attendance_session_id DESC;

-- 2. Marks
SELECT
    attendance_detail_id,
    attendance_session_id,
    student_id,
    attendance_status,
    remarks,
    marked_at,
    marked_by,
    updated_at,
    updated_by
FROM student_attendance_details
ORDER BY attendance_session_id DESC, student_id;

-- 3. Session + student marks together
SELECT
    a.attendance_session_id,
    a.attendance_date,
    a.session_status,
    s.subject_code,
    s.subject_name,
    sec.section_code,
    f.faculty_name,
    st.student_code,
    st.full_name,
    d.attendance_status,
    d.remarks
FROM student_attendance a
JOIN subjects s ON s.subject_id = a.subject_id
JOIN sections sec ON sec.section_id = a.section_id
JOIN faculty f ON f.faculty_id = a.faculty_id
LEFT JOIN student_attendance_details d
    ON d.attendance_session_id = a.attendance_session_id
LEFT JOIN students st
    ON st.student_id = d.student_id
ORDER BY a.attendance_date DESC, a.attendance_session_id DESC, st.student_code;
