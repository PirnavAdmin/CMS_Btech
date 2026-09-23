namespace BTech.Exceptions
{
    public sealed class PromotionValidationException : Exception
    {
        public long? StudentId { get; }
        public IReadOnlyDictionary<string, string[]> Errors { get; }

        public PromotionValidationException(
            string field,
            string message,
            long? studentId = null)
            : base(message)
        {
            StudentId = studentId;
            Errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                [string.IsNullOrWhiteSpace(field) ? "promotion" : field] = new[] { message }
            };
        }

        public PromotionValidationException(
            IDictionary<string, string[]> errors,
            string message = "Promotion validation failed.")
            : base(message)
        {
            Errors = new Dictionary<string, string[]>(errors, StringComparer.OrdinalIgnoreCase);
        }
    }
}
