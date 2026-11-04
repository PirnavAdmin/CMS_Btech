<#
.SYNOPSIS
Configure CMS SMTP using .NET User Secrets on the LOCAL API development PC.
.DESCRIPTION
Run in the Backend folder used by the API behind ngrok. Requires the .NET SDK.
Prompts for SMTP settings and a hidden password, then pipes JSON to Secret Manager.
No password is put in command arguments or written into the project/source tree.
ASP.NET Core loads User Secrets only in Development by default. User Secrets are
local development storage, not an encrypted production secret vault.

Examples (run these in PowerShell, with this script downloaded locally):
  & "$env:USERPROFILE\Downloads\Configure_CMS_SMTP_Development.ps1" -ProjectPath .\BTech.csproj
  # Stop the old backend (Visual Studio Stop or Ctrl+C), then:
  $env:ASPNETCORE_ENVIRONMENT = 'Development'
  $env:DOTNET_ENVIRONMENT = 'Development'
  dotnet run --project .\BTech.csproj --launch-profile http

For IIS, Windows Service, Docker, or a deployed host: configure the actual service's
secret/environment settings instead. Full keys:
  SmtpSettings__Host
  SmtpSettings__Port
  SmtpSettings__SecurityMode       StartTls or SslOnConnect
  SmtpSettings__Username
  SmtpSettings__Password
  SmtpSettings__FromEmail
  SmtpSettings__FromName
  PasswordSetup__BaseUrl           actual HTTPS frontend origin in production
Restart/recycle that service after injection. Setting variables in a separate
PowerShell window does NOT update an already-running API/Visual Studio/service.
Do not put secrets in appsettings.json, launchSettings.json, Git or screenshots.
A plain .env file is not automatically loaded by this ASP.NET Core backend.

After restarting the correct API: check X-CMS-Build response header, run POST
/api/v1/admin/users/email-diagnostics (authentication only; no email),
and retain X-Correlation-ID. After recipient verification and approval, a real resend with smtpAccepted=true confirms provider
acceptance; verify receipt separately at the current account email inbox.
Do NOT create another account to retry a setup email for an already-saved user.
#>
[CmdletBinding()]
param([string]$ProjectPath = '.\BTech.csproj')

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ProjectPath -PathType Leaf)) {
    throw 'BTech.csproj was not found. Run from the actual Backend folder or pass -ProjectPath with its full path.'
}
$project = (Resolve-Path -LiteralPath $ProjectPath).Path
[xml]$projectXml = Get-Content -Raw -LiteralPath $project
$secretNode = $projectXml.SelectSingleNode("//*[local-name()='UserSecretsId']")
if ($null -eq $secretNode -or [string]::IsNullOrWhiteSpace($secretNode.InnerText)) {
    throw 'This project has no UserSecretsId. Use the current CMS backend project; do not select an unrelated checkout.'
}
$dotnet = Get-Command dotnet -CommandType Application -ErrorAction Stop
$sdkOutput = @(& $dotnet.Source --list-sdks 2>&1)
if ($LASTEXITCODE -ne 0 -or $sdkOutput.Count -eq 0) {
    throw 'The .NET SDK is required to use Secret Manager. Install the SDK matching the CMS project, then retry.'
}

function Ask-Value([string]$Label, [string]$Default = '') {
    $prompt = $Label
    if ($Default) { $prompt += " [$Default]" }
    $answer = Read-Host $prompt
    if ([string]::IsNullOrWhiteSpace($answer)) { $answer = $Default }
    if ([string]::IsNullOrWhiteSpace($answer)) { throw "$Label is required." }
    return $answer.Trim()
}

Write-Host 'Configure the backend that actually serves your frontend/ngrok requests.'
Write-Host "Selected project: $project"
Write-Host "User Secrets ID: $($secretNode.InnerText)"
Write-Host 'Enter your provider settings. No test email will be sent by this configuration script.'

$smtpHost = Ask-Value 'SMTP host'
$portText = Ask-Value 'SMTP port' '587'
$smtpPort = 0
if (-not [int]::TryParse($portText, [ref]$smtpPort) -or $smtpPort -lt 1 -or $smtpPort -gt 65535) {
    throw 'SMTP port must be between 1 and 65535.'
}
$defaultMode = 'StartTls'
if ($smtpPort -eq 465) { $defaultMode = 'SslOnConnect' }
$securityMode = Ask-Value 'SMTP security mode: StartTls or SslOnConnect' $defaultMode
if ($securityMode -cnotin @('StartTls', 'SslOnConnect')) { throw 'Use StartTls or SslOnConnect exactly.' }
$sender = Ask-Value 'Provider-authorized sender email'
try {
    $senderAddress = New-Object System.Net.Mail.MailAddress($sender)
    if ($senderAddress.Address -ne $sender) { throw 'Sender must contain an email address only.' }
} catch { throw 'Enter a valid sender email address authorized by your SMTP provider.' }
$senderName = Ask-Value 'Sender display name' 'BTech College'
$username = Ask-Value 'SMTP username'
$frontend = Ask-Value 'Frontend origin' 'http://localhost:5173'
$loginUrl = Ask-Value 'Frontend login URL' ($frontend.TrimEnd('/') + '/login')
$supportEmail = Ask-Value 'Support email' $sender
$frontendUri = $null
if (-not [Uri]::TryCreate($frontend, [UriKind]::Absolute, [ref]$frontendUri) -or
    $frontendUri.AbsolutePath -ne '/' -or $frontendUri.Query -or $frontendUri.Fragment -or $frontendUri.UserInfo -or
    ($frontendUri.Scheme -ne 'https' -and -not ($frontendUri.Scheme -eq 'http' -and $frontendUri.IsLoopback))) {
    throw 'Use an HTTPS frontend origin, or HTTP localhost for local development; do not enter the backend API URL or a page path.'
}

# Higher-precedence environment settings would hide User Secrets. Report names
# only, never values. The operator can remove/fix those in the real launch config.
$names = @('SmtpSettings__Host','SmtpSettings__Port','SmtpSettings__SecurityMode',
    'SmtpSettings__Username','SmtpSettings__Password','SmtpSettings__FromEmail',
    'SmtpSettings__FromName','PasswordSetup__BaseUrl','PasswordSetup__LoginUrl','PasswordSetup__SupportEmail')
$overrides = @($names | Where-Object { $null -ne [Environment]::GetEnvironmentVariable($_, 'Process') })
if ($overrides.Count -gt 0) {
    Write-Warning ('This PowerShell process has environment overrides that take precedence: ' + ($overrides -join ', '))
    Write-Warning 'Fix/remove stale overrides in the API launch environment before testing; this script does not delete them.'
}

$passwordSecure = Read-Host 'SMTP password/app password (hidden)' -AsSecureString
if ($passwordSecure.Length -eq 0) { throw 'SMTP password cannot be blank.' }
$passwordPtr = [IntPtr]::Zero
$passwordPlain = $null
$payload = $null
$secretJson = $null
$oldEncoding = $OutputEncoding
try {
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    if ([string]::IsNullOrWhiteSpace($passwordPlain) -or $passwordPlain -match '^\s*<.*>\s*$') {
        throw 'Supply an actual provider-authorized SMTP secret, not a placeholder.'
    }
    $payload = [ordered]@{
        'SmtpSettings:Host' = $smtpHost
        'SmtpSettings:Port' = [string]$smtpPort
        'SmtpSettings:SecurityMode' = $securityMode
        'SmtpSettings:Username' = $username
        'SmtpSettings:Password' = $passwordPlain
        'SmtpSettings:FromEmail' = $sender
        'SmtpSettings:FromName' = $senderName
        'PasswordSetup:BaseUrl' = $frontendUri.GetLeftPart([UriPartial]::Authority)
        'PasswordSetup:LoginUrl' = $loginUrl
        'PasswordSetup:SupportEmail' = $supportEmail
    }
    $secretJson = $payload | ConvertTo-Json -Compress
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    # JSON is passed through stdin, not saved in a project file or shell argument.
    # Capture CLI output so a failure cannot echo the input/credential payload.
    try {
        $cliOutput = @($secretJson | & $dotnet.Source user-secrets set --project $project 2>&1)
        if ($LASTEXITCODE -ne 0) { throw 'Native command failed.' }
    } catch {
        throw 'Secret Manager failed. Check the SDK, project and local profile permissions. Raw CLI output is withheld to protect secrets.'
    }
} finally {
    $OutputEncoding = $oldEncoding
    if ($passwordPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
    $passwordPlain = $null
    $secretJson = $null
    $payload = $null
    $cliOutput = $null
    if ($passwordSecure) { $passwordSecure.Dispose() }
}

Write-Host 'SMTP and frontend settings saved to .NET User Secrets for the selected project.'
Write-Host 'No project/source file was modified. Restart the ACTUAL backend in Development under this same OS user.'
Write-Host 'Run the Super Admin POST /api/v1/admin/users/email-diagnostics check first (no email is sent). Verify the current recipient and obtain approval before one real resend-invitation attempt.'
Write-Host 'Configuration has been saved; runtime loading, provider authentication and email delivery are NOT yet confirmed.'
