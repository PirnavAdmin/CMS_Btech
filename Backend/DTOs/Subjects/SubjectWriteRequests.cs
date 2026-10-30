using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Subjects;

// Subject-only converters do not change JSON behavior in other modules.
public sealed class SubjectStatusConverter : JsonConverter<byte?>
{
    public override byte? Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.True) return 1;
        if (reader.TokenType == JsonTokenType.False) return 0;
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetByte(out var value) && value <= 1) return value;
        if (reader.TokenType == JsonTokenType.String && Parse(reader.GetString()) is byte status) return status;
        throw new JsonException("Status must be Active, Inactive, 1, 0, true or false.");
    }
    public override void Write(Utf8JsonWriter writer, byte? value, JsonSerializerOptions options)
    { if (value.HasValue) writer.WriteNumberValue(value.Value); else writer.WriteNullValue(); }
    public static byte? Parse(string? value) => value?.Trim().ToLowerInvariant() switch
    { "active" or "1" or "true" => 1, "inactive" or "0" or "false" => 0, _ => null };
}

public sealed class SubjectDecimalConverter : JsonConverter<decimal?>
{
    public override decimal? Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetDecimal(out var number)) return number;
        if (reader.TokenType == JsonTokenType.String)
        {
            var text = reader.GetString();
            if (string.IsNullOrWhiteSpace(text)) return 0;
            if (decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out number)) return number;
        }
        throw new JsonException("Enter a valid decimal number.");
    }
    public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
    { if (value.HasValue) writer.WriteNumberValue(value.Value); else writer.WriteNullValue(); }
}

public abstract class SubjectWriteRequestBase
{
    [Required, StringLength(50)] public string SubjectCode { get; set; } = string.Empty;
    [Required, StringLength(255)] public string SubjectName { get; set; } = string.Empty;
    [Range(1, long.MaxValue), JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long CourseId { get; set; }
    [Range(1, long.MaxValue), JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long BranchId { get; set; }
    [Range(1, long.MaxValue), JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long SemesterId { get; set; }
    // Omitted only for legacy callers: derived from SemesterId by the procedure.
    [Range(1, long.MaxValue), JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long? AcademicYearId { get; set; }
    [Range(typeof(decimal), "0", "999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? Credits { get; set; }
    [StringLength(50)] public string? SubjectType { get; set; }
    [StringLength(1000)] public string? Description { get; set; }
    [RegularExpression("(?i)^(Elective|Non-Elective|Core Subject)$")] public string? ElectiveType { get; set; }
    [JsonConverter(typeof(SubjectStatusConverter))] public byte? Status { get; set; }
    [Range(typeof(decimal), "0", "999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? LectureHours { get; set; }
    [Range(typeof(decimal), "0", "999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? TutorialHours { get; set; }
    [Range(typeof(decimal), "0", "999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? PracticalHours { get; set; }
    [Range(typeof(decimal), "0", "99999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? InternalMarks { get; set; }
    [Range(typeof(decimal), "0", "99999.99"), JsonConverter(typeof(SubjectDecimalConverter))]
    public decimal? ExternalMarks { get; set; }
    [JsonIgnore] public string NormalizedSubjectCode => SubjectCode.Trim().ToUpperInvariant();
    [JsonIgnore] public string NormalizedSubjectName => SubjectName.Trim();
    [JsonIgnore] public string? NormalizedSubjectType => SubjectType?.Trim();
    [JsonIgnore] public string? NormalizedDescription => Description?.Trim();
}
public sealed class CreateSubjectRequest : SubjectWriteRequestBase { }
public sealed class UpdateSubjectRequest : SubjectWriteRequestBase { }
public sealed class SubjectStatusRequest
{
    [Required, JsonConverter(typeof(SubjectStatusConverter))] public byte? Status { get; set; }
}
