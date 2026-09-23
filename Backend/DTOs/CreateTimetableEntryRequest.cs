namespace BTech.DTOs
{
    public class CreateTimetableEntryRequest
    {
        public long TimetableId { get; set; }

        public long TimetableSlotId { get; set; }

        public long FacultyId { get; set; }

        public long SubjectId { get; set; }

        public long SectionId { get; set; }

        public string DayOfWeek { get; set; } = string.Empty;

        public string? Classroom { get; set; }

        public string EntryType { get; set; } = "LECTURE";
    }
}