using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("faculty_profile")]
    public class FacultyProfile
    {
        [Key]
        [Column("faculty_profile_id")]
        public long FacultyProfileId { get; set; }

        [Column("faculty_id")]
        public long FacultyId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("employee_profile_id")]
        public long? EmployeeProfileId { get; set; }

        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("gender")]
        public string? Gender { get; set; }

        [Column("house_number")]
        public string? HouseNumber { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("pincode")]
        public string? Pincode { get; set; }

        [Column("city")]
        public string? City { get; set; }

        [Column("district")]
        public string? District { get; set; }

        [Column("state")]
        public string? State { get; set; }

        [Column("country")]
        public string? Country { get; set; }

        [Column("permanent_house_number")]
        public string? PermanentHouseNumber { get; set; }

        [Column("permanent_address")]
        public string? PermanentAddress { get; set; }

        [Column("permanent_pincode")]
        public string? PermanentPincode { get; set; }

        [Column("permanent_city")]
        public string? PermanentCity { get; set; }

        [Column("permanent_district")]
        public string? PermanentDistrict { get; set; }

        [Column("permanent_state")]
        public string? PermanentState { get; set; }

        [Column("permanent_country")]
        public string? PermanentCountry { get; set; }

        [Column("about_me")]
        public string? AboutMe { get; set; }

        [Column("profile_image_path")]
        public string? ProfileImagePath { get; set; }

        [Column("emergency_contact_name")]
        public string? EmergencyContactName { get; set; }

        [Column("emergency_contact_number")]
        public string? EmergencyContactNumber { get; set; }

        [Column("emergency_contact_relation")]
        public string? EmergencyContactRelation { get; set; }

        [Column("status")]
        public byte Status { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public long? DeletedBy { get; set; }
    }
}