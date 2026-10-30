-- Read-only check. Dump20261009.sql already contains these tables; no migration required.
USE cms_btech;
SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()
AND table_name IN ('events','event_registrations','event_schedules','event_certificates','event_gallery');
SELECT 'events' AS entity,COUNT(*) AS row_count FROM events
UNION ALL SELECT 'registrations',COUNT(*) FROM event_registrations
UNION ALL SELECT 'schedules',COUNT(*) FROM event_schedules
UNION ALL SELECT 'certificates',COUNT(*) FROM event_certificates
UNION ALL SELECT 'gallery',COUNT(*) FROM event_gallery;
SELECT event_id,college_id,event_code,event_name,status,start_at,end_at FROM events WHERE deleted_at IS NULL;
SELECT registration_id,event_id,student_id,participant_name,status,attendance_status FROM event_registrations;
SELECT certificate_id,registration_id,certificate_number,certificate_type,status FROM event_certificates;
SELECT gallery_id,event_id,title,status,file_path FROM event_gallery WHERE deleted_at IS NULL;
-- Expected: zero rows from each integrity query.
SELECT s.schedule_id FROM event_schedules s JOIN events e ON e.event_id=s.event_id
WHERE s.status<>'CANCELLED' AND (s.start_at<e.start_at OR s.end_at>e.end_at);
SELECT r.registration_id FROM event_registrations r JOIN events e ON e.event_id=r.event_id
JOIN students s ON s.student_id=r.student_id WHERE s.college_id<>e.college_id;
SELECT c.certificate_id FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id
JOIN events e ON e.event_id=r.event_id WHERE c.status='ISSUED'
AND (r.status<>'CONFIRMED' OR r.attendance_status<>'PRESENT' OR e.status<>'COMPLETED' OR e.certificate_enabled<>1);
