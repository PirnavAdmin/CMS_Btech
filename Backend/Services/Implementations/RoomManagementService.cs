using BTech.DTOs.Rooms;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class RoomManagementService : IRoomManagementService
{
    private readonly IRoomManagementRepository _repository;
    private readonly ILogger<RoomManagementService> _logger;

    private static readonly string[] RoomTypes = ["Lecture Hall","Classroom","Computer Lab","Electronics Lab","Mechanical Workshop","Physics / Chemistry Lab","Seminar Hall","Tutorial Room","Auditorium","Drawing Hall"];
    private static readonly string[] BuildingBlocks = ["Main Academic Block","Science & Technology Block","Engineering Block A","Engineering Block B","Central Administration Block","R&D Innovation Hub","Workshop Complex"];
    private static readonly string[] Floors = ["Ground Floor","1st Floor","2nd Floor","3rd Floor","4th Floor","5th Floor"];
    private static readonly string[] Facilities = ["Projector & Screen","Smart Digital Board","Air Conditioned (AC)","High-Speed Wi-Fi","Audio & Microphone System","LAN Network Ports","Computer Workstations","Power Backup / UPS","CCTV Surveillance"];
    private static readonly string[] Statuses = ["Available","Allocated","Maintenance","Inactive"];

    public RoomManagementService(IRoomManagementRepository repository, ILogger<RoomManagementService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public Task<List<RoomDirectoryDto>> GetRoomsAsync(long collegeId, string? search, string? roomType, string? buildingBlock, string? status)
    {
        EnsureCollege(collegeId);
        return _repository.GetRoomsAsync(collegeId, Clean(search), Clean(roomType), Clean(buildingBlock), NormalizeOptionalStatus(status));
    }

    public async Task<RoomDirectoryDto> GetRoomAsync(long classroomId, long collegeId)
    {
        EnsureCollege(collegeId);
        if (classroomId <= 0) throw new ArgumentException("A valid room id is required.");
        return await _repository.GetRoomAsync(classroomId, collegeId) ?? throw new KeyNotFoundException("Room not found.");
    }

    public async Task<RoomDirectoryDto> CreateRoomAsync(long collegeId, SaveRoomRequest request, long? actorUserId)
    {
        EnsureCollege(collegeId);
        await NormalizeAndValidateAsync(request, collegeId, null);
        var normalizedStatus = NormalizeStatus(request.Status, request.AssignedSectionId);
        if (request.AssignedSectionId.HasValue && normalizedStatus is "MAINTENANCE" or "INACTIVE")
        {
            var studentCount = await _repository.CountActiveStudentsAsync(request.AssignedSectionId.Value);
            if (studentCount > 0)
                throw new InvalidOperationException($"Cannot create an assigned room with status {ToDisplay(normalizedStatus)} while the selected section has {studentCount} active enrolled student(s). Deallocate or choose Available/Allocated status.");
        }
        var id = await _repository.CreateRoomAsync(collegeId, request, normalizedStatus, actorUserId);
        _logger.LogInformation("Room management create completed. ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", id, collegeId, actorUserId);
        return await GetRoomAsync(id, collegeId);
    }

    public async Task<RoomDirectoryDto> UpdateRoomAsync(long classroomId, long collegeId, SaveRoomRequest request, long? actorUserId)
    {
        var existing = await GetRoomAsync(classroomId, collegeId);
        await NormalizeAndValidateAsync(request, collegeId, classroomId);
        var normalizedStatus = NormalizeStatus(request.Status, request.AssignedSectionId);
        if (request.AssignedSectionId.HasValue && normalizedStatus is "MAINTENANCE" or "INACTIVE")
        {
            var studentCount = await _repository.CountActiveStudentsAsync(request.AssignedSectionId.Value);
            if (studentCount > 0)
                throw new InvalidOperationException($"Cannot set room to {ToDisplay(normalizedStatus)} while section {existing.AssignedSection} has {studentCount} active enrolled student(s). Deallocate or transfer the section first.");
        }
        if (!await _repository.UpdateRoomAsync(classroomId, collegeId, request, normalizedStatus, actorUserId))
            throw new KeyNotFoundException("Room not found.");
        _logger.LogInformation("Room management update completed. ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", classroomId, collegeId, actorUserId);
        return await GetRoomAsync(classroomId, collegeId);
    }

    public async Task DeleteRoomAsync(long classroomId, long collegeId, long? actorUserId)
    {
        var room = await GetRoomAsync(classroomId, collegeId);
        if (room.AssignedSectionId.HasValue)
            throw new InvalidOperationException($"Deletion blocked: room '{room.RoomName}' is currently allocated to section '{room.AssignedSection}'. Deallocate or transfer the section first.");
        if (!await _repository.SoftDeleteRoomAsync(classroomId, collegeId, actorUserId))
            throw new KeyNotFoundException("Room not found.");
        _logger.LogInformation("Room deleted. ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", classroomId, collegeId, actorUserId);
    }

    public async Task<RoomDirectoryDto> AllocateRoomAsync(long classroomId, long collegeId, long sectionId, long? actorUserId)
    {
        await GetRoomAsync(classroomId, collegeId);
        if (sectionId <= 0) throw new ArgumentException("A valid section id is required.");
        if (!await _repository.SectionExistsAndActiveAsync(sectionId, collegeId)) throw new ArgumentException("The selected section does not exist or is inactive.");
        var conflict = await _repository.GetRoomByAllocatedSectionAsync(sectionId, collegeId, classroomId);
        if (conflict != null) throw new InvalidOperationException($"Section is already allocated to room {conflict.RoomNumber} ({conflict.RoomName}). A section can only have one assigned classroom.");
        var studentCount = await _repository.CountActiveStudentsAsync(sectionId);
        var room = await GetRoomAsync(classroomId, collegeId);
        if (room.Capacity < studentCount)
            throw new InvalidOperationException($"Room capacity ({room.Capacity}) is lower than the section's active student count ({studentCount}). Choose a larger room.");
        await _repository.AllocateRoomAsync(classroomId, collegeId, sectionId, actorUserId);
        return await GetRoomAsync(classroomId, collegeId);
    }

    public async Task<RoomDirectoryDto> DeallocateRoomAsync(long classroomId, long collegeId, long? actorUserId)
    {
        await GetRoomAsync(classroomId, collegeId);
        await _repository.DeallocateRoomAsync(classroomId, collegeId, actorUserId);
        return await GetRoomAsync(classroomId, collegeId);
    }

    public RoomOptionsDto GetOptions() => new()
    {
        RoomTypes = RoomTypes,
        BuildingBlocks = BuildingBlocks,
        Floors = Floors,
        Facilities = Facilities,
        Statuses = Statuses
    };

    private async Task NormalizeAndValidateAsync(SaveRoomRequest request, long collegeId, long? classroomId)
    {
        request.RoomNumber = request.RoomNumber?.Trim().ToUpperInvariant() ?? string.Empty;
        request.RoomName = request.RoomName?.Trim() ?? string.Empty;
        request.BuildingBlock = request.BuildingBlock?.Trim() ?? string.Empty;
        request.Floor = request.Floor?.Trim() ?? string.Empty;
        request.RoomType = request.RoomType?.Trim() ?? string.Empty;
        request.Department = string.IsNullOrWhiteSpace(request.Department) ? "General / Shared" : request.Department.Trim();
        request.Description = Clean(request.Description);
        request.Facilities ??= [];
        request.Facilities = request.Facilities.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        if (string.IsNullOrWhiteSpace(request.RoomNumber)) throw new ArgumentException("Room code / number is required.");
        if (string.IsNullOrWhiteSpace(request.RoomName)) throw new ArgumentException("Room display name is required.");
        if (string.IsNullOrWhiteSpace(request.BuildingBlock)) throw new ArgumentException("Building block is required.");
        if (string.IsNullOrWhiteSpace(request.Floor)) throw new ArgumentException("Floor is required.");
        if (string.IsNullOrWhiteSpace(request.RoomType)) throw new ArgumentException("Room type is required.");
        if (request.Capacity <= 0) throw new ArgumentException("Seating capacity must be greater than zero.");
        if (await _repository.RoomCodeExistsAsync(collegeId, request.RoomNumber, classroomId))
            throw new InvalidOperationException("A room with this code / number already exists.");
        _ = NormalizeStatus(request.Status, request.AssignedSectionId);
        if (request.AssignedSectionId.HasValue)
        {
            if (!await _repository.SectionExistsAndActiveAsync(request.AssignedSectionId.Value, collegeId))
                throw new ArgumentException("The selected section does not exist or is inactive.");
            var assignedStudents = await _repository.CountActiveStudentsAsync(request.AssignedSectionId.Value);
            if (request.Capacity < assignedStudents)
                throw new InvalidOperationException($"Room capacity ({request.Capacity}) cannot be lower than the selected section's active student count ({assignedStudents}).");
        }
    }

    private static string NormalizeStatus(string? status, long? assignedSectionId)
    {
        var value = status?.Trim().ToUpperInvariant();
        value = value switch
        {
            "AVAILABLE" => "AVAILABLE",
            "ALLOCATED" => "ALLOCATED",
            "MAINTENANCE" => "MAINTENANCE",
            "INACTIVE" => "INACTIVE",
            _ => throw new ArgumentException("Room status must be Available, Allocated, Maintenance, or Inactive.")
        };
        if (assignedSectionId.HasValue && value == "AVAILABLE") value = "ALLOCATED";
        if (!assignedSectionId.HasValue && value == "ALLOCATED") value = "AVAILABLE";
        return value;
    }

    private static string? NormalizeOptionalStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        return status.Trim().ToUpperInvariant() switch
        {
            "AVAILABLE" => "AVAILABLE",
            "ALLOCATED" => "ALLOCATED",
            "MAINTENANCE" => "MAINTENANCE",
            "INACTIVE" => "INACTIVE",
            _ => throw new ArgumentException("Room status must be Available, Allocated, Maintenance, or Inactive.")
        };
    }

    private static string ToDisplay(string status) => status switch { "MAINTENANCE" => "Maintenance", "INACTIVE" => "Inactive", "ALLOCATED" => "Allocated", _ => "Available" };
    private static void EnsureCollege(long collegeId) { if (collegeId <= 0) throw new ArgumentException("A valid college id is required."); }
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
