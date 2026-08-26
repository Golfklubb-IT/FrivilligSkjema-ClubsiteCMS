[CmdletBinding()]
param(
    [string]$RegistryPath = (Join-Path $PSScriptRoot '..\data\registries\gkit-norwegian-club-tenants.v1.json'),
    [string]$OverridesPath = (Join-Path $PSScriptRoot 'club-folder-mapping-overrides.csv'),
    [Parameter(Mandatory = $true)] [string]$OutputPath
)

$registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
$overrides = @(Import-Csv -LiteralPath $OverridesPath)
$allowedTypes = @('club', 'association', 'shop', 'facility')
$byId = @{}
$byKey = @{}
foreach ($tenant in $registry.tenants) {
    $byId[[string]$tenant.clubId] = $tenant
    $byKey[$tenant.tenantKey.ToLowerInvariant()] = $tenant
}

$errors = New-Object System.Collections.Generic.List[string]
$mappingRows = New-Object System.Collections.Generic.List[object]
$nonClubRows = New-Object System.Collections.Generic.List[object]
$seenFolders = @{}
$seenKeys = @{}

foreach ($row in $overrides) {
    $folder = [string]$row.folderName
    $clubId = [string]$row.clubId
    $key = ([string]$row.tenantKey).ToLowerInvariant()
    $type = ([string]$row.tenantType).ToLowerInvariant()

    if ($row.approved.ToUpperInvariant() -ne 'YES') { $errors.Add("Ikke godkjent: $folder") }
    if (-not $folder) { $errors.Add('Tom folderName') }
    if ($seenFolders.ContainsKey($folder.ToLowerInvariant())) { $errors.Add("Duplikat folderName: ${folder}") }
    $seenFolders[$folder.ToLowerInvariant()] = $true
    if ($seenKeys.ContainsKey($key)) { $errors.Add("Duplikat tenantKey: $key") }
    $seenKeys[$key] = $true
    if ($allowedTypes -notcontains $type) { $errors.Add("Ugyldig tenantType for ${folder}: $type") }

    if ($type -eq 'club') {
        if (-not $clubId) { $errors.Add("Klubb mangler clubId: ${folder}"); continue }
        $tenant = $byId[$clubId]
        if (-not $tenant) { $errors.Add("clubId finnes ikke i registry: $clubId (${folder})"); continue }
        if ($tenant.tenantKey -ne $key) { $errors.Add("tenantKey stemmer ikke for ${folder}: $key != $($tenant.tenantKey)"); continue }
        $mappingRows.Add([pscustomobject]@{folderName=$folder;clubId=[int]$clubId;tenantKey=$key;tenantType=$type;displayName=$tenant.displayName;serverFolder=$folder;registryMatch=$true})
        Add-Member -InputObject $tenant -NotePropertyName serverFolder -NotePropertyValue $folder -Force
        Add-Member -InputObject $tenant -NotePropertyName serverMappingConfirmed -NotePropertyValue $true -Force
    } else {
        if ($clubId) { $errors.Add("Ikke-klubb skal ikke ha clubId: ${folder}") }
        if ($byKey.ContainsKey($key)) { $errors.Add("Ikke-klubb bruker eksisterende klubb-tenantKey: $key") }
        $nonClub = [pscustomobject]@{tenantKey=$key;displayName=$folder;tenantType=$type;registryType='non-club';clubId=$null;serverFolder=$folder;serverMappingConfirmed=$true}
        $nonClubRows.Add($nonClub)
        $mappingRows.Add([pscustomobject]@{folderName=$folder;clubId=$null;tenantKey=$key;tenantType=$type;displayName=$folder;serverFolder=$folder;registryMatch=$false})
    }
}

if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; throw 'Mapping stoppet: korriger valideringsfeilene før fasitfilen genereres.' }

$registry.schemaVersion = '1.1.0'
$registry.generatedAt = (Get-Date).ToString('yyyy-MM-dd')
$registry.purpose.activationStateIncluded = $false
$registry.purpose.description = 'Versjonert identitetsregister for norske golfklubber, godkjente foreninger, shops og anlegg på tvers av GKIT-apper.'
$registry.counts = [pscustomobject]@{
    officialClubs = @($registry.tenants | Where-Object registryType -eq 'official').Count
    demoTenants = @($registry.tenants | Where-Object isDemo -eq $true).Count
    nonClubTenants = $nonClubRows.Count
    totalTenants = @($registry.tenants).Count + $nonClubRows.Count
}
$registry | Add-Member -NotePropertyName nonClubTenants -NotePropertyValue $nonClubRows.ToArray() -Force
$registry | Add-Member -NotePropertyName serverFolderMappings -NotePropertyValue $mappingRows.ToArray() -Force
$registry | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output "OK: v1.1.0 generert med $($mappingRows.Count) foldermappinger og $($nonClubRows.Count) non-club tenants."
