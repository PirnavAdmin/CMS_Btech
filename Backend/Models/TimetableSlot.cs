using System;

namespace BTech.Models
{
    public class TimetableSlot
    {
        public long TimetableSlotId { get; set; }

        public long TimetableId { get; set; }

        public int SlotNumber { get; set; }
        public string SlotName { get; set; } = string.Empty;

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }

        public byte Status { get; set; } = 1;

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}