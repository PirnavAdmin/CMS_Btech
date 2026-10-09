-- B.Tech Meeting/Event Validation module
-- MySQL 8.0+. Read-only validation procedures: no table changes or data mutation.
-- Run this file manually against cms_btech. Uses existing events, event_schedules,
-- event_registrations, meetings, meeting_participants, users, students, classrooms,
-- role_permissions, user_roles and roles tables.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_mev_validate_event$$
CREATE PROCEDURE sp_mev_validate_event(
    IN p_event_id BIGINT,
    IN p_action VARCHAR(20),
    IN p_actor_user_id BIGINT,
    IN p_college_id BIGINT,
    IN p_is_super_admin TINYINT,
    IN p_participant_user_ids JSON
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_start DATETIME;
    DECLARE v_end DATETIME;
    DECLARE v_status VARCHAR(30);
    DECLARE v_capacity INT;
    DECLARE v_registered INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_permission INT DEFAULT 0;

    SELECT COUNT(*) INTO v_exists FROM events
     WHERE event_id = p_event_id AND deleted_at IS NULL
       AND (p_is_super_admin = 1 OR college_id = p_college_id);
    IF v_exists = 0 THEN
        SELECT 'ENTITY_NOT_FOUND' Code, 'ERROR' Severity,
               'Event was not found or is outside your college scope.' Message,
               'EVENT' EntityType, p_event_id EntityId;
    ELSE
        SELECT college_id, start_at, end_at, status, max_participants
          INTO v_college_id, v_start, v_end, v_status, v_capacity
          FROM events WHERE event_id = p_event_id AND deleted_at IS NULL;

        SELECT COUNT(*) INTO v_permission
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.user_id AND ur.status = 1 AND ur.removed_at IS NULL
          JOIN roles r ON r.role_id = ur.role_id AND r.status = 1 AND r.deleted_at IS NULL
          JOIN role_permissions rp ON rp.role_id = r.role_id
         WHERE u.user_id = p_actor_user_id AND u.status = 1 AND u.deleted_at IS NULL
           AND (u.college_id = v_college_id OR p_is_super_admin = 1)
           AND UPPER(rp.module_key) IN ('EVENT_MANAGEMENT','EVENTS')
           AND CASE UPPER(p_action)
                 WHEN 'VIEW' THEN rp.can_view
                 WHEN 'CREATE' THEN rp.can_create
                 WHEN 'EDIT' THEN rp.can_edit
                 WHEN 'PUBLISH' THEN rp.can_edit
                 WHEN 'CANCEL' THEN rp.can_delete
                 ELSE 0 END = 1;

        SELECT 'EVENT_PERMISSION_CHECK' Code,
               CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'Actor has the required event permission.'
                    ELSE CONCAT('Actor lacks permission for action ', UPPER(p_action), ' on EVENT_MANAGEMENT.') END Message,
               'USER' EntityType, p_actor_user_id EntityId;

        SELECT 'EVENT_TIME_RANGE' Code,
               CASE WHEN v_end > v_start THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN v_end > v_start THEN 'Event end time is after start time.' ELSE 'Event end time must be after start time.' END Message,
               'EVENT' EntityType, p_event_id EntityId;

        SELECT 'EVENT_STATUS_ACTION' Code,
               CASE WHEN UPPER(p_action) IN ('VIEW','EDIT','CANCEL')
                         OR (UPPER(p_action) = 'PUBLISH' AND v_status = 'DRAFT')
                         OR (UPPER(p_action) = 'CREATE' AND v_status = 'DRAFT')
                    THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN UPPER(p_action) IN ('VIEW','EDIT','CANCEL')
                         OR (UPPER(p_action) = 'PUBLISH' AND v_status = 'DRAFT')
                         OR (UPPER(p_action) = 'CREATE' AND v_status = 'DRAFT')
                    THEN CONCAT('Action ', UPPER(p_action), ' is compatible with event status ', v_status, '.')
                    ELSE CONCAT('Action ', UPPER(p_action), ' is not allowed while event status is ', v_status, '.') END Message,
               'EVENT' EntityType, p_event_id EntityId;

        SELECT COUNT(*) INTO v_registered FROM event_registrations
         WHERE event_id = p_event_id AND status IN ('REGISTERED','CONFIRMED');
        SELECT 'EVENT_CAPACITY' Code,
               CASE WHEN v_capacity IS NULL OR v_registered <= v_capacity THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN v_capacity IS NULL THEN 'Event has unlimited capacity.'
                    WHEN v_registered <= v_capacity THEN CONCAT('Capacity is valid: ', v_registered, '/', v_capacity, ' registered.')
                    ELSE CONCAT('Event capacity exceeded: ', v_registered, '/', v_capacity, '.') END Message,
               'EVENT' EntityType, p_event_id EntityId;

        SELECT 'EVENT_SCHEDULE_BOUNDS' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'All scheduled sessions fit inside the parent event time range.'
                    ELSE CONCAT(COUNT(*), ' session(s) fall outside the parent event time range.') END Message,
               'EVENT' EntityType, p_event_id EntityId
          FROM event_schedules s
         WHERE s.event_id = p_event_id AND s.status <> 'CANCELLED'
           AND (s.start_at < v_start OR s.end_at > v_end OR s.end_at <= s.start_at);

        SELECT 'EVENT_SESSION_OVERLAP' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'No overlapping active sessions were found within this event.'
                    ELSE CONCAT(COUNT(*), ' overlapping session pair(s) were found.') END Message,
               'EVENT' EntityType, p_event_id EntityId
          FROM event_schedules a
          JOIN event_schedules b ON a.event_id = b.event_id AND a.schedule_id < b.schedule_id
             AND a.start_at < b.end_at AND b.start_at < a.end_at
         WHERE a.event_id = p_event_id AND a.status <> 'CANCELLED' AND b.status <> 'CANCELLED';

        IF p_participant_user_ids IS NOT NULL AND JSON_TYPE(p_participant_user_ids) = 'ARRAY'
           AND JSON_LENGTH(p_participant_user_ids) > 0 THEN
            SELECT 'EVENT_PARTICIPANT_VALIDITY' Code,
                   CASE WHEN COUNT(*) = JSON_LENGTH(p_participant_user_ids) THEN 'INFO' ELSE 'ERROR' END Severity,
                   CASE WHEN COUNT(*) = JSON_LENGTH(p_participant_user_ids) THEN 'All requested participants are active users in the event college.'
                        ELSE CONCAT('Only ', COUNT(*), ' of ', JSON_LENGTH(p_participant_user_ids), ' requested participant(s) are active users in the event college.') END Message,
                   'EVENT' EntityType, p_event_id EntityId
              FROM users u
              JOIN JSON_TABLE(p_participant_user_ids, '$[*]' COLUMNS(user_id BIGINT PATH '$')) j
                ON j.user_id = u.user_id
             WHERE u.status = 1 AND u.deleted_at IS NULL AND (u.college_id = v_college_id OR p_is_super_admin = 1);
        END IF;
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_mev_validate_meeting$$
CREATE PROCEDURE sp_mev_validate_meeting(
    IN p_meeting_id BIGINT,
    IN p_action VARCHAR(20),
    IN p_actor_user_id BIGINT,
    IN p_college_id BIGINT,
    IN p_is_super_admin TINYINT,
    IN p_participant_user_ids JSON
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_start DATETIME;
    DECLARE v_end DATETIME;
    DECLARE v_status VARCHAR(30);
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_permission INT DEFAULT 0;

    SELECT COUNT(*) INTO v_exists FROM meetings
     WHERE meeting_id = p_meeting_id AND deleted_at IS NULL
       AND (p_is_super_admin = 1 OR college_id = p_college_id);
    IF v_exists = 0 THEN
        SELECT 'ENTITY_NOT_FOUND' Code, 'ERROR' Severity,
               'Meeting was not found or is outside your college scope.' Message,
               'MEETING' EntityType, p_meeting_id EntityId;
    ELSE
        SELECT college_id, TIMESTAMP(meeting_date, start_time),
               CASE WHEN end_time IS NULL THEN TIMESTAMP(meeting_date, start_time)
                    ELSE TIMESTAMP(meeting_date, end_time) END, status
          INTO v_college_id, v_start, v_end, v_status
          FROM meetings WHERE meeting_id = p_meeting_id AND deleted_at IS NULL;

        SELECT COUNT(*) INTO v_permission
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.user_id AND ur.status = 1 AND ur.removed_at IS NULL
          JOIN roles r ON r.role_id = ur.role_id AND r.status = 1 AND r.deleted_at IS NULL
          JOIN role_permissions rp ON rp.role_id = r.role_id
         WHERE u.user_id = p_actor_user_id AND u.status = 1 AND u.deleted_at IS NULL
           AND (u.college_id = v_college_id OR p_is_super_admin = 1)
           AND UPPER(rp.module_key) IN ('MEETING_MANAGEMENT','MEETINGS')
           AND CASE UPPER(p_action)
                 WHEN 'VIEW' THEN rp.can_view
                 WHEN 'CREATE' THEN rp.can_create
                 WHEN 'EDIT' THEN rp.can_edit
                 WHEN 'INVITE' THEN rp.can_edit
                 WHEN 'CANCEL' THEN rp.can_delete
                 ELSE 0 END = 1;

        SELECT 'MEETING_PERMISSION_CHECK' Code,
               CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'Actor has the required meeting permission.'
                    ELSE CONCAT('Actor lacks permission for action ', UPPER(p_action), ' on MEETING_MANAGEMENT.') END Message,
               'USER' EntityType, p_actor_user_id EntityId;

        SELECT 'MEETING_TIME_RANGE' Code,
               CASE WHEN v_end > v_start THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN v_end > v_start THEN 'Meeting time range is valid.' ELSE 'Meeting end time must be later than start time; a NULL end time cannot be scheduled safely.' END Message,
               'MEETING' EntityType, p_meeting_id EntityId;

        SELECT 'MEETING_STATUS_ACTION' Code,
               CASE WHEN UPPER(p_action) IN ('VIEW','EDIT','INVITE')
                         OR (UPPER(p_action) = 'CANCEL' AND v_status <> 'COMPLETED')
                         OR (UPPER(p_action) = 'CREATE' AND v_status = 'SCHEDULED')
                    THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN UPPER(p_action) IN ('VIEW','EDIT','INVITE')
                         OR (UPPER(p_action) = 'CANCEL' AND v_status <> 'COMPLETED')
                         OR (UPPER(p_action) = 'CREATE' AND v_status = 'SCHEDULED')
                    THEN CONCAT('Action ', UPPER(p_action), ' is compatible with meeting status ', v_status, '.')
                    ELSE CONCAT('Action ', UPPER(p_action), ' is not allowed while meeting status is ', v_status, '.') END Message,
               'MEETING' EntityType, p_meeting_id EntityId;

        SELECT 'MEETING_PARTICIPANT_SCOPE' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'Existing meeting participants are active users in the meeting college.'
                    ELSE CONCAT(COUNT(*), ' existing participant(s) are inactive, deleted, or outside the meeting college.') END Message,
               'MEETING' EntityType, p_meeting_id EntityId
          FROM meeting_participants mp JOIN users u ON u.user_id = mp.user_id
         WHERE mp.meeting_id = p_meeting_id AND
               (u.status <> 1 OR u.deleted_at IS NOT NULL OR (u.college_id <> v_college_id AND p_is_super_admin = 0));

        SELECT 'MEETING_PARTICIPANT_CONFLICT' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'No participant has another non-cancelled meeting at the same time.'
                    ELSE CONCAT(COUNT(*), ' participant(s) have overlapping meetings.') END Message,
               'MEETING' EntityType, p_meeting_id EntityId
          FROM meeting_participants mp
          JOIN meetings other ON other.meeting_id <> p_meeting_id AND other.deleted_at IS NULL
             AND other.college_id = v_college_id AND other.status <> 'CANCELLED'
             AND TIMESTAMP(other.meeting_date, other.start_time) < v_end
             AND TIMESTAMP(other.meeting_date, COALESCE(other.end_time, other.start_time)) > v_start
          JOIN meeting_participants op ON op.meeting_id = other.meeting_id AND op.user_id = mp.user_id
         WHERE mp.meeting_id = p_meeting_id;

        IF p_participant_user_ids IS NOT NULL AND JSON_TYPE(p_participant_user_ids) = 'ARRAY'
           AND JSON_LENGTH(p_participant_user_ids) > 0 THEN
            SELECT 'MEETING_INVITEE_VALIDITY' Code,
                   CASE WHEN COUNT(*) = JSON_LENGTH(p_participant_user_ids) THEN 'INFO' ELSE 'ERROR' END Severity,
                   CASE WHEN COUNT(*) = JSON_LENGTH(p_participant_user_ids) THEN 'All requested invitees are active users in the meeting college.'
                        ELSE CONCAT('Only ', COUNT(*), ' of ', JSON_LENGTH(p_participant_user_ids), ' requested invitee(s) are active users in the meeting college.') END Message,
                   'MEETING' EntityType, p_meeting_id EntityId
              FROM users u
              JOIN JSON_TABLE(p_participant_user_ids, '$[*]' COLUMNS(user_id BIGINT PATH '$')) j
                ON j.user_id = u.user_id
             WHERE u.status = 1 AND u.deleted_at IS NULL AND (u.college_id = v_college_id OR p_is_super_admin = 1);
        END IF;
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_mev_validate_schedule$$
CREATE PROCEDURE sp_mev_validate_schedule(
    IN p_college_id BIGINT,
    IN p_title VARCHAR(250),
    IN p_start_at DATETIME,
    IN p_end_at DATETIME,
    IN p_classroom_id BIGINT,
    IN p_exclude_event_id BIGINT,
    IN p_exclude_meeting_id BIGINT,
    IN p_actor_user_id BIGINT,
    IN p_token_college_id BIGINT,
    IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_room_count INT DEFAULT 0;
    DECLARE v_permission INT DEFAULT 0;

    SELECT 'SCHEDULE_INPUT' Code,
           CASE WHEN p_end_at > p_start_at THEN 'INFO' ELSE 'ERROR' END Severity,
           CASE WHEN p_end_at > p_start_at THEN 'Schedule end is later than schedule start.' ELSE 'Schedule end must be later than schedule start.' END Message,
           'SCHEDULE' EntityType, NULL EntityId;

    SELECT 'SCHEDULE_COLLEGE_SCOPE' Code,
           CASE WHEN p_is_super_admin = 1 OR p_college_id = p_token_college_id THEN 'INFO' ELSE 'ERROR' END Severity,
           CASE WHEN p_is_super_admin = 1 OR p_college_id = p_token_college_id THEN 'Requested college is within the authenticated scope.' ELSE 'Requested college does not match the authenticated token.' END Message,
           'SCHEDULE' EntityType, NULL EntityId;

    SELECT COUNT(*) INTO v_permission
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id AND ur.status = 1 AND ur.removed_at IS NULL
      JOIN roles r ON r.role_id = ur.role_id AND r.status = 1 AND r.deleted_at IS NULL
      JOIN role_permissions rp ON rp.role_id = r.role_id
     WHERE u.user_id = p_actor_user_id AND u.status = 1 AND u.deleted_at IS NULL
       AND (u.college_id = p_college_id OR p_is_super_admin = 1)
       AND UPPER(rp.module_key) IN ('EVENT_MANAGEMENT','EVENTS','MEETING_MANAGEMENT','MEETINGS')
       AND (rp.can_create = 1 OR rp.can_edit = 1);

    SELECT 'SCHEDULE_PERMISSION_CHECK' Code,
           CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'INFO' ELSE 'ERROR' END Severity,
           CASE WHEN p_is_super_admin = 1 OR v_permission > 0 THEN 'Actor has schedule-management permission.' ELSE 'Actor lacks event/meeting schedule-management permission.' END Message,
           'USER' EntityType, p_actor_user_id EntityId;

    IF p_classroom_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_room_count FROM classrooms
         WHERE classroom_id = p_classroom_id AND college_id = p_college_id
           AND status = 1 AND deleted_at IS NULL;
        SELECT 'SCHEDULE_ROOM_VALIDITY' Code,
               CASE WHEN v_room_count = 1 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN v_room_count = 1 THEN 'Classroom is active and belongs to the requested college.' ELSE 'Classroom is missing, inactive, deleted, or belongs to another college.' END Message,
               'CLASSROOM' EntityType, p_classroom_id EntityId;

        SELECT 'SCHEDULE_ROOM_CONFLICT' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'No active event session uses this room during the requested time.'
                    ELSE CONCAT(COUNT(*), ' event session(s) overlap this room and time.') END Message,
               'CLASSROOM' EntityType, p_classroom_id EntityId
          FROM event_schedules s JOIN events e ON e.event_id = s.event_id
         WHERE s.classroom_id = p_classroom_id AND s.status <> 'CANCELLED'
           AND e.status <> 'CANCELLED' AND e.deleted_at IS NULL
           AND e.college_id = p_college_id
           AND (p_exclude_event_id IS NULL OR e.event_id <> p_exclude_event_id)
           AND s.start_at < p_end_at AND p_start_at < s.end_at;

        SELECT 'SCHEDULE_MEETING_ROOM_CONFLICT' Code,
               CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
               CASE WHEN COUNT(*) = 0 THEN 'No meeting uses this room during the requested time.'
                    ELSE CONCAT(COUNT(*), ' meeting(s) overlap this room and time.') END Message,
               'CLASSROOM' EntityType, p_classroom_id EntityId
          FROM meetings m
         WHERE m.deleted_at IS NULL AND m.status <> 'CANCELLED' AND m.college_id = p_college_id
           AND (p_exclude_meeting_id IS NULL OR m.meeting_id <> p_exclude_meeting_id)
           AND m.venue = (SELECT classroom_code FROM classrooms WHERE classroom_id = p_classroom_id)
           AND TIMESTAMP(m.meeting_date, m.start_time) < p_end_at
           AND TIMESTAMP(m.meeting_date, COALESCE(m.end_time, m.start_time)) > p_start_at;
    END IF;

    SELECT 'SCHEDULE_EVENT_CONFLICT' Code,
           CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
           CASE WHEN COUNT(*) = 0 THEN 'No non-cancelled event overlaps the requested time.'
                ELSE CONCAT(COUNT(*), ' event(s) overlap the requested time.') END Message,
           'SCHEDULE' EntityType, NULL EntityId
      FROM events e
     WHERE e.college_id = p_college_id AND e.deleted_at IS NULL AND e.status <> 'CANCELLED'
       AND (p_exclude_event_id IS NULL OR e.event_id <> p_exclude_event_id)
       AND e.start_at < p_end_at AND p_start_at < e.end_at;

    SELECT 'SCHEDULE_MEETING_CONFLICT' Code,
           CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END Severity,
           CASE WHEN COUNT(*) = 0 THEN 'No non-cancelled meeting overlaps the requested time.'
                ELSE CONCAT(COUNT(*), ' meeting(s) overlap the requested time.') END Message,
           'SCHEDULE' EntityType, NULL EntityId
      FROM meetings m
     WHERE m.college_id = p_college_id AND m.deleted_at IS NULL AND m.status <> 'CANCELLED'
       AND (p_exclude_meeting_id IS NULL OR m.meeting_id <> p_exclude_meeting_id)
       AND TIMESTAMP(m.meeting_date, m.start_time) < p_end_at
       AND TIMESTAMP(m.meeting_date, COALESCE(m.end_time, m.start_time)) > p_start_at;
END$$

DELIMITER ;
