using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.Serialization;

public sealed class OptionalSemesterDateConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            if (string.IsNullOrWhiteSpace(reader.GetString())) return null;
            if (reader.TryGetDateTime(out var date)) return date;
        }
        throw new JsonException("Use an ISO date (yyyy-MM-dd), ISO timestamp, null, or an empty string for an optional semester date.");
    }
    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteStringValue(value.Value); else writer.WriteNullValue();
    }
}

public sealed class SemesterStatusConverter : JsonConverter<byte>
{
    public override bool HandleNull => true;
    public override byte Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return 1;
        if (reader.TokenType == JsonTokenType.True) return 1;
        if (reader.TokenType == JsonTokenType.False) return 0;
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetByte(out var value) && value <= 1) return value;
        if (reader.TokenType == JsonTokenType.String)
        {
            var text = reader.GetString()?.Trim();
            if (string.IsNullOrEmpty(text)) return 1;
            if (text == "1" || string.Equals(text, "Active", StringComparison.OrdinalIgnoreCase)) return 1;
            if (text == "0" || string.Equals(text, "Inactive", StringComparison.OrdinalIgnoreCase)) return 0;
        }
        throw new JsonException("Semester status must be 1/0, Active/Inactive, or true/false. Omit it or use null for the Active default.");
    }
    public override void Write(Utf8JsonWriter writer, byte value, JsonSerializerOptions options) => writer.WriteNumberValue(value);
}

// HTML selects and generated course-structure rows may use numbers, quoted
// numbers, null or empty placeholders. Validate required IDs after binding.
public sealed class SemesterIdConverter : JsonConverter<long>
{
    public override bool HandleNull => true;
    public override long Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return 0;
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt64(out var number)) return number;
        if (reader.TokenType == JsonTokenType.String)
        {
            var text = reader.GetString()?.Trim();
            if (string.IsNullOrEmpty(text)) return 0;
            if (long.TryParse(text, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out number)) return number;
        }
        throw new JsonException("Use a whole-number ID or a quoted whole-number ID.");
    }
    public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options) => writer.WriteNumberValue(value);
}

public sealed class SemesterNumberConverter : JsonConverter<int>
{
    public override bool HandleNull => true;
    public override int Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return 0;
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var number)) return number;
        if (reader.TokenType == JsonTokenType.String)
        {
            var text = reader.GetString()?.Trim();
            if (string.IsNullOrEmpty(text)) return 0;
            if (int.TryParse(text, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out number)) return number;
        }
        throw new JsonException("Use a whole number or a quoted whole number.");
    }
    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options) => writer.WriteNumberValue(value);
}
