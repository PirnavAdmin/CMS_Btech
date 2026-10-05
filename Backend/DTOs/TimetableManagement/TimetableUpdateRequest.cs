namespace BTech.DTOs.TimetableManagement
{
    public class TimetableUpdateRequest
    {
        public long AcademicYearId { get; set; }
        public long CourseId { get; set; }
        public long BranchId { get; set; }
        public long SemesterId { get; set; }
        public long SectionId { get; set; }
        public long SubjectId { get; set; }
        public long FacultyId { get; set; }

        public string DayOfWeek { get; set; } = string.Empty;

        public string StartTime { get; set; } = string.Empty;

        public string EndTime { get; set; } = string.Empty;

        public string RoomNo { get; set; } = string.Empty;
    }
}