namespace BTech.DTOs.Rooms;

public sealed class RoomDirectoryDto
{
    public long Id { get; set; }
    public long ClassroomId => Id;
    public long CollegeId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string BuildingBlock { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public List<string> Facilities { get; set; } = [];
    public string Department { get; set; } = "General / Shared";
    public string Status { get; set; } = "Available";
    public long? AssignedSectionId { get; set; }
    public long? SectionId => AssignedSectionId;
    public string AssignedSection { get; set; } = string.Empty;
    public string SectionName => AssignedSection;
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

public sealed class SaveRoomRequest
{
    public long? CollegeId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string BuildingBlock { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public List<string> Facilities { get; set; } = [];
    public string? Department { get; set; }
    public string Status { get; set; } = "Available";
    public long? AssignedSectionId { get; set; }
    public string? Description { get; set; }
}

public sealed class AllocateRoomRequest
{
    public long SectionId { get; set; }
    public string? SectionName { get; set; }
}

public sealed class RoomOptionsDto
{
    public IReadOnlyList<string> RoomTypes { get; init; } = [];
    public IReadOnlyList<string> BuildingBlocks { get; init; } = [];
    public IReadOnlyList<string> Floors { get; init; } = [];
    public IReadOnlyList<string> Facilities { get; init; } = [];
    public IReadOnlyList<string> Statuses { get; init; } = [];
}
