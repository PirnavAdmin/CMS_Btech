using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.DemoRequest
{
    public class ScheduleDemoRequestDto
    {
        [Required]
        public DateTime DemoDate { get; set; }

        [Required]
        public TimeSpan DemoTime { get; set; }

        public string? Remarks { get; set; }
    }
}