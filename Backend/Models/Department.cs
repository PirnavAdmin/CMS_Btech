using BTech.DTOs.Profile;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    public class Department
    {
        public long DepartmentId { get; set; }

        public long CollegeId { get; set; }

        public string DepartmentCode { get; set; } = string.Empty;

        public string DepartmentName { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Column("hod_user_id")]
        public long? HodUserId { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? DeletedAt { get; set; }

        public long? DeletedBy { get; set; }

        public ICollection<EmployeeProfile> EmployeeProfiles { get; set; }
            = new List<EmployeeProfile>();
    }
}