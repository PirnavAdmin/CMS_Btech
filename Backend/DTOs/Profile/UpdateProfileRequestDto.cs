using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Profile
{
    public class UpdateProfileRequestDto
    {
        [StringLength(150)]
        public string? FullName { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [Phone]
        [StringLength(15)]
        public string? Mobile { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [StringLength(20)]
        public string? Gender { get; set; }

        public long? DepartmentId { get; set; }

        [StringLength(150)]
        public string? Designation { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }
        public string? HouseNumber { get; set; }
        public string? PermanentHouseNumber { get; set; }
        public string? PermanentAddress { get; set; }
        public string? PermanentPincode { get; set; }
        public string? PermanentCity { get; set; }
        public string? PermanentDistrict { get; set; }
        public string? PermanentState { get; set; }
        public string? PermanentCountry { get; set; }


        [StringLength(10)]
        public string? Pincode { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(100)]
        public string? District { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(1000)]
        public string? AboutMe { get; set; }
    }
}