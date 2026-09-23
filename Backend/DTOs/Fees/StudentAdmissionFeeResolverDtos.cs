using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Fees
{
    /// <summary>
    /// Current admission selections used to resolve the configured fees.
    /// IDs are preferred. Nullable academic IDs allow the resolver to fall back
    /// to the academic context already saved for the admission.
    /// </summary>
    public sealed class StudentAdmissionFeeResolveRequestDto
    {
        public long? AcademicYearId { get; set; }
        public long? CourseId { get; set; }
        public long? DepartmentId { get; set; }
        public long? BranchId { get; set; }
        public long? SemesterId { get; set; }

        [StringLength(50)] public string? AdmissionType { get; set; }
        [StringLength(50)] public string? EntryType { get; set; }
        [StringLength(100)] public string? Quota { get; set; }
        [StringLength(100)] public string? StudentCategory { get; set; }

        public bool HostelRequired { get; set; }
        [StringLength(100)] public string? HostelType { get; set; }
        [StringLength(100)] public string? RoomType { get; set; }

        public bool TransportationRequired { get; set; }
        public long? RouteId { get; set; }
        [StringLength(50)] public string? RouteCode { get; set; }
        [StringLength(150)] public string? RouteName { get; set; }

        [Range(0, double.MaxValue)] public decimal ScholarshipAmount { get; set; }
        [StringLength(50)] public string? PaymentPlan { get; set; }
        [StringLength(50)] public string? PaymentStatus { get; set; }
    }

    public sealed class StudentAdmissionFeeResolveResultDto
    {
        public long AdmissionId { get; set; }
        public long? AcademicFeeMasterId { get; set; }
        public long? HostelFeeMasterId { get; set; }
        public long? TransportFeeMasterId { get; set; }

        public decimal TuitionFee { get; set; }
        public decimal AdmissionFee { get; set; }
        public decimal HostelFee { get; set; }
        public decimal TransportationFee { get; set; }
        public decimal ScholarshipAmount { get; set; }
        public decimal FirstYearTotal { get; set; }
        public decimal NetPayable { get; set; }

        public bool HostelRequired { get; set; }
        public bool TransportationRequired { get; set; }
        public string ResolvedAdmissionType { get; set; } = string.Empty;
        public string Source { get; set; } = "FEE_MASTER_RESOLVER";
        public string PaymentPlan { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
    }
}
