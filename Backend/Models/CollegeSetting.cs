using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models;

[Table("college_settings")]
public class CollegeSetting
{
    [Key]
    [Column("college_setting_id")]
    public long Id { get; set; }

    // Correct foreign key to colleges.college_id
    [Column("college_id")]
    public long CollegeId { get; set; }

    [Column("college_name")]
    public string CollegeName { get; set; } = string.Empty;

    [Column("college_code")]
    public string CollegeCode { get; set; } = string.Empty;

    [Column("college_email")]
    public string? CollegeEmail { get; set; }

    [Column("phone_number")]
    public string? PhoneNumber { get; set; }

    [Column("website")]
    public string? Website { get; set; }

    [Column("address_line1")]
    public string? AddressLine1 { get; set; }

    [Column("address_line2")]
    public string? AddressLine2 { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("state")]
    public string? State { get; set; }

    [Column("pincode")]
    public string? Pincode { get; set; }

    [Column("academic_year")]
    public string? AcademicYear { get; set; }

    [Column("semester")]
    public string? Semester { get; set; }

    [Column("institution_type")]
    public string? InstitutionType { get; set; }

    [Column("date_format")]
    public string? DateFormat { get; set; } = "dd-MM-yyyy";

    [Column("time_zone")]
    public string? TimeZone { get; set; } = "Asia/Kolkata";

    [Column("status")]
    public byte Status { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("created_by")]
    public long? CreatedBy { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [Column("updated_by")]
    public long? UpdatedBy { get; set; }

    // Navigation to the College/Institution master
    public College? College { get; set; }
}