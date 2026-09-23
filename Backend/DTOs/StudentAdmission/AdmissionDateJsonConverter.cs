using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.StudentAdmission
{
    public sealed class AdmissionDateJsonConverter : JsonConverter<DateTime?>
    {
        private static readonly string[] Formats =
        {
            "yyyy-MM-dd",
            "dd/MM/yyyy",
            "dd-MM-yyyy",
            "MM/dd/yyyy",
            "MM-dd-yyyy"
        };

        public override DateTime? Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                return null;

            if (reader.TokenType != JsonTokenType.String)
                throw new JsonException("Invalid date value.");

            var value = reader.GetString();

            if (string.IsNullOrWhiteSpace(value))
                return null;

            if (DateTime.TryParseExact(
                    value,
                    Formats,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var result))
            {
                return result.Date;
            }

            if (DateTime.TryParse(
                    value,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out result))
            {
                return result.Date;
            }

            throw new JsonException(
                $"Invalid date format: '{value}'. Expected yyyy-MM-dd or dd/MM/yyyy.");
        }

        public override void Write(
            Utf8JsonWriter writer,
            DateTime? value,
            JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteStringValue(
                    value.Value.ToString("yyyy-MM-dd"));
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}