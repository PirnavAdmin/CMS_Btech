using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.DemoRequest
{
    public class UpdateDemoRequestStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;

        public string? Remarks { get; set; }
    }
}