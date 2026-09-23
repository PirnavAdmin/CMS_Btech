using BTech.Task_FacultyStatusHistory.DTOs;

namespace BTech.Task_FacultyStatusHistory.Repositories;

public interface IFacultyStatusRepository
{
    Task<bool> UpdateStatusAsync(
        long facultyId,
        UpdateFacultyStatusRequest request,
        long? changedBy);

    Task<IEnumerable<FacultyStatusHistoryResponse>>
        GetStatusHistoryAsync(long facultyId);
}