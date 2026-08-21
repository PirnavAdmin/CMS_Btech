using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class UpdateProfileRequestDto
    {
        [StringLength(150)]
        public string? FullName { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [Phone]
        [StringLength(20)]
        public string? Mobile { get; set; }
    }
}