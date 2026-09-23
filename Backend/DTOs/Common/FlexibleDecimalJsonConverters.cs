using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Common
{
    /// <summary>
    /// Accepts decimals sent by UI as JSON numbers or strings.
    /// Empty/null values become null. Thousands separators and common
    /// currency symbols are tolerated so form controls do not fail model binding.
    /// </summary>
    public sealed class FlexibleNullableDecimalJsonConverter : JsonConverter<decimal?>
    {
        public override decimal? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                return null;

            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetDecimal(out var number))
                    return number;
                throw new JsonException("Value must be a valid decimal number.");
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var raw = reader.GetString();
                if (string.IsNullOrWhiteSpace(raw))
                    return null;

                if (TryParseFlexible(raw, out var parsed))
                    return parsed;

                throw new JsonException($"'{raw}' is not a valid decimal value.");
            }

            throw new JsonException("Value must be a decimal number, numeric string, empty string, or null.");
        }

        public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
        {
            if (value.HasValue) writer.WriteNumberValue(value.Value);
            else writer.WriteNullValue();
        }

        internal static bool TryParseFlexible(string value, out decimal result)
        {
            var cleaned = value.Trim()
                .Replace("₹", string.Empty, StringComparison.Ordinal)
                .Replace("$", string.Empty, StringComparison.Ordinal)
                .Replace("€", string.Empty, StringComparison.Ordinal)
                .Replace("£", string.Empty, StringComparison.Ordinal)
                .Replace(",", string.Empty, StringComparison.Ordinal)
                .Trim();

            return decimal.TryParse(
                cleaned,
                NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture,
                out result)
                || decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.CurrentCulture, out result);
        }
    }

    public sealed class FlexibleDecimalJsonConverter : JsonConverter<decimal>
    {
        public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number && reader.TryGetDecimal(out var number))
                return number;

            if (reader.TokenType == JsonTokenType.String)
            {
                var raw = reader.GetString();
                if (string.IsNullOrWhiteSpace(raw))
                    return 0m;

                if (FlexibleNullableDecimalJsonConverter.TryParseFlexible(raw, out var parsed))
                    return parsed;

                throw new JsonException($"'{raw}' is not a valid decimal value.");
            }

            if (reader.TokenType == JsonTokenType.Null)
                return 0m;

            throw new JsonException("Value must be a decimal number, numeric string, empty string, or null.");
        }

        public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
            => writer.WriteNumberValue(value);
    }
}
