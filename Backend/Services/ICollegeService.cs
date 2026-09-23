using Microsoft.AspNetCore.Http;

namespace UserRoleManagement.API.Services
{
    public interface ICollegeService
    {
        Task<string> UploadCollegeLogoAsync(
            long collegeId,
            IFormFile logo);

        Task<(byte[] FileBytes, string ContentType)> GetCollegeLogoAsync(
    long collegeId);
    }
} 