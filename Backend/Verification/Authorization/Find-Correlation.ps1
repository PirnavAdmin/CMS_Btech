param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('^[A-Za-z0-9._-]{1,100}$')]
    [string]$CorrelationId,
    [string]$LogDirectory = '.\Logs'
)
Get-ChildItem -LiteralPath $LogDirectory -File -Filter '*.log' |
    Select-String -SimpleMatch -Pattern $CorrelationId -Context 0,12
