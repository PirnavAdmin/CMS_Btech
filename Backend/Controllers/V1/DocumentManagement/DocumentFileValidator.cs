using System.IO.Compression;
using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace BTech.DocumentManagement;

/// <summary>Validates the bytes that will actually be saved. No client MIME type is trusted.</summary>
public static class DocumentFileValidator
{
    public const long MaxFileBytes = 10 * 1024 * 1024;
    public const long MaxRequestBytes = MaxFileBytes + 1024 * 1024;
    private static readonly IReadOnlyDictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf", [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg",
        [".png"] = "image/png", [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    public sealed record ValidatedFile(string OriginalName, string Extension, string MimeType, byte[] Bytes);

    public static async Task<ValidatedFile> ValidateAsync(IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length <= 0) throw new DocumentApiException(400, "Please select a non-empty file.");
        if (file.Length > MaxFileBytes) throw new DocumentApiException(400, "File size cannot exceed 10 MB.");
        var name = file.FileName;
        if (string.IsNullOrWhiteSpace(name) || name.Length > 255 || name != name.Trim() ||
            name.Any(c => char.IsControl(c) || "<>:\"/\\|?*".Contains(c)) || name.EndsWith('.'))
            throw new DocumentApiException(400, "File name must be a plain file name, at most 255 characters, without paths or control characters.");
        var extension = Path.GetExtension(name).ToLowerInvariant();
        if (!MimeTypes.TryGetValue(extension, out var mime))
            throw new DocumentApiException(400, "Only PDF, JPG, JPEG, PNG, DOC and DOCX files are allowed.");
        var suppliedMime = (file.ContentType ?? "").Split(';')[0].Trim();
        if (suppliedMime.Length > 0 && !suppliedMime.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase) &&
            !suppliedMime.Equals(mime, StringComparison.OrdinalIgnoreCase))
            throw new DocumentApiException(400, "File content type does not match its extension.");

        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        var chunk = new byte[64 * 1024];
        int read;
        while ((read = await input.ReadAsync(chunk.AsMemory(), cancellationToken)) > 0)
        {
            if (buffer.Length + read > MaxFileBytes) throw new DocumentApiException(400, "File size cannot exceed 10 MB.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
        }
        if (buffer.Length == 0 || buffer.Length != file.Length)
            throw new DocumentApiException(400, "The uploaded file is empty or incomplete.");
        var bytes = buffer.ToArray();
        bool matches = extension switch
        {
            ".pdf" => bytes.Length >= 12 && bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8) &&
                Encoding.ASCII.GetString(bytes, Math.Max(0, bytes.Length - 2048), Math.Min(2048, bytes.Length)).Contains("%%EOF", StringComparison.Ordinal),
            ".png" => bytes.Length >= 45 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) &&
                bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8) && bytes.AsSpan(bytes.Length - 8, 4).SequenceEqual("IEND"u8),
            ".jpg" or ".jpeg" => bytes.Length >= 4 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff &&
                bytes[^2] == 0xff && bytes[^1] == 0xd9,
            ".doc" => IsLegacyWord(bytes),
            ".docx" => IsDocx(bytes),
            _ => false
        };
        if (!matches) throw new DocumentApiException(400, "File contents do not match a supported document format, or the file is malformed.");
        return new ValidatedFile(name, extension, mime, bytes);
    }

    private static bool IsLegacyWord(byte[] bytes)
    {
        // Compound File header plus a WordDocument directory stream. Reject renamed XLS/PPT containers.
        if (bytes.Length < 512 || !bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1 })) return false;
        if (BitConverter.ToUInt16(bytes, 28) != 0xfffe) return false;
        var sectorShift = BitConverter.ToUInt16(bytes, 30);
        if (sectorShift is not (9 or 12)) return false;
        var sectorSize = 1 << sectorShift;
        var directorySector = BitConverter.ToUInt32(bytes, 48);
        var visited = new HashSet<uint>();
        while (directorySector < 0xfffffffa && visited.Add(directorySector))
        {
            var offset = ((long)directorySector + 1) * sectorSize;
            if (offset < sectorSize || offset + sectorSize > bytes.Length) return false;
            for (var i = (int)offset; i < offset + sectorSize; i += 128)
            {
                var nameLength = BitConverter.ToUInt16(bytes, i + 64);
                if (nameLength == 26 && bytes[i + 66] == 2 &&
                    Encoding.Unicode.GetString(bytes, i, nameLength - 2) == "WordDocument") return true;
            }
            var fatIndex = directorySector / (sectorSize / 4);
            // Initial DIFAT entries cover the directory sectors of ordinary files under 10 MB.
            if (fatIndex >= 109) return false;
            var fatSector = BitConverter.ToUInt32(bytes, 76 + (int)fatIndex * 4);
            var fatOffset = ((long)fatSector + 1) * sectorSize + directorySector % (sectorSize / 4) * 4;
            if (fatOffset < sectorSize || fatOffset + 4 > bytes.Length) return false;
            directorySector = BitConverter.ToUInt32(bytes, (int)fatOffset);
        }
        return false;
    }

    private static bool IsDocx(byte[] bytes)
    {
        try
        {
            using var stream = new MemoryStream(bytes, writable: false);
            using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
            if (zip.Entries.Count is < 3 or > 2048) return false;
            long expanded = 0;
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in zip.Entries)
            {
                expanded += entry.Length;
                if (expanded > 50 * 1024 * 1024 || !names.Add(entry.FullName) || entry.FullName.StartsWith('/') ||
                    entry.FullName.Contains('\\') || entry.FullName.Split('/').Contains("..") ||
                    entry.FullName.EndsWith("vbaProject.bin", StringComparison.OrdinalIgnoreCase)) return false;
            }
            var relationships = zip.GetEntry("_rels/.rels");
            var document = zip.GetEntry("word/document.xml");
            if (relationships is null || document is null) return false;
            var contentTypes = zip.GetEntry("[Content_Types].xml");
            if (contentTypes is null || contentTypes.Length > 1024 * 1024) return false;
            using var content = contentTypes.Open();
            using var reader = XmlReader.Create(content, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 1024 * 1024 });
            var xml = XDocument.Load(reader);
            if (!xml.Descendants().Any(x => (string?)x.Attribute("PartName") == "/word/document.xml" &&
                (string?)x.Attribute("ContentType") == "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml")) return false;
            using var relStream = relationships.Open();
            using var relReader = XmlReader.Create(relStream, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 1024 * 1024 });
            var relXml = XDocument.Load(relReader);
            if (!relXml.Descendants().Any(x => ((string?)x.Attribute("Type"))?.EndsWith("/officeDocument", StringComparison.Ordinal) == true &&
                ((string?)x.Attribute("Target"))?.TrimStart('/') == "word/document.xml" && (string?)x.Attribute("TargetMode") != "External")) return false;
            using var docStream = document.Open();
            using var docReader = XmlReader.Create(docStream, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 50 * 1024 * 1024 });
            var doc = XDocument.Load(docReader);
            return doc.Root?.Name.LocalName == "document" &&
                doc.Root.Name.NamespaceName is "http://schemas.openxmlformats.org/wordprocessingml/2006/main" or "http://purl.oclc.org/ooxml/wordprocessingml/main";
        }
        catch (Exception ex) when (ex is InvalidDataException or XmlException or IOException or ArgumentException or NotSupportedException)
        {
            return false;
        }
    }
}
