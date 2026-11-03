using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Exams;

public sealed class ExamHallAllocationWriteRequest
{
    [Range(1, long.MaxValue)]
    public long ExamScheduleId { get; set; }

    [Range(1, long.MaxValue)]
    public long ClassroomId { get; set; }

    [Range(0, int.MaxValue)]
    public int AllocatedStudents { get; set; }

    [Range(1, int.MaxValue)]
    public int? SeatStartNumber { get; set; }

    [Range(1, int.MaxValue)]
    public int? SeatEndNumber { get; set; }

    public bool? Status { get; set; }
}
