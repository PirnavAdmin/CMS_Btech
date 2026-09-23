using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.AccessRequest
{
    public class ApproveRegistrationRequestDto
    {
        [Required]
        public long CollegeId { get; set; }

        [Required]
        public string RoleCode { get; set; } = "COLLEGE_ADMIN";
    }
}