using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.StudentAdmission;

/// <summary>Accepts the admission screen's unselected placeholder without treating it as a shared fee plan.</summary>
public sealed class AdmissionFeeStructureIdJsonConverter : JsonConverter<long?>
{
    public static bool IsUnselected(string? value) => string.IsNullOrWhiteSpace(value)
        || value.Trim().Equals("FS-STANDARD", StringComparison.OrdinalIgnoreCase);

    public override long? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            var value = reader.GetString();
            if (IsUnselected(value)) return null;
            if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id) && id > 0)
                return id;
        }
        else if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt64(out var id) && id > 0)
            return id;
        throw new JsonException("feeStructureId must be a positive server-generated integer, or FS-STANDARD when no plan is selected.");
    }

    public override void Write(Utf8JsonWriter writer, long? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteNumberValue(value.Value);
        else writer.WriteNullValue();
    }
}
