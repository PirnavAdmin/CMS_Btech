using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.AcademicYear
{
    public class CreateAcademicYearDto
    {
        [Required]
        [StringLength(50)]
        public string AcademicYearName { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }
    }
}
