using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IEmployeeProfileRepository
    {
        Task<EmployeeProfile?> GetByUserIdAsync(
            long userId);

        Task<Department?> GetDepartmentByIdAsync(
            long departmentId);

        Task<bool> UpdateAsync(
            long userId,
            DateTime? dateOfBirth,
            string? gender,
            long? departmentId,
            string? designation,
            string? address,
            string? pincode,
            string? city,
            string? district,
            string? state,
            string? aboutMe,
            long updatedBy, BTech.DTOs.Profile.UpdateProfileRequestDto? addressFields = null);
    }
}