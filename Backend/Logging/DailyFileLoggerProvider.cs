using Microsoft.Extensions.Logging;

namespace BTech.Logging
{
    /// <summary>
    /// Lightweight daily file logger that uses only the built-in .NET logging
    /// abstractions. Logging failures never stop the API from starting or
    /// serving requests.
    /// </summary>
    public sealed class DailyFileLoggerProvider : ILoggerProvider
    {
        private readonly string _directory;
        private readonly LogLevel _minimumLevel;
        private readonly object _writeLock = new();

        public DailyFileLoggerProvider(
            string directory,
            LogLevel minimumLevel = LogLevel.Information)
        {
            _directory = directory;
            _minimumLevel = minimumLevel;
        }

        public ILogger CreateLogger(string categoryName) =>
            new DailyFileLogger(this, categoryName);

        internal bool IsEnabled(LogLevel level) =>
            level != LogLevel.None && level >= _minimumLevel;

        internal void Write(
            string category,
            LogLevel level,
            EventId eventId,
            string message,
            Exception? exception)
        {
            try
            {
                var now = DateTimeOffset.UtcNow;
                var safeMessage = message
                    .Replace('\r', ' ')
                    .Replace('\n', ' ');

                var line =
                    $"{now:O} [{level}] {category} ({eventId.Id}) {safeMessage}";

                if (exception != null)
                {
                    line += Environment.NewLine + exception;
                }

                line += Environment.NewLine;

                lock (_writeLock)
                {
                    Directory.CreateDirectory(_directory);
                    var path = Path.Combine(
                        _directory,
                        $"backend-{now:yyyyMMdd}.log");
                    File.AppendAllText(path, line);
                }
            }
            catch
            {
                // Logging must never make an API request fail.
            }
        }

        public void Dispose()
        {
        }

        private sealed class DailyFileLogger : ILogger
        {
            private readonly DailyFileLoggerProvider _provider;
            private readonly string _category;

            public DailyFileLogger(
                DailyFileLoggerProvider provider,
                string category)
            {
                _provider = provider;
                _category = category;
            }

            public IDisposable? BeginScope<TState>(TState state)
                where TState : notnull => NullScope.Instance;

            public bool IsEnabled(LogLevel logLevel) =>
                _provider.IsEnabled(logLevel);

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                if (!IsEnabled(logLevel))
                {
                    return;
                }

                _provider.Write(
                    _category,
                    logLevel,
                    eventId,
                    formatter(state, exception),
                    exception);
            }
        }

        private sealed class NullScope : IDisposable
        {
            public static NullScope Instance { get; } = new();

            public void Dispose()
            {
            }
        }
    }
}
