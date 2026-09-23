using System;
using System.Collections.Generic;

namespace BTech.Models
{
    public class Timetable
    {
        public long TimetableId { get; set; }

        public long AcademicYearId { get; set; }
        public long SemesterId { get; set; }
        public long SectionId { get; set; }

        public string TimetableName { get; set; } = string.Empty;
        public string Status { get; set; } = "DRAFT";

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public DateTime? PublishedAt { get; set; }
        public long? PublishedBy { get; set; }

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }

        public DateTime UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}