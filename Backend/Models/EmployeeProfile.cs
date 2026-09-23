using System;

namespace BTech.Models
{
    public class EmployeeProfile
    {
        public long EmployeeProfileId { get; set; }

        public long UserId { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Gender { get; set; }

        public long? DepartmentId { get; set; }
        public string Qualification { get; set; } = string.Empty;

        public string? Designation { get; set; }

        public string? Address { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("house_number")]
        public string? HouseNumber { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_house_number")]
        public string? PermanentHouseNumber { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_address")]
        public string? PermanentAddress { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_pincode")]
        public string? PermanentPincode { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_city")]
        public string? PermanentCity { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_district")]
        public string? PermanentDistrict { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_state")]
        public string? PermanentState { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column("permanent_country")]
        public string? PermanentCountry { get; set; }


        public string? Pincode { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? AboutMe { get; set; }

        public string? ProfileImagePath { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? DeletedAt { get; set; }

        public long? DeletedBy { get; set; }

        // Navigation properties
        public User? User { get; set; }

        public Department? Department { get; set; }
    }
}