namespace BTech.Models
{
    public class CourseSemesterMapping
    {
        public long CourseSemesterMappingId { get; set; }

        public long CourseId { get; set; }

        public long SemesterId { get; set; }

        public Course? Course { get; set; }

        public Semester? Semester { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }
    }
}