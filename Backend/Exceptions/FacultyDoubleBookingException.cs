namespace BTech.Task_TimetableEntries.Exceptions;

public sealed class FacultyDoubleBookingException : Exception
{
    public FacultyDoubleBookingException(string message) : base(message)
    {
    }
}
