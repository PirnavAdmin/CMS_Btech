using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.UserAccess;

// Existing clients send either an array of ModuleGrant or a module-keyed map.
public sealed class ModuleGrantsConverter : JsonConverter<List<ModuleGrant>>
{
    public override List<ModuleGrant> Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        var root = document.RootElement;
        if (root.ValueKind == JsonValueKind.Array)
            return JsonSerializer.Deserialize<List<ModuleGrant>>(root.GetRawText(), options) ?? [];
        if (root.ValueKind != JsonValueKind.Object) throw new JsonException("Permissions must be an array or a module-keyed object.");
        return root.EnumerateObject().Select(p => new ModuleGrant
        {
            ModuleKey = p.Name, CanView = Flag(p.Value,"view"), CanCreate = Flag(p.Value,"create"),
            CanEdit = Flag(p.Value,"edit"), CanDelete = Flag(p.Value,"delete"), CanExport = Flag(p.Value,"export")
        }).ToList();
    }
    private static bool Flag(JsonElement value, string key)
    {
        if (value.ValueKind != JsonValueKind.Object) throw new JsonException("Each permission must contain boolean action fields.");
        foreach (var p in value.EnumerateObject())
            if (p.Name.Equals(key,StringComparison.OrdinalIgnoreCase) || p.Name.Equals("can"+key,StringComparison.OrdinalIgnoreCase))
                return p.Value.ValueKind is JsonValueKind.True or JsonValueKind.False ? p.Value.GetBoolean() : throw new JsonException("Permission actions must be boolean.");
        return false;
    }
    public override void Write(Utf8JsonWriter writer,List<ModuleGrant> value,JsonSerializerOptions options) => JsonSerializer.Serialize(writer,value,options);
}
