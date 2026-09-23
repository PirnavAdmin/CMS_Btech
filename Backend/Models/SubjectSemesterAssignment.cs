namespace BTech.Models
{
    public class SubjectSemesterAssignment
    {
        public long SubjectSemesterAssignmentId { get; set; }

        public long SubjectId { get; set; }

        public long SemesterId { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }
    }
}