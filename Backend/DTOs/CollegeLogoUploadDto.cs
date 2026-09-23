using Microsoft.AspNetCore.Http;

namespace UserRoleManagement.API.DTOs
{
    public class CollegeLogoUploadDto
    {
        public long CollegeId { get; set; }

        public IFormFile Logo { get; set; } = null!;
    }
} 