using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Common
{
    /// <summary>
    /// Accepts the numeric API values 0/1 and the frontend values
    /// "inactive"/"active" without requiring a frontend change.
    /// </summary>
    public sealed class FlexibleStatusConverter : JsonConverter<sbyte>
    {
        public override sbyte Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number &&
                reader.TryGetSByte(out var numericStatus) &&
                numericStatus is 0 or 1)
            {
                return numericStatus;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var value = reader.GetString()?.Trim().ToLowerInvariant();

                return value switch
                {
                    "1" or "active" => 1,
                    "0" or "inactive" => 0,
                    _ => throw new JsonException(
                        "Status must be 0, 1, 'inactive', or 'active'.")
                };
            }

            throw new JsonException(
                "Status must be 0, 1, 'inactive', or 'active'.");
        }

        public override void Write(
            Utf8JsonWriter writer,
            sbyte value,
            JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }
}
