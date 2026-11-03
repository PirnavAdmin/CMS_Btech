using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.AcademicYear
{
    public class CreateAcademicYearDto
    {
        // Optional compatibility field for SuperAdmin callers.
        // The controller validates it against the selected query scope.
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public long? CollegeId { get; set; }

        [Required]
        [StringLength(50)]
        public string AcademicYearName { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }
    }
}
