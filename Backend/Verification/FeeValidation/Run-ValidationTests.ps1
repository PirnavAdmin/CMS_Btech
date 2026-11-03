$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('CMSFeeValidation-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
try {
    Copy-Item (Join-Path $PSScriptRoot 'Program.cs.fixture') (Join-Path $testRoot 'Program.cs')
    Copy-Item (Join-Path $projectRoot 'Services/Implementations/FeeCollectionValidation.cs') $testRoot
    Copy-Item (Join-Path $projectRoot 'DTOs/Fees/FeeCollectionDtos.cs') $testRoot
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>' | Set-Content (Join-Path $testRoot 'FeeValidationTests.csproj')
    dotnet run --project (Join-Path $testRoot 'FeeValidationTests.csproj')
    if ($LASTEXITCODE -ne 0) { throw 'Validation tests failed.' }
} finally { Remove-Item $testRoot -Recurse -Force }
