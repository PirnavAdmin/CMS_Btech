using BTech.DTOs.Rooms;

namespace BTech.Repositories.Interfaces;

public interface IRoomManagementRepository
{
    Task<List<RoomDirectoryDto>> GetRoomsAsync(long collegeId, string? search, string? roomType, string? buildingBlock, string? availabilityStatus);
    Task<RoomDirectoryDto?> GetRoomAsync(long classroomId, long collegeId);
    Task<bool> RoomCodeExistsAsync(long collegeId, string roomNumber, long? excludeClassroomId = null);
    Task<long> CreateRoomAsync(long collegeId, SaveRoomRequest request, string normalizedStatus, long? actorUserId);
    Task<bool> UpdateRoomAsync(long classroomId, long collegeId, SaveRoomRequest request, string normalizedStatus, long? actorUserId);
    Task<bool> SoftDeleteRoomAsync(long classroomId, long collegeId, long? actorUserId);
    Task AllocateRoomAsync(long classroomId, long collegeId, long sectionId, long? actorUserId);
    Task DeallocateRoomAsync(long classroomId, long collegeId, long? actorUserId);
    Task<int> CountActiveStudentsAsync(long sectionId);
    Task<bool> SectionExistsAndActiveAsync(long sectionId, long collegeId);
    Task<RoomDirectoryDto?> GetRoomByAllocatedSectionAsync(long sectionId, long collegeId, long? excludeClassroomId = null);
}
