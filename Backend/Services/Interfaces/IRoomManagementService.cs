using BTech.DTOs.Rooms;

namespace BTech.Services.Interfaces;

public interface IRoomManagementService
{
    Task<List<RoomDirectoryDto>> GetRoomsAsync(long collegeId, string? search, string? roomType, string? buildingBlock, string? status);
    Task<RoomDirectoryDto> GetRoomAsync(long classroomId, long collegeId);
    Task<RoomDirectoryDto> CreateRoomAsync(long collegeId, SaveRoomRequest request, long? actorUserId);
    Task<RoomDirectoryDto> UpdateRoomAsync(long classroomId, long collegeId, SaveRoomRequest request, long? actorUserId);
    Task DeleteRoomAsync(long classroomId, long collegeId, long? actorUserId);
    Task<RoomDirectoryDto> AllocateRoomAsync(long classroomId, long collegeId, long sectionId, long? actorUserId);
    Task<RoomDirectoryDto> DeallocateRoomAsync(long classroomId, long collegeId, long? actorUserId);
    RoomOptionsDto GetOptions();
}
