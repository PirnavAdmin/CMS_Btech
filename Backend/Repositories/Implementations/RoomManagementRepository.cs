using System.Text.Json;
using BTech.DTOs.Rooms;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class RoomManagementRepository : IRoomManagementRepository
{
    private readonly string _connectionString;
    private readonly ILogger<RoomManagementRepository> _logger;

    public RoomManagementRepository(IConfiguration configuration, ILogger<RoomManagementRepository> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
    }

    private MySqlConnection CreateConnection() => new(_connectionString);

    public async Task<List<RoomDirectoryDto>> GetRoomsAsync(long collegeId, string? search, string? roomType, string? buildingBlock, string? availabilityStatus)
    {
        const string sql = """
            SELECT c.classroom_id AS Id,c.college_id AS CollegeId,c.classroom_code AS RoomNumber,c.classroom_name AS RoomName,
                   COALESCE(c.building_block,'') AS BuildingBlock,COALESCE(c.floor_name,'') AS Floor,COALESCE(c.room_type,'') AS RoomType,
                   COALESCE(c.capacity,0) AS Capacity,c.facilities_json AS FacilitiesJson,
                   COALESCE(c.department_name,'General / Shared') AS Department,
                   CASE UPPER(COALESCE(c.availability_status,'AVAILABLE'))
                     WHEN 'ALLOCATED' THEN 'Allocated' WHEN 'MAINTENANCE' THEN 'Maintenance' WHEN 'INACTIVE' THEN 'Inactive' ELSE 'Available' END AS Status,
                   c.allocated_section_id AS AssignedSectionId,COALESCE(s.section_name,'') AS AssignedSection,
                   s.section_code AS SectionCode,co.course_name AS CourseName,co.course_code AS CourseCode,
                   b.branch_name AS BranchName,b.branch_code AS BranchCode,sem.semester_name AS SemesterName,
                   CAST((SELECT COUNT(*) FROM student_section_assignments ssa WHERE ssa.section_id=c.allocated_section_id AND ssa.status=1 AND ssa.removed_at IS NULL) AS SIGNED) AS AssignedStudentCount,
                   c.description AS Description,c.created_at AS CreatedAt,c.updated_at AS UpdatedAt
            FROM classrooms c
            LEFT JOIN sections s ON s.section_id=c.allocated_section_id AND s.deleted_at IS NULL
            LEFT JOIN courses co ON co.course_id=s.course_id AND co.deleted_at IS NULL
            LEFT JOIN branches b ON b.branch_id=s.branch_id AND b.deleted_at IS NULL
            LEFT JOIN semesters sem ON sem.semester_id=s.semester_id
            WHERE c.college_id=@collegeId AND c.deleted_at IS NULL
              AND (@roomType IS NULL OR @roomType='' OR c.room_type=@roomType)
              AND (@buildingBlock IS NULL OR @buildingBlock='' OR c.building_block=@buildingBlock)
              AND (@availabilityStatus IS NULL OR @availabilityStatus='' OR UPPER(c.availability_status)=UPPER(@availabilityStatus))
              AND (@search IS NULL OR @search='' OR c.classroom_code LIKE CONCAT('%',@search,'%') OR c.classroom_name LIKE CONCAT('%',@search,'%') OR
                   COALESCE(c.building_block,'') LIKE CONCAT('%',@search,'%') OR COALESCE(c.floor_name,'') LIKE CONCAT('%',@search,'%') OR
                   COALESCE(c.room_type,'') LIKE CONCAT('%',@search,'%') OR COALESCE(s.section_name,'') LIKE CONCAT('%',@search,'%') OR
                   COALESCE(co.course_name,'') LIKE CONCAT('%',@search,'%') OR COALESCE(b.branch_name,'') LIKE CONCAT('%',@search,'%'))
            ORDER BY c.classroom_code;
            """;
        await using var connection = CreateConnection();
        var rows = await connection.QueryAsync<RoomDbRow>(sql, new { collegeId, search, roomType, buildingBlock, availabilityStatus = NormalizeDbStatus(availabilityStatus) });
        var result = rows.Select(Map).ToList();
        _logger.LogDebug("Loaded {Count} rooms. CollegeId={CollegeId}", result.Count, collegeId);
        return result;
    }

    public async Task<RoomDirectoryDto?> GetRoomAsync(long classroomId, long collegeId)
    {
        const string sql = """
            SELECT c.classroom_id AS Id,c.college_id AS CollegeId,c.classroom_code AS RoomNumber,c.classroom_name AS RoomName,
                   COALESCE(c.building_block,'') AS BuildingBlock,COALESCE(c.floor_name,'') AS Floor,COALESCE(c.room_type,'') AS RoomType,
                   COALESCE(c.capacity,0) AS Capacity,c.facilities_json AS FacilitiesJson,COALESCE(c.department_name,'General / Shared') AS Department,
                   CASE UPPER(COALESCE(c.availability_status,'AVAILABLE')) WHEN 'ALLOCATED' THEN 'Allocated' WHEN 'MAINTENANCE' THEN 'Maintenance' WHEN 'INACTIVE' THEN 'Inactive' ELSE 'Available' END AS Status,
                   c.allocated_section_id AS AssignedSectionId,COALESCE(s.section_name,'') AS AssignedSection,s.section_code AS SectionCode,
                   co.course_name AS CourseName,co.course_code AS CourseCode,b.branch_name AS BranchName,b.branch_code AS BranchCode,sem.semester_name AS SemesterName,
                   CAST((SELECT COUNT(*) FROM student_section_assignments ssa WHERE ssa.section_id=c.allocated_section_id AND ssa.status=1 AND ssa.removed_at IS NULL) AS SIGNED) AS AssignedStudentCount,
                   c.description AS Description,c.created_at AS CreatedAt,c.updated_at AS UpdatedAt
            FROM classrooms c
            LEFT JOIN sections s ON s.section_id=c.allocated_section_id AND s.deleted_at IS NULL
            LEFT JOIN courses co ON co.course_id=s.course_id AND co.deleted_at IS NULL
            LEFT JOIN branches b ON b.branch_id=s.branch_id AND b.deleted_at IS NULL
            LEFT JOIN semesters sem ON sem.semester_id=s.semester_id
            WHERE c.classroom_id=@classroomId AND c.college_id=@collegeId AND c.deleted_at IS NULL;
            """;
        await using var connection = CreateConnection();
        var row = await connection.QuerySingleOrDefaultAsync<RoomDbRow>(sql, new { classroomId, collegeId });
        return row == null ? null : Map(row);
    }

    public async Task<bool> RoomCodeExistsAsync(long collegeId, string roomNumber, long? excludeClassroomId = null)
    {
        const string sql = """
            SELECT EXISTS(SELECT 1 FROM classrooms WHERE college_id=@collegeId AND deleted_at IS NULL AND UPPER(classroom_code)=UPPER(@roomNumber)
                AND (@excludeClassroomId IS NULL OR classroom_id<>@excludeClassroomId));
            """;
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(sql, new { collegeId, roomNumber, excludeClassroomId });
    }

    public async Task<long> CreateRoomAsync(long collegeId, SaveRoomRequest request, string normalizedStatus, long? actorUserId)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            if (request.AssignedSectionId.HasValue)
                await ValidateSectionForAllocationAsync(connection, transaction, request.AssignedSectionId.Value, collegeId, null);

            const string sql = """
                INSERT INTO classrooms(college_id,classroom_code,classroom_name,room_type,capacity,status,building_block,floor_name,facilities_json,
                    department_name,availability_status,allocated_section_id,description,created_at,created_by,updated_at,updated_by)
                VALUES(@collegeId,@RoomNumber,@RoomName,@RoomType,@Capacity,@activeFlag,@BuildingBlock,@Floor,@FacilitiesJson,
                    @Department,@normalizedStatus,@AssignedSectionId,@Description,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId);
                SELECT LAST_INSERT_ID();
                """;
            var id = await connection.ExecuteScalarAsync<long>(sql, new
            {
                collegeId, RoomNumber=request.RoomNumber.Trim().ToUpperInvariant(), RoomName=request.RoomName.Trim(), request.RoomType, request.Capacity,
                activeFlag=ActiveFlag(normalizedStatus), request.BuildingBlock, Floor=request.Floor, FacilitiesJson=JsonSerializer.Serialize(request.Facilities ?? []),
                Department=string.IsNullOrWhiteSpace(request.Department)?"General / Shared":request.Department.Trim(), normalizedStatus,
                request.AssignedSectionId, request.Description, actorUserId
            }, transaction);

            if (request.AssignedSectionId.HasValue)
                await connection.ExecuteAsync("UPDATE sections SET room=@roomCode,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@sectionId;",
                    new { roomCode=request.RoomNumber.Trim().ToUpperInvariant(), actorUserId, sectionId=request.AssignedSectionId.Value }, transaction);

            await transaction.CommitAsync();
            _logger.LogInformation("Room created. ClassroomId={ClassroomId}, Code={RoomCode}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", id, request.RoomNumber, collegeId, actorUserId);
            return id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateRoomAsync(long classroomId, long collegeId, SaveRoomRequest request, string normalizedStatus, long? actorUserId)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var existing = await connection.QuerySingleOrDefaultAsync<ExistingRoomRow>(
                "SELECT classroom_id AS ClassroomId,allocated_section_id AS AssignedSectionId FROM classrooms WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL FOR UPDATE;",
                new { classroomId, collegeId }, transaction);
            if (existing == null) return false;

            if (request.AssignedSectionId.HasValue)
                await ValidateSectionForAllocationAsync(connection, transaction, request.AssignedSectionId.Value, collegeId, classroomId);

            if (existing.AssignedSectionId.HasValue && existing.AssignedSectionId != request.AssignedSectionId)
                await connection.ExecuteAsync("UPDATE sections SET room=NULL,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@oldSectionId;",
                    new { actorUserId, oldSectionId=existing.AssignedSectionId.Value }, transaction);

            const string sql = """
                UPDATE classrooms SET classroom_code=@RoomNumber,classroom_name=@RoomName,room_type=@RoomType,capacity=@Capacity,status=@activeFlag,
                    building_block=@BuildingBlock,floor_name=@Floor,facilities_json=@FacilitiesJson,department_name=@Department,
                    availability_status=@normalizedStatus,allocated_section_id=@AssignedSectionId,description=@Description,
                    updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
                WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL;
                """;
            var affected = await connection.ExecuteAsync(sql, new
            {
                classroomId, collegeId, RoomNumber=request.RoomNumber.Trim().ToUpperInvariant(), RoomName=request.RoomName.Trim(), request.RoomType,
                request.Capacity, activeFlag=ActiveFlag(normalizedStatus), request.BuildingBlock, Floor=request.Floor,
                FacilitiesJson=JsonSerializer.Serialize(request.Facilities ?? []), Department=string.IsNullOrWhiteSpace(request.Department)?"General / Shared":request.Department.Trim(),
                normalizedStatus, request.AssignedSectionId, request.Description, actorUserId
            }, transaction);

            if (request.AssignedSectionId.HasValue)
                await connection.ExecuteAsync("UPDATE sections SET room=@roomCode,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@sectionId;",
                    new { roomCode=request.RoomNumber.Trim().ToUpperInvariant(), actorUserId, sectionId=request.AssignedSectionId.Value }, transaction);

            await transaction.CommitAsync();
            _logger.LogInformation("Room updated. ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", classroomId, collegeId, actorUserId);
            return affected > 0;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> SoftDeleteRoomAsync(long classroomId, long collegeId, long? actorUserId)
    {
        await using var connection = CreateConnection();
        const string sql = """
            UPDATE classrooms SET status=0,availability_status='INACTIVE',deleted_at=CURRENT_TIMESTAMP,deleted_by=@actorUserId,
                updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
            WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL AND allocated_section_id IS NULL;
            """;
        var affected = await connection.ExecuteAsync(sql, new { classroomId, collegeId, actorUserId });
        _logger.LogInformation("Room delete attempted. ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}, Affected={Affected}", classroomId, collegeId, actorUserId, affected);
        return affected > 0;
    }

    public async Task AllocateRoomAsync(long classroomId, long collegeId, long sectionId, long? actorUserId)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var room = await connection.QuerySingleOrDefaultAsync<ExistingRoomCodeRow>(
                "SELECT classroom_code AS RoomCode,allocated_section_id AS AssignedSectionId FROM classrooms WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL FOR UPDATE;",
                new { classroomId, collegeId }, transaction) ?? throw new KeyNotFoundException("Room not found.");

            await ValidateSectionForAllocationAsync(connection, transaction, sectionId, collegeId, classroomId);
            if (room.AssignedSectionId.HasValue && room.AssignedSectionId.Value != sectionId)
                await connection.ExecuteAsync("UPDATE sections SET room=NULL,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@oldSectionId;",
                    new { actorUserId, oldSectionId=room.AssignedSectionId.Value }, transaction);

            await connection.ExecuteAsync("""
                UPDATE classrooms SET allocated_section_id=@sectionId,availability_status='ALLOCATED',status=1,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
                WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL;
                """, new { classroomId, collegeId, sectionId, actorUserId }, transaction);
            await connection.ExecuteAsync("UPDATE sections SET room=@RoomCode,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@sectionId;",
                new { room.RoomCode, actorUserId, sectionId }, transaction);

            await transaction.CommitAsync();
            _logger.LogInformation("Room allocated. ClassroomId={ClassroomId}, SectionId={SectionId}, ActorUserId={ActorUserId}", classroomId, sectionId, actorUserId);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeallocateRoomAsync(long classroomId, long collegeId, long? actorUserId)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var room = await connection.QuerySingleOrDefaultAsync<ExistingRoomRow>(
                "SELECT classroom_id AS ClassroomId,allocated_section_id AS AssignedSectionId FROM classrooms WHERE classroom_id=@classroomId AND college_id=@collegeId AND deleted_at IS NULL FOR UPDATE;",
                new { classroomId, collegeId }, transaction) ?? throw new KeyNotFoundException("Room not found.");
            if (room.AssignedSectionId.HasValue)
                await connection.ExecuteAsync("UPDATE sections SET room=NULL,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE section_id=@sectionId;",
                    new { actorUserId, sectionId=room.AssignedSectionId.Value }, transaction);
            await connection.ExecuteAsync("""
                UPDATE classrooms SET allocated_section_id=NULL,availability_status='AVAILABLE',status=1,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
                WHERE classroom_id=@classroomId AND college_id=@collegeId;
                """, new { classroomId, collegeId, actorUserId }, transaction);
            await transaction.CommitAsync();
            _logger.LogInformation("Room deallocated. ClassroomId={ClassroomId}, ActorUserId={ActorUserId}", classroomId, actorUserId);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<int> CountActiveStudentsAsync(long sectionId)
    {
        const string sql = "SELECT COUNT(*) FROM student_section_assignments WHERE section_id=@sectionId AND status=1 AND removed_at IS NULL;";
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { sectionId });
    }

    public async Task<bool> SectionExistsAndActiveAsync(long sectionId, long collegeId)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM sections WHERE section_id=@sectionId AND college_id=@collegeId AND status=1 AND is_archived=0 AND deleted_at IS NULL);";
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(sql, new { sectionId, collegeId });
    }

    public async Task<RoomDirectoryDto?> GetRoomByAllocatedSectionAsync(long sectionId, long collegeId, long? excludeClassroomId = null)
    {
        const string sql = """
            SELECT classroom_id AS Id,college_id AS CollegeId,classroom_code AS RoomNumber,classroom_name AS RoomName,
                   COALESCE(building_block,'') AS BuildingBlock,COALESCE(floor_name,'') AS Floor,COALESCE(room_type,'') AS RoomType,
                   COALESCE(capacity,0) AS Capacity,facilities_json AS FacilitiesJson,COALESCE(department_name,'General / Shared') AS Department,
                   'Allocated' AS Status,allocated_section_id AS AssignedSectionId,'' AS AssignedSection,description AS Description,created_at AS CreatedAt,updated_at AS UpdatedAt
            FROM classrooms WHERE college_id=@collegeId AND allocated_section_id=@sectionId AND deleted_at IS NULL
              AND (@excludeClassroomId IS NULL OR classroom_id<>@excludeClassroomId) LIMIT 1;
            """;
        await using var connection = CreateConnection();
        var row = await connection.QuerySingleOrDefaultAsync<RoomDbRow>(sql, new { sectionId, collegeId, excludeClassroomId });
        return row == null ? null : Map(row);
    }

    private async Task ValidateSectionForAllocationAsync(MySqlConnection connection, MySqlTransaction transaction, long sectionId, long collegeId, long? excludeClassroomId)
    {
        var exists = await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM sections WHERE section_id=@sectionId AND college_id=@collegeId AND status=1 AND is_archived=0 AND deleted_at IS NULL);",
            new { sectionId, collegeId }, transaction);
        if (!exists) throw new ArgumentException("The selected section does not exist or is inactive.");

        var conflictingRoom = await connection.QuerySingleOrDefaultAsync<ExistingRoomCodeRow>(
            "SELECT classroom_code AS RoomCode,allocated_section_id AS AssignedSectionId FROM classrooms WHERE college_id=@collegeId AND allocated_section_id=@sectionId AND deleted_at IS NULL AND (@excludeClassroomId IS NULL OR classroom_id<>@excludeClassroomId) LIMIT 1 FOR UPDATE;",
            new { collegeId, sectionId, excludeClassroomId }, transaction);
        if (conflictingRoom != null)
            throw new InvalidOperationException($"Section is already allocated to room {conflictingRoom.RoomCode}. A section can only have one assigned classroom.");
    }

    private static byte ActiveFlag(string normalizedStatus) => normalizedStatus is "MAINTENANCE" or "INACTIVE" ? (byte)0 : (byte)1;

    private static string? NormalizeDbStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return value;
        return value.Trim().ToUpperInvariant() switch
        {
            "AVAILABLE" => "AVAILABLE", "ALLOCATED" => "ALLOCATED", "MAINTENANCE" => "MAINTENANCE", "INACTIVE" => "INACTIVE", _ => value.Trim().ToUpperInvariant()
        };
    }

    private static RoomDirectoryDto Map(RoomDbRow row) => new()
    {
        Id=row.Id, CollegeId=row.CollegeId, RoomNumber=row.RoomNumber, RoomName=row.RoomName, BuildingBlock=row.BuildingBlock,
        Floor=row.Floor, RoomType=row.RoomType, Capacity=row.Capacity, Facilities=ParseFacilities(row.FacilitiesJson), Department=row.Department,
        Status=row.Status, AssignedSectionId=row.AssignedSectionId, AssignedSection=row.AssignedSection, SectionCode=row.SectionCode,
        CourseName=row.CourseName, CourseCode=row.CourseCode, BranchName=row.BranchName, BranchCode=row.BranchCode, SemesterName=row.SemesterName,
        AssignedStudentCount=row.AssignedStudentCount, Description=row.Description, CreatedAt=row.CreatedAt, UpdatedAt=row.UpdatedAt
    };

    private static List<string> ParseFacilities(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }

    private sealed class RoomDbRow
    {
        public long Id { get; set; }
        public long CollegeId { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string BuildingBlock { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string? FacilitiesJson { get; set; }
        public string Department { get; set; } = "General / Shared";
        public string Status { get; set; } = "Available";
        public long? AssignedSectionId { get; set; }
        public string AssignedSection { get; set; } = string.Empty;
        public string? SectionCode { get; set; }
        public string? CourseName { get; set; }
        public string? CourseCode { get; set; }
        public string? BranchName { get; set; }
        public string? BranchCode { get; set; }
        public string? SemesterName { get; set; }
        public int AssignedStudentCount { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    private sealed class ExistingRoomRow { public long ClassroomId { get; set; } public long? AssignedSectionId { get; set; } }
    private sealed class ExistingRoomCodeRow { public string RoomCode { get; set; } = string.Empty; public long? AssignedSectionId { get; set; } }
}
