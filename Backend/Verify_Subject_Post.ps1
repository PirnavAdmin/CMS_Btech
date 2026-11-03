$ErrorActionPreference = 'Stop'
$url = 'http://localhost:5084/swagger/v1/swagger.json'
Write-Host "Checking $url ..."
$swagger = Invoke-RestMethod -Uri $url -Method Get
$prop = $swagger.paths.PSObject.Properties['/api/v1/subjects']
if ($null -eq $prop) {
    Write-Error 'FAIL: /api/v1/subjects is missing from live Swagger.'
    exit 2
}
$path = $prop.Value
if ($null -eq $path.post) {
    Write-Error 'FAIL: POST /api/v1/subjects is missing. An old or different backend is running.'
    exit 3
}
Write-Host 'PASS: POST /api/v1/subjects is present in live Swagger.' -ForegroundColor Green
