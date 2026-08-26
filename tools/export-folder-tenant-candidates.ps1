[CmdletBinding()]
param(
    [string]$ClubsiteRoot = 'C:\FTP\SITES\CLUBSITE-4',
    [Parameter(Mandatory = $true)] [string]$RegistryPath,
    [Parameter(Mandatory = $true)] [string]$OutputPath
)

$stopwatch = [Diagnostics.Stopwatch]::StartNew()
if (-not (Test-Path -LiteralPath $ClubsiteRoot -PathType Container)) {
    throw "Clubsite-root finnes ikke: $ClubsiteRoot"
}
if (-not (Test-Path -LiteralPath $RegistryPath -PathType Leaf)) {
    throw "Registry-fil finnes ikke: $RegistryPath"
}

$registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
$byTenantKey = @{}
foreach ($tenant in $registry.tenants) {
    $byTenantKey[$tenant.tenantKey.ToLowerInvariant()] = $tenant
}

$folders = Get-ChildItem -LiteralPath $ClubsiteRoot -Directory -ErrorAction Stop
$rows = foreach ($folder in $folders) {
    if ($stopwatch.Elapsed.TotalSeconds -ge 30) { throw 'TIMEOUT: folderkartlegging stoppet etter 30 sekunder.' }

    $key = $folder.Name.ToLowerInvariant()
    $tenant = $byTenantKey[$key]
    $appPath = Join-Path $folder.FullName 'FRIVILLIG-APP'
    [pscustomobject]@{
        folderName = $folder.Name
        folderPath = $folder.FullName
        frivilligAppPath = $appPath
        frivilligAppExists = Test-Path -LiteralPath $appPath -PathType Container
        matchedByTenantKey = [bool]$tenant
        matchedClubId = if ($tenant) { $tenant.clubId } else { $null }
        matchedTenantKey = if ($tenant) { $tenant.tenantKey } else { $null }
        matchedDisplayName = if ($tenant) { $tenant.displayName } else { $null }
        matchStatus = if ($tenant) { 'MATCH_BY_FOLDER_NAME' } else { 'REQUIRES_REVIEW' }
    }
}

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    readOnly = $true
    sourceFolder = $ClubsiteRoot
    registrySchemaVersion = $registry.schemaVersion
    note = 'Foldernavn kan avvike fra tenantKey. REQUIRES_REVIEW må kobles mot autoritativ Clubsite-mapping.'
    rows = @($rows)
}

$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    throw "Output-mappe finnes ikke: $outputDirectory. Velg en eksisterende mappe."
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding UTF8 -ErrorAction Stop
$stopwatch.Stop()
Write-Output "OK: $(@($rows).Count) mapper kartlagt til $OutputPath på $([math]::Round($stopwatch.Elapsed.TotalSeconds, 2)) sekunder."
