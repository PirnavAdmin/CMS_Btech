using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.SubjectAssignment
{
    public class CreateSubjectAssignmentDto
    {
        [Required]
        [Range(1, long.MaxValue)]
        public long SubjectId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        public long? CreatedBy { get; set; }
    }

    public class UpdateSubjectAssignmentDto
    {
        [Required]
        [Range(1, long.MaxValue)]
        public long SubjectId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        public long? UpdatedBy { get; set; }
    }

    public class SubjectAssignmentResponseDto
    {
        public long SubjectSemesterAssignmentId { get; set; }

        public long SubjectId { get; set; }

        public long SemesterId { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}