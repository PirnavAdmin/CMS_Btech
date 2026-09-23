using System;

namespace BTech.Models
{
    public class TimetableEntry
    {
        public long TimetableEntryId { get; set; }

        public long TimetableId { get; set; }
        public long TimetableSlotId { get; set; }

        public long FacultyId { get; set; }
        public long SubjectId { get; set; }
        public long SectionId { get; set; }

        public string DayOfWeek { get; set; } = string.Empty;
        public string? Classroom { get; set; }

        public string EntryType { get; set; } = "LECTURE";

        public byte Status { get; set; } = 1;

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}