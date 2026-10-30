using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.AcademicYear
{
    public class UpdateAcademicYearDto
    {
        // Optional compatibility field. Tenant authorization is enforced
        // by the controller; a body value cannot override a user's token.
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
