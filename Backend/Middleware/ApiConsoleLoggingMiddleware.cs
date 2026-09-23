using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace BTech.Middleware
{
    /// <summary>
    /// Prints API request/response data to the normal ASP.NET Core logger.
    /// The default Console logger therefore shows it in the command prompt,
    /// while the existing DailyFileLoggerProvider also keeps a file copy.
    ///
    /// This middleware does not change controller routes, DTOs, services,
    /// repositories, database writes, or HTTP response bodies.
    /// </summary>
    public sealed class ApiConsoleLoggingMiddleware
    {
        private const int DefaultMaxBodyLength = 1024 * 1024; // 1 MB of text

        private static readonly Regex SensitiveJsonValueRegex = new(
            "(\\\"[^\\\"]*(?:password|token|secret|otp|authorization|cookie)[^\\\"]*\\\"\\s*:\\s*)(\\\"(?:\\\\.|[^\\\"])*\\\"|[^,}\\r\\n]+)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex SensitiveFormValueRegex = new(
            "(?i)((?:password|token|secret|otp|authorization|cookie)[^=]*=)[^&]*",
            RegexOptions.Compiled);

        private readonly RequestDelegate _next;
        private readonly ILogger<ApiConsoleLoggingMiddleware> _logger;
        private readonly IConfiguration _configuration;

        public ApiConsoleLoggingMiddleware(
            RequestDelegate next,
            ILogger<ApiConsoleLoggingMiddleware> logger,
            IConfiguration configuration)
        {
            _next = next;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Path.StartsWithSegments("/api") ||
                !_configuration.GetValue("Logging:ApiTraffic:Enabled", true))
            {
                await _next(context);
                return;
            }

            var maxBodyLength = Math.Max(
                4096,
                _configuration.GetValue(
                    "Logging:ApiTraffic:MaxBodyLength",
                    DefaultMaxBodyLength));

            var stopwatch = Stopwatch.StartNew();
            var requestBody = await ReadRequestBodyAsync(context, maxBodyLength);
            var requestUrl = BuildSafeRequestUrl(context);
            var operation = GetOperationName(context.Request.Method);

            LogRequest(context, operation, requestUrl, requestBody);

            var originalResponseBody = context.Response.Body;
            await using var captureStream =
                new ResponseCaptureStream(originalResponseBody, maxBodyLength);

            context.Response.Body = captureStream;

            try
            {
                // Existing ExceptionMiddleware is immediately after this
                // middleware in Program.cs. It converts thrown exceptions to
                // the application's existing HTTP error response; this logger
                // then prints that response exactly like every other API result.
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                context.Response.Body = originalResponseBody;

                var responseBody = ReadResponseBody(context, captureStream);
                LogResponse(
                    context,
                    operation,
                    requestUrl,
                    responseBody,
                    stopwatch.ElapsedMilliseconds);
            }
        }

        private void LogRequest(
            HttpContext context,
            string operation,
            string requestUrl,
            string requestBody)
        {
            _logger.LogInformation(
                """

                ==================== API REQUEST ====================
                CorrelationId : {CorrelationId}
                Operation     : {Operation}
                Method        : {Method}
                URL           : {Url}
                Content-Type  : {ContentType}
                Request Data:
                {RequestBody}
                =====================================================
                """,
                context.TraceIdentifier,
                operation,
                context.Request.Method,
                requestUrl,
                context.Request.ContentType ?? "<none>",
                requestBody);
        }

        private void LogResponse(
            HttpContext context,
            string operation,
            string requestUrl,
            string responseBody,
            long durationMilliseconds)
        {
            const string template = """

                ==================== API RESPONSE ===================
                CorrelationId : {CorrelationId}
                Operation     : {Operation}
                Method        : {Method}
                URL           : {Url}
                Status        : {StatusCode}
                Duration      : {DurationMs} ms
                Content-Type  : {ContentType}
                Response Data:
                {ResponseBody}
                =====================================================
                """;

            var values = new object?[]
            {
                context.TraceIdentifier,
                operation,
                context.Request.Method,
                requestUrl,
                context.Response.StatusCode,
                durationMilliseconds,
                context.Response.ContentType ?? "<none>",
                responseBody
            };

            if (context.Response.StatusCode >= 500)
            {
                _logger.LogError(template, values);
            }
            else if (context.Response.StatusCode >= 400)
            {
                _logger.LogWarning(template, values);
            }
            else
            {
                _logger.LogInformation(template, values);
            }
        }

        private static async Task<string> ReadRequestBodyAsync(
            HttpContext context,
            int maxBodyLength)
        {
            if (context.Request.ContentLength is null or 0)
            {
                return "<no request body>";
            }

            var contentType = context.Request.ContentType ?? string.Empty;

            // Never copy uploaded file bytes to the command prompt.
            if (contentType.StartsWith(
                    "multipart/form-data",
                    StringComparison.OrdinalIgnoreCase))
            {
                return $"<multipart/form-data body omitted; ContentLength={context.Request.ContentLength}>";
            }

            if (!IsTextContentType(contentType))
            {
                return $"<non-text request body omitted; ContentType={contentType}; ContentLength={context.Request.ContentLength}>";
            }

            context.Request.EnableBuffering();

            if (!context.Request.Body.CanSeek)
            {
                return "<request body is not seekable>";
            }

            context.Request.Body.Position = 0;

            try
            {
                using var reader = new StreamReader(
                    context.Request.Body,
                    Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    bufferSize: 4096,
                    leaveOpen: true);

                var buffer = new char[maxBodyLength + 1];
                var total = 0;

                while (total < buffer.Length)
                {
                    var read = await reader.ReadAsync(
                        buffer.AsMemory(total, buffer.Length - total),
                        context.RequestAborted);

                    if (read == 0)
                    {
                        break;
                    }

                    total += read;
                }

                var truncated = total > maxBodyLength;
                var raw = new string(
                    buffer,
                    0,
                    Math.Min(total, maxBodyLength));

                var safe = SanitizeBody(raw, contentType);

                return truncated
                    ? safe + $"\n<request log truncated after {maxBodyLength} characters>"
                    : safe;
            }
            catch (OperationCanceledException)
            {
                return "<request body reading cancelled>";
            }
            catch (Exception ex)
            {
                return $"<request body could not be logged: {ex.GetType().Name}>";
            }
            finally
            {
                context.Request.Body.Position = 0;
            }
        }

        private static string ReadResponseBody(
            HttpContext context,
            ResponseCaptureStream captureStream)
        {
            if (context.Response.StatusCode == StatusCodes.Status204NoContent)
            {
                return "<no content>";
            }

            var contentType = context.Response.ContentType ?? string.Empty;

            if (!IsTextContentType(contentType))
            {
                return $"<non-text/binary response omitted; ContentType={contentType}; BytesWritten={captureStream.TotalBytesWritten}>";
            }

            var bytes = captureStream.GetCapturedBytes();

            if (bytes.Length == 0)
            {
                return "<empty response body>";
            }

            var raw = Encoding.UTF8.GetString(bytes);
            var safe = SanitizeBody(raw, contentType);

            return captureStream.IsTruncated
                ? safe + $"\n<response log truncated after {bytes.Length} bytes; total bytes written={captureStream.TotalBytesWritten}>"
                : safe;
        }

        private static string SanitizeBody(
            string raw,
            string contentType)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return "<empty>";
            }

            if (IsJsonContentType(contentType))
            {
                try
                {
                    var node = JsonNode.Parse(raw);

                    if (node != null)
                    {
                        RedactSensitiveJsonValues(node);
                        return node.ToJsonString(
                            new JsonSerializerOptions
                            {
                                WriteIndented = true
                            });
                    }
                }
                catch (JsonException)
                {
                    // A deliberately truncated JSON log is not valid JSON.
                    // Fall through to regex redaction instead of printing
                    // passwords/tokens from the partial document.
                }

                return SensitiveJsonValueRegex.Replace(
                    raw,
                    "$1\"***REDACTED***\"");
            }

            if (contentType.StartsWith(
                    "application/x-www-form-urlencoded",
                    StringComparison.OrdinalIgnoreCase))
            {
                return SensitiveFormValueRegex.Replace(
                    raw,
                    "$1***REDACTED***");
            }

            return raw;
        }

        private static void RedactSensitiveJsonValues(JsonNode node)
        {
            if (node is JsonObject jsonObject)
            {
                foreach (var property in jsonObject.ToList())
                {
                    if (IsSensitiveKey(property.Key))
                    {
                        jsonObject[property.Key] = "***REDACTED***";
                    }
                    else if (property.Value != null)
                    {
                        RedactSensitiveJsonValues(property.Value);
                    }
                }

                return;
            }

            if (node is JsonArray jsonArray)
            {
                foreach (var item in jsonArray)
                {
                    if (item != null)
                    {
                        RedactSensitiveJsonValues(item);
                    }
                }
            }
        }

        private static bool IsSensitiveKey(string key)
        {
            var normalized = key.Replace("_", string.Empty)
                .Replace("-", string.Empty)
                .ToLowerInvariant();

            return normalized.Contains("password") ||
                   normalized.Contains("token") ||
                   normalized.Contains("secret") ||
                   normalized.Contains("otp") ||
                   normalized.Contains("authorization") ||
                   normalized.Contains("cookie");
        }

        private static string BuildSafeRequestUrl(HttpContext context)
        {
            if (context.Request.Query.Count == 0)
            {
                return context.Request.Path.Value ?? "/";
            }

            var queryParts = new List<string>();

            foreach (var item in context.Request.Query)
            {
                var values = IsSensitiveKey(item.Key)
                    ? new[] { "***REDACTED***" }
                    : item.Value.ToArray();

                foreach (var value in values)
                {
                    queryParts.Add(
                        $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(value ?? string.Empty)}");
                }
            }

            return $"{context.Request.Path}?{string.Join("&", queryParts)}";
        }

        private static bool IsTextContentType(string contentType) =>
            string.IsNullOrWhiteSpace(contentType) ||
            IsJsonContentType(contentType) ||
            contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase) ||
            contentType.Contains("xml", StringComparison.OrdinalIgnoreCase) ||
            contentType.StartsWith(
                "application/x-www-form-urlencoded",
                StringComparison.OrdinalIgnoreCase) ||
            contentType.Contains("javascript", StringComparison.OrdinalIgnoreCase);

        private static bool IsJsonContentType(string contentType) =>
            contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase) ||
            contentType.Contains("text/json", StringComparison.OrdinalIgnoreCase) ||
            contentType.Contains("+json", StringComparison.OrdinalIgnoreCase) ||
            // MVC may not set Content-Type until a result is executed.
            string.IsNullOrWhiteSpace(contentType);

        private static string GetOperationName(string method) =>
            method.ToUpperInvariant() switch
            {
                "GET" => "DISPLAY / READ",
                "POST" => "INSERT / ACTION",
                "PUT" => "UPDATE",
                "PATCH" => "UPDATE",
                "DELETE" => "DELETE",
                _ => "API CALL"
            };

        /// <summary>
        /// Pass-through response stream that keeps only the first configured
        /// number of bytes for logging. File downloads and large responses are
        /// still streamed directly to the client and are never buffered in full.
        /// </summary>
        private sealed class ResponseCaptureStream : Stream
        {
            private readonly Stream _inner;
            private readonly MemoryStream _capture = new();
            private readonly int _maxCaptureBytes;

            public ResponseCaptureStream(
                Stream inner,
                int maxCaptureBytes)
            {
                _inner = inner;
                _maxCaptureBytes = maxCaptureBytes;
            }

            public long TotalBytesWritten { get; private set; }

            public bool IsTruncated =>
                TotalBytesWritten > _capture.Length;

            public byte[] GetCapturedBytes() =>
                _capture.ToArray();

            public override bool CanRead => _inner.CanRead;
            public override bool CanSeek => false;
            public override bool CanWrite => _inner.CanWrite;
            public override long Length => TotalBytesWritten;

            public override long Position
            {
                get => TotalBytesWritten;
                set => throw new NotSupportedException();
            }

            public override void Flush() =>
                _inner.Flush();

            //public override Task FlushAsync(CancellationToken cancellationToken) =>
            //    _inner.FlushAsync(cancellationToken);

            public override async Task FlushAsync(CancellationToken cancellationToken)
            {
                try
                {
                    await _inner.FlushAsync(cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    // Log a warning or handle the graceful exit here
                    // Do not rethrow as an unhandled error unless you want the server to log a critical failure
                }
            }
            public override int Read(byte[] buffer, int offset, int count) =>
                _inner.Read(buffer, offset, count);

            public override long Seek(long offset, SeekOrigin origin) =>
                throw new NotSupportedException();

            public override void SetLength(long value) =>
                throw new NotSupportedException();

            public override void Write(byte[] buffer, int offset, int count)
            {
                Capture(buffer.AsSpan(offset, count));
                _inner.Write(buffer, offset, count);
            }

            public override async Task WriteAsync(
                byte[] buffer,
                int offset,
                int count,
                CancellationToken cancellationToken)
            {
                Capture(buffer.AsSpan(offset, count));
                await _inner.WriteAsync(
                    buffer,
                    offset,
                    count,
                    cancellationToken);
            }

            

            public override async ValueTask WriteAsync(
    ReadOnlyMemory<byte> buffer,
    CancellationToken cancellationToken = default)
            {
                try
                {
                    // Capture response data
                    Capture(buffer.Span);

                    // Write response to the original stream
                    await _inner.WriteAsync(buffer, cancellationToken);
                }
                catch (OperationCanceledException)
                    when (cancellationToken.IsCancellationRequested)
                {
                    // Client disconnected or request was canceled.
                    // Do not treat this as an unexpected application error.
                    return;
                }
            }

            private void Capture(ReadOnlySpan<byte> buffer)
            {
                TotalBytesWritten += buffer.Length;

                var remaining =
                    _maxCaptureBytes - (int)_capture.Length;

                if (remaining <= 0)
                {
                    return;
                }

                var take = Math.Min(remaining, buffer.Length);
                _capture.Write(buffer[..take]);
            }

            protected override void Dispose(bool disposing)
            {
                if (disposing)
                {
                    _capture.Dispose();
                }

                // Never dispose the real ASP.NET response stream.
                base.Dispose(disposing);
            }

            public override async ValueTask DisposeAsync()
            {
                await _capture.DisposeAsync();
                GC.SuppressFinalize(this);
            }
        }
    }
}
