using System.Data;
using Dapper;
using MySqlConnector;

namespace BTech.EventManagement;

/// <summary>Standalone additive module; existing controllers, services and DI are untouched.</summary>
public sealed class EventStore
{
    private readonly string _connection;
    private readonly ILogger? _logger;
    public EventStore(IConfiguration configuration, ILogger? logger = null)
    {
        var configuredConnection = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is required.");
        // Scope UUID handling to this module. CHAR(36) verification tokens are
        // text in the API/PDF, even when the provider default detects them as Guid.
        // Other modules retain their original connection configuration.
        var connection = new MySqlConnectionStringBuilder(configuredConnection)
        {
            GuidFormat = MySqlGuidFormat.None
        };
        _connection = connection.ConnectionString;
        _logger = logger;
    }

    private sealed class Session
    {
        public MySqlConnection Db { get; }
        public MySqlTransaction Tx { get; }
        public CancellationToken Ct { get; }
        public long CollegeId { get; set; }
        public long ActorId { get; set; }
        public DateTime Now { get; set; }
        public Session(MySqlConnection db, MySqlTransaction tx, CancellationToken ct) { Db = db; Tx = tx; Ct = ct; }
        private CommandDefinition Cmd(string sql, object? args) => new(sql, args, Tx, cancellationToken: Ct);
        public Task<int> Exec(string sql, object? args = null) => Db.ExecuteAsync(Cmd(sql,args));
        public Task<T> Scalar<T>(string sql, object? args = null) => Db.ExecuteScalarAsync<T>(Cmd(sql,args));
        public Task<dynamic?> One(string sql, object? args = null) => Db.QueryFirstOrDefaultAsync(Cmd(sql,args));
        public Task<T?> OneTyped<T>(string sql, object? args = null) where T : class
            => Db.QueryFirstOrDefaultAsync<T>(Cmd(sql,args));
        public Task<IEnumerable<dynamic>> Many(string sql, object? args = null) => Db.QueryAsync(Cmd(sql,args));
    }

    private async Task<T> Run<T>(EventActor actor, long? selected, CancellationToken ct, Func<Session,Task<T>> work)
    {
        if (selected is <= 0) throw new EventApiException(400,"collegeId must be positive.");
        await using var db = new MySqlConnection(_connection);
        await db.OpenAsync(ct);
        await using var tx = await db.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var s = new Session(db,tx,ct) { ActorId=actor.UserId };
        var u = await s.One("SELECT college_id FROM users WHERE user_id=@id AND status=1 AND deleted_at IS NULL",new {id=actor.UserId});
        if (u is null) throw new EventApiException(401,"The authenticated user is inactive or does not exist.");
        var roles = (await s.Many("""
            SELECT r.role_name AS name,r.role_code AS code FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=@id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL
            """,new {id=actor.UserId})).SelectMany(r=>new[]{((string)r.name).Replace(" ","").Replace("_","").ToUpperInvariant(),((string)r.code).Replace(" ","").Replace("_","").ToUpperInvariant()}).ToArray();
        bool super = roles.Contains("SUPERADMIN",StringComparer.Ordinal);
        if (!super && !roles.Any(r=>r is "ADMIN" or "COLLEGEADMIN" or "PRINCIPAL" or "HOD"))
            throw new EventApiException(403,"Event management requires Admin, Principal, HOD or SuperAdmin access.");
        long? home = u.college_id is null ? null : (long)u.college_id;
        if (!super && (home is null || (actor.TokenCollegeId.HasValue && actor.TokenCollegeId!=home) || (selected.HasValue && selected!=home)))
            throw new EventApiException(403,"The selected college is not authorized for this user.");
        s.CollegeId = super ? selected ?? throw new EventApiException(400,"SuperAdmin must supply collegeId.") : home!.Value;
        var college = await s.One("SELECT timezone FROM colleges WHERE college_id=@id AND status=1 AND deleted_at IS NULL",new {id=s.CollegeId});
        if (college is null) throw new EventApiException(404,"Active college not found.");
        try { s.Now=DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,TimeZoneInfo.FindSystemTimeZoneById((string?)college.timezone ?? "Asia/Kolkata")),DateTimeKind.Unspecified); }
        catch (TimeZoneNotFoundException) { throw new EventApiException(400,"The college timezone is invalid."); }
        catch (InvalidTimeZoneException) { throw new EventApiException(400,"The college timezone is invalid."); }
        var result=await work(s);
        await tx.CommitAsync(ct);
        return result;
    }
    private static void Need(bool condition,string message,int status=400) { if (!condition) throw new EventApiException(status,message); }
    private static string Text(string value,string field) { value=value.Trim();Need(value.Length>0,$"{field} is required.");return value; }
    private static string Choice(string value,string field,params string[] choices)
    { var n=Text(value,field).ToUpperInvariant();Need(choices.Contains(n),$"Invalid {field}. Allowed: {string.Join(", ",choices)}.");return n; }
    private static void DateRange(DateTime start,DateTime end)
    {
        Need(start.Year>=1000 && end.Year>=1000 && end>start,"Dates must be valid and endAt must be after startAt.");
        Need(start.Kind==DateTimeKind.Unspecified && end.Kind==DateTimeKind.Unspecified,"Use college-local dates without a timezone suffix.");
    }
    private static object View(dynamic row)
    {
        var values=(IDictionary<string,object>)row;
        return values.ToDictionary(k=>Camel(k.Key),k=>k.Value is DBNull ? null : k.Value);
    }
    private static string Camel(string name)
    { var parts=name.Split('_');return parts[0]+string.Concat(parts.Skip(1).Select(x=>char.ToUpperInvariant(x[0])+x[1..])); }
    private static async Task<dynamic> Event(Session s,long id,bool locked=true)
    {
        Need(id>0,"eventId must be positive.");
        var row=await s.One("SELECT * FROM events WHERE event_id=@id AND college_id=@college AND deleted_at IS NULL"+(locked?" FOR UPDATE":""),new {id,college=s.CollegeId});
        return row ?? throw new EventApiException(404,"Event not found in the selected college.");
    }
    private static async Task<dynamic> Child(Session s,long eventId,long id,string table,string key)
    {
        Need(id>0,"Record id must be positive.");
        // table/key are private, server-defined constants, never request parameters.
        var row=await s.One($"SELECT * FROM {table} WHERE {key}=@id AND event_id=@eventId"+(table=="event_gallery"?" AND deleted_at IS NULL":"")+" FOR UPDATE",new {id,eventId});
        return row ?? throw new EventApiException(404,"Event record not found.");
    }
    private static async Task Reference(Session s,string table,string key,long? id,bool collegeScoped)
    {
        if (!id.HasValue) return;
        Need(id>0,$"{key} must be positive.");
        var count=await s.Scalar<int>($"SELECT COUNT(*) FROM {table} WHERE {key}=@id AND status=1 AND deleted_at IS NULL"+(collegeScoped?" AND college_id=@college":""),new {id,college=s.CollegeId});
        Need(count==1,$"Active {table} record not found in the selected scope.");
    }
    private static async Task<int> Occupied(Session s,long eventId,long? excluding=null) => await s.Scalar<int>(
        "SELECT COUNT(*) FROM event_registrations WHERE event_id=@eventId AND status IN ('REGISTERED','CONFIRMED') AND (@excluding IS NULL OR registration_id<>@excluding)",new {eventId,excluding});
    private static async Task NoIssued(Session s,long eventId,long? registrationId=null)
    {
        var count=await s.Scalar<int>("""
            SELECT COUNT(*) FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id
            WHERE r.event_id=@eventId AND (@registrationId IS NULL OR r.registration_id=@registrationId) AND c.status='ISSUED'
            """,new {eventId,registrationId});
        Need(count==0,"Revoke issued certificates before changing this event or attendance/registration eligibility.",409);
    }
    private static void Page(int page,int size) => Need(page>=1 && page<=100000 && size>=1 && size<=100,"page must be 1..100000 and pageSize must be 1..100.");

    public Task<object> ListEvents(EventActor a,long? college,string? search,string? status,string? type,DateTime? from,DateTime? to,int page,int size,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        Page(page,size);if(status is not null) status=Choice(status,"status","DRAFT","PUBLISHED","ONGOING","COMPLETED","CANCELLED");
        if(type is not null) type=Choice(type,"eventType","TECHNICAL","CULTURAL","SPORTS","WORKSHOP","SEMINAR","OTHER");
        Need(from is null || to is null || from<=to,"from must be before to.");
        const string where="college_id=@college AND deleted_at IS NULL AND (@search IS NULL OR event_name LIKE @search OR event_code LIKE @search) AND (@status IS NULL OR status=@status) AND (@type IS NULL OR event_type=@type) AND (@from IS NULL OR end_at>=@from) AND (@to IS NULL OR start_at<=@to)";
        var args=new {college=s.CollegeId,search=string.IsNullOrWhiteSpace(search)?null:"%"+search.Trim()+"%",status,type,from,to,offset=(page-1)*size,size};
        var total=await s.Scalar<int>("SELECT COUNT(*) FROM events WHERE "+where,args);
        var rows=await s.Many("SELECT * FROM events WHERE "+where+" ORDER BY start_at DESC,event_id DESC LIMIT @size OFFSET @offset",args);
        return new {total,page,pageSize=size,items=rows.Select(r=>(object)View(r)).ToArray()};
    });
    public Task<object> GetEvent(EventActor a,long? college,long id,CancellationToken ct) => Run<object>(a,college,ct,async s=>View(await Event(s,id,false)));

    public Task<object> SaveEvent(EventActor a,long? college,long? id,EventRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        r.EventCode=Text(r.EventCode,"eventCode");r.EventName=Text(r.EventName,"eventName");
        r.EventType=Choice(r.EventType,"eventType","TECHNICAL","CULTURAL","SPORTS","WORKSHOP","SEMINAR","OTHER");
        r.Status=Choice(r.Status,"status","DRAFT","PUBLISHED","ONGOING","COMPLETED","CANCELLED");
        DateRange(r.StartAt,r.EndAt);
        if(!string.IsNullOrWhiteSpace(r.BannerPath))
        {
            r.BannerPath=r.BannerPath.Trim();
            Need((Uri.TryCreate(r.BannerPath,UriKind.Absolute,out var banner) && banner.Scheme==Uri.UriSchemeHttps) ||
                (r.BannerPath.StartsWith("/api/v1/events/",StringComparison.Ordinal) && !r.BannerPath.Contains("..",StringComparison.Ordinal)),
                "bannerPath must be an HTTPS URL or a protected event gallery API path.");
        }
        else r.BannerPath=null;
        Need(r.RegistrationFee>=0 && decimal.Round(r.RegistrationFee,2)==r.RegistrationFee,"registrationFee must be non-negative with at most two decimal places.");
        Need((!r.RegistrationOpensAt.HasValue || r.RegistrationOpensAt.Value.Year>=1000) && (!r.RegistrationClosesAt.HasValue || r.RegistrationClosesAt.Value.Year>=1000),"Registration dates must be valid.");
        Need((r.RegistrationOpensAt is null || r.RegistrationOpensAt.Value.Kind==DateTimeKind.Unspecified) && (r.RegistrationClosesAt is null || r.RegistrationClosesAt.Value.Kind==DateTimeKind.Unspecified),"Use college-local registration dates without a timezone suffix.");
        Need(r.RegistrationOpensAt is null || r.RegistrationOpensAt<=r.StartAt,"Registration opens after the event starts.");
        Need(r.RegistrationClosesAt is null || r.RegistrationClosesAt<=r.StartAt,"Registration closes after the event starts.");
        Need(r.RegistrationOpensAt is null || r.RegistrationClosesAt is null || r.RegistrationOpensAt<=r.RegistrationClosesAt,"Registration window is reversed.");
        Need(r.MaxParticipants is null || r.MaxParticipants>0,"maxParticipants must be positive.");
        if (r.Status=="COMPLETED") Need(r.EndAt<=s.Now,"A future event cannot be completed.");
        if (r.Status=="ONGOING") Need(r.StartAt<=s.Now && r.EndAt>s.Now,"Ongoing events must be within their event dates.");
        await Reference(s,"academicyears","academic_year_id",r.AcademicYearId,false);
        await Reference(s,"departments","department_id",r.DepartmentId,true);
        await Reference(s,"users","user_id",r.OrganizerUserId,true);
        if (r.AcademicYearId.HasValue) Need(await s.Scalar<int>("SELECT COUNT(*) FROM academicyears WHERE academic_year_id=@year AND start_date<=DATE(@start) AND end_date>=DATE(@end)",new {year=r.AcademicYearId,start=r.StartAt,end=r.EndAt})==1,"Event dates must be within the academic year.");
        if (id.HasValue)
        {
            var old=await Event(s,id.Value);
            Need(r.MaxParticipants is null || r.MaxParticipants>=await Occupied(s,id.Value),"Capacity is below existing active registrations.",409);
            Need(await s.Scalar<int>("SELECT COUNT(*) FROM event_schedules WHERE event_id=@id AND status<>'CANCELLED' AND (start_at<@start OR end_at>@end)",new {id,start=r.StartAt,end=r.EndAt})==0,"Existing sessions would be outside the new event dates.",409);
            if (!r.CertificateEnabled || r.Status!="COMPLETED" || (string)old.event_name!=r.EventName || (DateTime)old.start_at!=r.StartAt || (DateTime)old.end_at!=r.EndAt)
                await NoIssued(s,id.Value);
        }
        var args=new DynamicParameters(r);args.Add("college",s.CollegeId);args.Add("actor",s.ActorId);args.Add("id",id);
        if(id.HasValue) await s.Exec("""
            UPDATE events SET academic_year_id=@AcademicYearId,department_id=@DepartmentId,organizer_user_id=@OrganizerUserId,
            event_code=@EventCode,event_name=@EventName,event_type=@EventType,description=@Description,venue=@Venue,start_at=@StartAt,end_at=@EndAt,
            registration_opens_at=@RegistrationOpensAt,registration_closes_at=@RegistrationClosesAt,max_participants=@MaxParticipants,
            registration_fee=@RegistrationFee,certificate_enabled=@CertificateEnabled,banner_path=@BannerPath,status=@Status,updated_by=@actor WHERE event_id=@id AND college_id=@college
            """,args);
        else id=await s.Scalar<long>("""
            INSERT INTO events (college_id,academic_year_id,department_id,organizer_user_id,event_code,event_name,event_type,description,venue,start_at,end_at,
            registration_opens_at,registration_closes_at,max_participants,registration_fee,certificate_enabled,banner_path,status,created_by)
            VALUES (@college,@AcademicYearId,@DepartmentId,@OrganizerUserId,@EventCode,@EventName,@EventType,@Description,@Venue,@StartAt,@EndAt,
            @RegistrationOpensAt,@RegistrationClosesAt,@MaxParticipants,@RegistrationFee,@CertificateEnabled,@BannerPath,@Status,@actor); SELECT LAST_INSERT_ID();
            """,args);
        if (r.Status=="CANCELLED")
        {
            await s.Exec("UPDATE event_schedules SET status='CANCELLED',updated_by=@actor WHERE event_id=@id",new {id,actor=s.ActorId});
            await s.Exec("UPDATE event_registrations SET status='CANCELLED',updated_by=@actor WHERE event_id=@id",new {id,actor=s.ActorId});
        }
        return View(await Event(s,id.Value,false));
    });
    public Task<object> DeleteEvent(EventActor a,long? college,long id,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,id);await NoIssued(s,id);
        Need(await s.Scalar<int>("SELECT COUNT(*) FROM event_registrations WHERE event_id=@id AND status<>'CANCELLED'",new {id})==0,"Cancel registrations before deleting the event.",409);
        await s.Exec("UPDATE event_schedules SET status='CANCELLED',updated_by=@actor WHERE event_id=@id",new {id,actor=s.ActorId});
        await s.Exec("UPDATE events SET deleted_at=@now,deleted_by=@actor,updated_by=@actor WHERE event_id=@id",new {id,now=s.Now,actor=s.ActorId});
        return new {eventId=id,deleted=true};
    });

    public Task<object> ListChildren(EventActor a,long? college,long eventId,string entity,int page,int size,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId,false);Page(page,size);
        var (table,key)=entity switch {"registrations"=>("event_registrations","registration_id"),"schedules"=>("event_schedules","schedule_id"),"gallery"=>("event_gallery","gallery_id"),_=>throw new EventApiException(400,"Unknown record type.")};
        var where="event_id=@eventId"+(entity=="gallery"?" AND deleted_at IS NULL":"");
        var args=new {eventId,size,offset=(page-1)*size};
        var total=await s.Scalar<int>($"SELECT COUNT(*) FROM {table} WHERE {where}",args);
        var rows=await s.Many($"SELECT * FROM {table} WHERE {where} ORDER BY {key} DESC LIMIT @size OFFSET @offset",args);
        return new {total,page,pageSize=size,items=rows.Select(r=>(object)View(r)).ToArray()};
    });
    public Task<object> GetChild(EventActor a,long? college,long eventId,long id,string entity,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId,false);
        var (table,key)=entity switch {"registrations"=>("event_registrations","registration_id"),"schedules"=>("event_schedules","schedule_id"),"gallery"=>("event_gallery","gallery_id"),_=>throw new EventApiException(400,"Unknown record type.")};
        return View(await Child(s,eventId,id,table,key));
    });
    public Task<object> Register(EventActor a,long? college,long eventId,RegistrationRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        var e=await Event(s,eventId);
        Need((string)e.status=="PUBLISHED" && s.Now<(DateTime)e.start_at,"Registrations require a published event before its start.",409);
        Need((e.registration_opens_at is null || s.Now>=(DateTime)e.registration_opens_at) && (e.registration_closes_at is null || s.Now<=(DateTime)e.registration_closes_at),"The registration window is closed.",409);
        r.ParticipantType=Choice(r.ParticipantType,"participantType","STUDENT","STAFF","EXTERNAL");
        string name;string? email;string? mobile;
        if (r.ParticipantType=="STUDENT")
        {
            Need(r.StudentId.HasValue && r.UserId is null,"Student registration requires studentId only.");
            await Reference(s,"students","student_id",r.StudentId,true);
            var student=await s.One("SELECT full_name,email,mobile FROM students WHERE student_id=@id",new {id=r.StudentId});
            name=(string)student!.full_name;email=(string?)student.email;mobile=(string?)student.mobile;
        }
        else if(r.ParticipantType=="STAFF")
        {
            Need(r.UserId.HasValue && r.StudentId is null,"Staff registration requires userId only.");
            await Reference(s,"users","user_id",r.UserId,true);
            var user=await s.One("SELECT full_name,email,mobile FROM users WHERE user_id=@id",new {id=r.UserId});
            name=(string)user!.full_name;email=(string?)user.email;mobile=(string?)user.mobile;
        }
        else
        {
            Need(r.StudentId is null && r.UserId is null && !string.IsNullOrWhiteSpace(r.Email),"External registration requires email and no studentId/userId.");
            name=Text(r.ParticipantName??"","participantName");email=r.Email!.Trim().ToLowerInvariant();mobile=r.Mobile?.Trim();
        }
        var duplicate=await s.One("""
            SELECT registration_id,status FROM event_registrations WHERE event_id=@eventId AND
            ((@student IS NOT NULL AND student_id=@student) OR (@user IS NOT NULL AND user_id=@user) OR
            (@type='EXTERNAL' AND external_email=@email)) FOR UPDATE
            """,new {eventId,student=r.StudentId,user=r.UserId,type=r.ParticipantType,email});
        if(duplicate is not null) Need((string)duplicate.status=="CANCELLED","Participant is already registered.",409);
        string status=e.max_participants is not null && await Occupied(s,eventId)>=(int)e.max_participants ? "WAITLISTED" : "CONFIRMED";
        var args=new {eventId,number="EREG-"+Guid.NewGuid().ToString("N"),type=r.ParticipantType,student=r.StudentId,user=r.UserId,name,email,mobile,status,fee=(decimal)e.registration_fee,remarks=r.Remarks,actor=s.ActorId,now=s.Now,id=duplicate is null?(long?)null:(long)duplicate.registration_id};
        long id;
        if(duplicate is not null)
        {
            id=(long)duplicate.registration_id;await NoIssued(s,eventId,id);
            await s.Exec("UPDATE event_registrations SET participant_name=@name,email=@email,mobile=@mobile,registered_at=@now,status=@status,attendance_status='NOT_MARKED',checked_in_at=NULL,fee_amount=@fee,remarks=@remarks,updated_by=@actor WHERE registration_id=@id",args);
        }
        else id=await s.Scalar<long>("""
            INSERT INTO event_registrations (event_id,registration_number,participant_type,student_id,user_id,participant_name,email,mobile,registered_at,status,fee_amount,remarks,created_by)
            VALUES (@eventId,@number,@type,@student,@user,@name,@email,@mobile,@now,@status,@fee,@remarks,@actor); SELECT LAST_INSERT_ID();
            """,args);
        return View(await Child(s,eventId,id,"event_registrations","registration_id"));
    });
    public Task<object> RegistrationStatus(EventActor a,long? college,long eventId,long id,string status,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        var e=await Event(s,eventId);var r=await Child(s,eventId,id,"event_registrations","registration_id");
        status=Choice(status,"status","REGISTERED","CONFIRMED","WAITLISTED","CANCELLED");
        if((string)r.status==status) return View(r);
        await NoIssued(s,eventId,id);
        if(status!="CANCELLED") Need((string)e.status is "PUBLISHED" or "ONGOING","This event does not accept registration changes.",409);
        if(status is "REGISTERED" or "CONFIRMED") Need(e.max_participants is null || await Occupied(s,eventId,id)<(int)e.max_participants,"Event capacity is full.",409);
        await s.Exec("UPDATE event_registrations SET status=@status,updated_by=@actor WHERE registration_id=@id",new {id,status,actor=s.ActorId});
        return View(await Child(s,eventId,id,"event_registrations","registration_id"));
    });
    public Task<object> Attendance(EventActor a,long? college,long eventId,long id,AttendanceRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        var e=await Event(s,eventId);var reg=await Child(s,eventId,id,"event_registrations","registration_id");
        Need((string)reg.status=="CONFIRMED","Only confirmed participants can have attendance marked.",409);
        Need((string)e.status is "ONGOING" or "COMPLETED","Mark attendance when the event is ongoing or completed.",409);
        await NoIssued(s,eventId,id);
        r.AttendanceStatus=Choice(r.AttendanceStatus,"attendanceStatus","NOT_MARKED","PRESENT","ABSENT");
        Need(r.AttendanceStatus=="PRESENT" || r.CheckedInAt is null,"checkedInAt is only allowed for PRESENT.");
        DateTime? time=r.AttendanceStatus=="PRESENT" ? r.CheckedInAt ?? s.Now : null;
        Need(time is null || (time.Value.Kind==DateTimeKind.Unspecified && time>=(DateTime)reg.registered_at && time<=s.Now),"Check-in must be college-local, after registration and not in the future.");
        await s.Exec("UPDATE event_registrations SET attendance_status=@attendance,checked_in_at=@time,updated_by=@actor WHERE registration_id=@id",new {id,attendance=r.AttendanceStatus,time,actor=s.ActorId});
        return View(await Child(s,eventId,id,"event_registrations","registration_id"));
    });
    private static async Task ValidateSchedule(Session s,dynamic e,long eventId,long? id,ScheduleRequest r)
    {
        r.SessionCode=Text(r.SessionCode,"sessionCode");r.SessionTitle=Text(r.SessionTitle,"sessionTitle");
        r.Status=Choice(r.Status,"status","SCHEDULED","ONGOING","COMPLETED","CANCELLED");DateRange(r.StartAt,r.EndAt);
        Need(r.StartAt>=(DateTime)e.start_at && r.EndAt<=(DateTime)e.end_at,"Session dates must be within event dates.");
        Need(r.EndAt-r.StartAt<=TimeSpan.FromDays(366),"A session cannot span more than 366 days.");
        Need(r.DisplayOrder>=0,"displayOrder must be non-negative.");
        await Reference(s,"users","user_id",r.SpeakerUserId,true);
        if(r.SpeakerUserId.HasValue)
        {
            var speaker=await s.One("SELECT full_name FROM users WHERE user_id=@id AND college_id=@college AND status=1 AND deleted_at IS NULL FOR UPDATE",new {id=r.SpeakerUserId,college=s.CollegeId});
            Need(speaker is not null,"Active speaker not found in this college.");
            r.SpeakerName=(string)speaker!.full_name;
        }
        if(r.Status=="CANCELLED") return;
        Need((string)e.status!="CANCELLED","Cannot schedule a cancelled event.",409);
        if(r.ClassroomId.HasValue)
        {
            var room=await s.One("SELECT classroom_id FROM classrooms WHERE classroom_id=@room AND college_id=@college AND status=1 AND deleted_at IS NULL FOR UPDATE",new {room=r.ClassroomId,college=s.CollegeId});
            Need(room is not null,"Active classroom not found in this college.");
        }
        var clashes=await s.Scalar<int>("""
            SELECT COUNT(*) FROM event_schedules es JOIN events ev ON ev.event_id=es.event_id
            WHERE ev.college_id=@college AND ev.deleted_at IS NULL AND ev.status<>'CANCELLED' AND es.status<>'CANCELLED'
            AND (@id IS NULL OR es.schedule_id<>@id) AND es.start_at<@end AND es.end_at>@start
            AND (es.event_id=@eventId OR (@room IS NOT NULL AND es.classroom_id=@room) OR (@speaker IS NOT NULL AND es.speaker_user_id=@speaker))
            """,new {college=s.CollegeId,id,eventId,start=r.StartAt,end=r.EndAt,room=r.ClassroomId,speaker=r.SpeakerUserId});
        Need(clashes==0,"Session overlaps another session in this event, classroom or speaker schedule.",409);
        if(!r.ClassroomId.HasValue) return;
        var exam=await s.Scalar<int>("""
            SELECT COUNT(*) FROM exam_schedules x WHERE x.status=1 AND x.deleted_at IS NULL
            AND TIMESTAMP(x.exam_date,x.start_time)<@end AND TIMESTAMP(x.exam_date,x.end_time)>@start
            AND (x.classroom_id=@room OR EXISTS (SELECT 1 FROM exam_hall_allocations h WHERE h.exam_schedule_id=x.exam_schedule_id
            AND h.classroom_id=@room AND h.status=1 AND h.deleted_at IS NULL))
            """,new {room=r.ClassroomId,start=r.StartAt,end=r.EndAt});
        Need(exam==0,"Classroom is booked for an exam during this session.",409);
        for(var day=r.StartAt.Date;day<r.EndAt;day=day.AddDays(1))
        {
            var start=day==r.StartAt.Date?r.StartAt.TimeOfDay:TimeSpan.Zero;
            var end=day==r.EndAt.Date?r.EndAt.TimeOfDay:TimeSpan.FromDays(1);
            var iso=day.DayOfWeek==DayOfWeek.Sunday?7:(int)day.DayOfWeek;
            var n=await s.Scalar<int>("""
                SELECT COUNT(*) FROM timetable_entries te JOIN timetable_slots ts ON ts.timetable_slot_id=te.timetable_slot_id
                JOIN timetables tt ON tt.timetable_id=te.timetable_id JOIN academicyears ay ON ay.academic_year_id=tt.academic_year_id
                WHERE te.classroom_id=@room AND te.status=1 AND ts.status=1 AND (tt.is_published=1 OR tt.status IN ('PUBLISHED','ACTIVE'))
                AND UPPER(TRIM(te.day_of_week)) IN (@dayName,@iso) AND COALESCE(tt.effective_from,ay.start_date)<=@date
                AND COALESCE(tt.effective_to,ay.end_date)>=@date AND ts.start_time<@end AND ts.end_time>@start
                """,new {room=r.ClassroomId,dayName=day.DayOfWeek.ToString().ToUpperInvariant(),iso=iso.ToString(),date=day,start,end});
            Need(n==0,"Classroom is booked in a published timetable during this session.",409);
        }
    }
    public Task<object> SaveSchedule(EventActor a,long? college,long eventId,long? id,ScheduleRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        var e=await Event(s,eventId);
        if(id.HasValue) await Child(s,eventId,id.Value,"event_schedules","schedule_id");
        await ValidateSchedule(s,e,eventId,id,r);
        var args=new DynamicParameters(r);args.Add("eventId",eventId);args.Add("actor",s.ActorId);args.Add("id",id);
        if(id.HasValue) await s.Exec("""
            UPDATE event_schedules SET session_code=@SessionCode,session_title=@SessionTitle,description=@Description,start_at=@StartAt,end_at=@EndAt,
            classroom_id=@ClassroomId,venue=@Venue,speaker_name=@SpeakerName,speaker_user_id=@SpeakerUserId,display_order=@DisplayOrder,status=@Status,updated_by=@actor
            WHERE schedule_id=@id AND event_id=@eventId
            """,args);
        else id=await s.Scalar<long>("""
            INSERT INTO event_schedules (event_id,session_code,session_title,description,start_at,end_at,classroom_id,venue,speaker_name,speaker_user_id,display_order,status,created_by)
            VALUES (@eventId,@SessionCode,@SessionTitle,@Description,@StartAt,@EndAt,@ClassroomId,@Venue,@SpeakerName,@SpeakerUserId,@DisplayOrder,@Status,@actor); SELECT LAST_INSERT_ID();
            """,args);
        return View(await Child(s,eventId,id.Value,"event_schedules","schedule_id"));
    });
    public Task<object> DeleteSchedule(EventActor a,long? college,long eventId,long id,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId);await Child(s,eventId,id,"event_schedules","schedule_id");
        // Retain schedule history: DELETE logically cancels this session.
        await s.Exec("UPDATE event_schedules SET status='CANCELLED',updated_by=@actor WHERE schedule_id=@id AND event_id=@eventId",new {id,eventId,actor=s.ActorId});
        return new {scheduleId=id,status="CANCELLED"};
    });

    public Task<object> IssueCertificate(EventActor a,long? college,long eventId,CertificateRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        var e=await Event(s,eventId);var reg=await Child(s,eventId,r.RegistrationId,"event_registrations","registration_id");
        Need(Convert.ToBoolean(e.certificate_enabled) && (string)e.status=="COMPLETED" && (DateTime)e.end_at<=s.Now,"Certificates require a completed event with certificates enabled.",409);
        Need((string)reg.status=="CONFIRMED" && (string)reg.attendance_status=="PRESENT","Certificates require a confirmed participant marked PRESENT.",409);
        r.CertificateType=Choice(r.CertificateType,"certificateType","PARTICIPATION","COMPLETION","MERIT","WINNER");r.Title=Text(r.Title,"title");
        var number="ECERT-"+Guid.NewGuid().ToString("N").ToUpperInvariant();var token=Guid.NewGuid().ToString();
        var id=await s.Scalar<long>("""
            INSERT INTO event_certificates (registration_id,certificate_number,certificate_type,recipient_name,title,verification_token,issued_at,issued_by,created_by)
            VALUES (@registration,@number,@type,@name,@title,@token,@now,@actor,@actor); SELECT LAST_INSERT_ID();
            """,new {registration=r.RegistrationId,number,type=r.CertificateType,name=(string)reg.participant_name,title=r.Title,token,now=s.Now,actor=s.ActorId});
        await s.Exec("UPDATE event_certificates SET certificate_path=@path WHERE certificate_id=@id",new {id,path=$"/api/v1/events/{eventId}/certificates/{id}/download"});
        return View(await Certificate(s,eventId,id));
    });
    private static async Task<dynamic> Certificate(Session s,long eventId,long id)
    {
        Need(id>0,"certificateId must be positive.");
        var c=await s.One("""
            SELECT c.*,r.event_id,e.event_name FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id
            JOIN events e ON e.event_id=r.event_id WHERE c.certificate_id=@id AND e.event_id=@eventId AND e.college_id=@college AND e.deleted_at IS NULL FOR UPDATE
            """,new {id,eventId,college=s.CollegeId});
        return c ?? throw new EventApiException(404,"Certificate not found for this event.");
    }
    public Task<object> GetCertificate(EventActor a,long? college,long eventId,long id,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {await Event(s,eventId,false);return View(await Certificate(s,eventId,id));});
    public Task<object> ListCertificates(EventActor a,long? college,long eventId,int page,int size,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId,false);Page(page,size);var args=new {eventId,size,offset=(page-1)*size};
        var total=await s.Scalar<int>("SELECT COUNT(*) FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id WHERE r.event_id=@eventId",args);
        var rows=await s.Many("SELECT c.*,r.event_id FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id WHERE r.event_id=@eventId ORDER BY c.certificate_id DESC LIMIT @size OFFSET @offset",args);
        return new {total,page,pageSize=size,items=rows.Select(r=>(object)View(r)).ToArray()};
    });
    public Task<object> RevokeCertificate(EventActor a,long? college,long eventId,long id,string reason,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId);var c=await Certificate(s,eventId,id);reason=Text(reason,"reason");
        if((string)c.status!="REVOKED") await s.Exec("UPDATE event_certificates SET status='REVOKED',revoked_at=@now,revoked_by=@actor,revocation_reason=@reason,updated_by=@actor WHERE certificate_id=@id",new {id,now=s.Now,actor=s.ActorId,reason});
        return View(await Certificate(s,eventId,id));
    });
    public Task<object> VerifyCertificate(EventActor a,long? college,string token,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        Need(Guid.TryParse(token,out _),"Invalid verification token.");
        var row=await s.One("""
            SELECT c.certificate_id,c.certificate_number,c.recipient_name,c.title,c.certificate_type,c.status,c.issued_at,e.event_id,e.event_name,
            (c.status='ISSUED' AND e.status='COMPLETED' AND e.certificate_enabled=1 AND r.status='CONFIRMED' AND r.attendance_status='PRESENT') AS valid
            FROM event_certificates c JOIN event_registrations r ON r.registration_id=c.registration_id JOIN events e ON e.event_id=r.event_id
            WHERE c.verification_token=@token AND e.college_id=@college AND e.deleted_at IS NULL
            """,new {token,college=s.CollegeId});
        if(row is null) throw new EventApiException(404,"Certificate verification token not found.");
        return new {valid=(bool)Convert.ToBoolean(row.valid),certificate=View(row)};
    });
    private sealed class CertificateDownloadRow
    {
        public long CertificateId { get; set; }
        public string CertificateStatus { get; set; } = "";
        public string EventStatus { get; set; } = "";
        public bool CertificateEnabled { get; set; }
        public string RegistrationStatus { get; set; } = "";
        public string AttendanceStatus { get; set; } = "";
        public string Title { get; set; } = "";
        public string RecipientName { get; set; } = "";
        public string EventName { get; set; } = "";
        public string CertificateNumber { get; set; } = "";
        // MySqlConnector can return a CHAR(36) UUID as System.Guid. Keep the
        // provider value here and normalize it before validation/PDF rendering.
        public object? VerificationToken { get; set; }
        public DateTime IssuedAt { get; set; }
    }
    public Task<byte[]> CertificatePdf(EventActor a,long? college,long eventId,long id,CancellationToken ct) => Run<byte[]>(a,college,ct,async s=>
    {
        Need(eventId>0 && id>0,"eventId and certificateId must be positive.");
        // Check parent scope first; never use certificate_path as a filesystem path.
        var eventExists=await s.Scalar<int>("SELECT COUNT(*) FROM events WHERE event_id=@eventId AND college_id=@college AND deleted_at IS NULL",
            new {eventId,college=s.CollegeId});
        Need(eventExists==1,"Event not found in the selected college.",404);
        _logger?.LogInformation("Certificate download lookup. EventId={EventId}, CertificateId={CertificateId}, CollegeId={CollegeId}",eventId,id,s.CollegeId);
        var row=await s.OneTyped<CertificateDownloadRow>("""
            SELECT c.certificate_id AS CertificateId,c.status AS CertificateStatus,e.status AS EventStatus,
                   e.certificate_enabled AS CertificateEnabled,r.status AS RegistrationStatus,r.attendance_status AS AttendanceStatus,
                   c.title AS Title,c.recipient_name AS RecipientName,e.event_name AS EventName,
                   c.certificate_number AS CertificateNumber,c.verification_token AS VerificationToken,c.issued_at AS IssuedAt
            FROM event_certificates c
            INNER JOIN event_registrations r ON r.registration_id=c.registration_id
            INNER JOIN events e ON e.event_id=r.event_id
            WHERE c.certificate_id=@id AND e.event_id=@eventId AND e.college_id=@college AND e.deleted_at IS NULL
            FOR UPDATE
            """,new {id,eventId,college=s.CollegeId});
        if(row is null) throw new EventApiException(404,"Certificate not found for this event.");
        string verificationToken = row.VerificationToken switch
        {
            Guid token => token.ToString("D"),
            string token => token,
            _ => ""
        };
        Need(row.CertificateStatus=="ISSUED" && row.EventStatus=="COMPLETED" && row.CertificateEnabled
            && row.RegistrationStatus=="CONFIRMED" && row.AttendanceStatus=="PRESENT",
            "This certificate is not valid for download. Check event completion, certificate status and participant attendance.",409);
        Need(!string.IsNullOrWhiteSpace(row.Title) && !string.IsNullOrWhiteSpace(row.RecipientName)
            && !string.IsNullOrWhiteSpace(row.EventName) && !string.IsNullOrWhiteSpace(row.CertificateNumber)
            && Guid.TryParse(verificationToken,out _) && row.IssuedAt.Year>=1000,
            "Certificate data is incomplete or invalid. Correct the stored certificate details before downloading.",409);
        _logger?.LogInformation("Certificate PDF generation started. EventId={EventId}, CertificateId={CertificateId}",eventId,id);
        byte[] pdf=EventPdf.Create(row.Title,row.RecipientName,row.EventName,row.CertificateNumber,verificationToken,row.IssuedAt);
        Need(pdf.Length>5 && pdf[0]=='%' && pdf[1]=='P' && pdf[2]=='D' && pdf[3]=='F',"Certificate PDF generation failed.",500);
        _logger?.LogInformation("Certificate PDF generation completed. EventId={EventId}, CertificateId={CertificateId}, PdfBytes={PdfBytes}",eventId,id,pdf.Length);
        return pdf;
    });

    public Task<object> SaveGallery(EventActor a,long? college,long eventId,long? id,GalleryRequest r,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId);r.MediaCode=Text(r.MediaCode,"mediaCode");r.Title=Text(r.Title,"title");
        r.MediaType=Choice(r.MediaType,"mediaType","IMAGE","VIDEO");r.Status=Choice(r.Status,"status","DRAFT","PUBLISHED","HIDDEN");Need(r.DisplayOrder>=0,"displayOrder must be non-negative.");
        if(id.HasValue)
        {
            var old=await Child(s,eventId,id.Value,"event_gallery","gallery_id");
            Need(old.file_path is null || (string)old.media_type==r.MediaType,"Cannot change mediaType while an uploaded file exists.",409);
            Need(r.Status!="PUBLISHED" || old.file_path is not null,"Upload a file before publishing.",409);
        }
        else Need(r.Status!="PUBLISHED","Create gallery metadata as DRAFT, then upload a file and publish.");
        var args=new DynamicParameters(r);args.Add("eventId",eventId);args.Add("actor",s.ActorId);args.Add("id",id);
        if(id.HasValue) await s.Exec("UPDATE event_gallery SET media_code=@MediaCode,media_type=@MediaType,title=@Title,caption=@Caption,display_order=@DisplayOrder,status=@Status,updated_by=@actor WHERE gallery_id=@id AND event_id=@eventId",args);
        else id=await s.Scalar<long>("INSERT INTO event_gallery (event_id,media_code,media_type,title,caption,display_order,status,created_by) VALUES (@eventId,@MediaCode,@MediaType,@Title,@Caption,@DisplayOrder,@Status,@actor); SELECT LAST_INSERT_ID();",args);
        return View(await Child(s,eventId,id.Value,"event_gallery","gallery_id"));
    });
    public Task<object> SetGalleryFile(EventActor a,long? college,long eventId,long id,string filePath,string mediaType,string mime,long size,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId);var old=await Child(s,eventId,id,"event_gallery","gallery_id");
        Need((string)old.media_type==mediaType,"Uploaded file type does not match the gallery mediaType.");
        // Allow replacing an existing gallery file. The new file is written first by the controller;
        // this update switches the database record to the new server-generated filename.
        // This also repairs stale file_path values when the previous physical file is missing.
        await s.Exec("UPDATE event_gallery SET file_path=@filePath,mime_type=@mime,file_size_bytes=@size,uploaded_at=@now,uploaded_by=@actor,updated_by=@actor WHERE gallery_id=@id AND event_id=@eventId",new {id,eventId,filePath,mime,size,now=s.Now,actor=s.ActorId});
        return View(await Child(s,eventId,id,"event_gallery","gallery_id"));
    });
    public Task<(string Path,string Mime)> GalleryFile(EventActor a,long? college,long eventId,long id,CancellationToken ct) => Run<(string Path,string Mime)>(a,college,ct,async s=>
    {
        await Event(s,eventId,false);var row=await Child(s,eventId,id,"event_gallery","gallery_id");
        Need(row.file_path is not null,"This gallery item has no uploaded file.",404);
        return ((string)row.file_path,(string?)row.mime_type??"application/octet-stream");
    });
    public Task<object> DeleteGallery(EventActor a,long? college,long eventId,long id,CancellationToken ct) => Run<object>(a,college,ct,async s=>
    {
        await Event(s,eventId);await Child(s,eventId,id,"event_gallery","gallery_id");
        await s.Exec("UPDATE event_gallery SET status='HIDDEN',deleted_at=@now,deleted_by=@actor,updated_by=@actor WHERE gallery_id=@id AND event_id=@eventId",new {id,eventId,now=s.Now,actor=s.ActorId});
        return new {galleryId=id,deleted=true};
    });
}
