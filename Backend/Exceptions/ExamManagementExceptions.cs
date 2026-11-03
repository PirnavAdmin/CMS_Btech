namespace BTech.Exceptions;

public sealed class ExamValidationException : Exception
{
    public string Field { get; }
    public ExamValidationException(string field, string message) : base(message) => Field = field;
}

public sealed class ExamConflictException : Exception
{
    public string Field { get; }
    public ExamConflictException(string field, string message) : base(message) => Field = field;
}

public sealed class ExamNotFoundException : Exception
{
    public string Field { get; }
    public ExamNotFoundException(string field, string message) : base(message) => Field = field;
}
