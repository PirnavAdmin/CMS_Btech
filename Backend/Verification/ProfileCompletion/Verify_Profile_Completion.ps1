param(
    [string]$BaseUrl = 'http://localhost:5084',
    [Parameter(Mandatory = $true)][string]$LoginId,
    [Parameter(Mandatory = $true)][string]$FullName,
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Mobile,
    [Parameter(Mandatory = $true)][string]$HouseNumber,
    [System.Security.SecureString]$Password
)
# Run with a designated test account: this saves the supplied profile values.
$ErrorActionPreference = 'Stop'
if (-not $Password) { $Password = Read-Host 'Test account password' -AsSecureString }
$credential = New-Object System.Management.Automation.PSCredential($LoginId, $Password)
$plainPassword = $credential.GetNetworkCredential().Password
try {
    $loginBody = @{ loginId = $LoginId; password = $plainPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$($BaseUrl.TrimEnd('/'))/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
    if (-not $login.success -or -not $login.data.accessToken) { throw 'Login did not succeed.' }
    $headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
    $body = @{ fullName = $FullName; email = $Email; mobile = $Mobile; houseNumber = $HouseNumber } | ConvertTo-Json
    $saved = Invoke-RestMethod -Uri "$($BaseUrl.TrimEnd('/'))/api/v1/profile" -Method Patch -Headers $headers -ContentType 'application/json' -Body $body
    if (-not $saved.success -or $saved.data.profileCompleted -ne $true) { throw 'PATCH did not return profileCompleted: true.' }
    $profile = Invoke-RestMethod -Uri "$($BaseUrl.TrimEnd('/'))/api/v1/profile" -Method Get -Headers $headers
    if (-not $profile.success -or $profile.data.profileCompleted -ne $true) { throw 'GET did not return profileCompleted: true.' }
    # Use the saved email: the account may originally have signed in with a different email/mobile.
    $loginBody = @{ loginId = $Email; password = $plainPassword } | ConvertTo-Json
    $freshLogin = Invoke-RestMethod -Uri "$($BaseUrl.TrimEnd('/'))/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
    if (-not $freshLogin.success -or $freshLogin.data.profileCompleted -ne $true) { throw 'Fresh login did not return profileCompleted: true.' }
    Write-Host 'PASS: PATCH profile, GET profile and fresh login returned profileCompleted: true.'
}
finally {
    $plainPassword = $null
    $loginBody = $null
    $headers = $null
    $login = $null
    $freshLogin = $null
}
