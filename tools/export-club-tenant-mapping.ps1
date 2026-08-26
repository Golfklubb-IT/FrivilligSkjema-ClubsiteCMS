[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$SqlServer,
    [string]$Database = 'CLUBSITE-COMMON',
    [string]$RegistryPath = (Join-Path $PSScriptRoot '..\data\registries\gkit-norwegian-club-tenants.v1.json'),
    [string]$ClubsiteRoot = 'C:\FTP\SITES\CLUBSITE-4',
    [Parameter(Mandatory = $true)] [string]$OutputPath
)

$stopwatch = [Diagnostics.Stopwatch]::StartNew()
if (-not (Test-Path -LiteralPath $RegistryPath)) { throw "Registry-fil finnes ikke: $RegistryPath" }
$credential = Get-Credential -Message 'SQL Server-leser (SQL Authentication). Ingen passord lagres.'

$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$builder.DataSource = $SqlServer
$builder.InitialCatalog = $Database
$builder.UserID = $credential.UserName
$builder.Password = $credential.GetNetworkCredential().Password
$builder.IntegratedSecurity = $false
$builder.ConnectTimeout = 10
$builder.ApplicationName = 'GKIT read-only tenant mapping export'

$sql = @'
SELECT clubID, clubFolder, clubName, active, clubKey, dbName, dbUser
FROM dbo.Clubs
ORDER BY clubID;
'@

$connection = New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
$command = $null
$reader = $null
try {
    $connection.Open()
    if ($stopwatch.Elapsed.TotalSeconds -ge 30) { throw 'TIMEOUT: tilkobling tok mer enn 30 sekunder.' }
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.CommandTimeout = 15
    $reader = $command.ExecuteReader()
    $rows = New-Object System.Collections.Generic.List[object]
    while ($reader.Read()) {
        if ($stopwatch.Elapsed.TotalSeconds -ge 30) { throw 'TIMEOUT: SQL-lesing stoppet etter 30 sekunder.' }
        $rows.Add([pscustomobject]@{
            clubID = [int]$reader['clubID']
            clubFolder = [string]$reader['clubFolder']
            clubName = [string]$reader['clubName']
            active = [bool]$reader['active']
            clubKey = [string]$reader['clubKey']
            dbName = [string]$reader['dbName']
            dbUser = [string]$reader['dbUser']
        })
    }
}
finally {
    if ($reader) { $reader.Close(); $reader.Dispose() }
    if ($command) { $command.Dispose() }
    if ($connection) { $connection.Dispose() }
}

$registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
$byClubId = @{}
foreach ($tenant in $registry.tenants) { $byClubId[[int]$tenant.clubId] = $tenant }

$mapping = foreach ($row in $rows) {
    $tenant = $byClubId[$row.clubID]
    $tenantRoot = Join-Path $ClubsiteRoot $row.clubFolder
    [pscustomobject]@{
        clubId = $row.clubID
        tenantKey = if ($tenant) { $tenant.tenantKey } else { $null }
        displayName = if ($tenant) { $tenant.displayName } else { $row.clubName }
        clubNameSql = $row.clubName
        clubFolder = $row.clubFolder
        tenantRoot = $tenantRoot
        frivilligAppPath = Join-Path $tenantRoot 'FRIVILLIG-APP'
        dbName = $row.dbName
        dbUser = $row.dbUser
        active = $row.active
        registryMatch = [bool]$tenant
        folderExists = Test-Path -LiteralPath $tenantRoot
    }
}

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    readOnly = $true
    sourceDatabase = $Database
    registrySchemaVersion = $registry.schemaVersion
    rows = @($mapping)
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
$stopwatch.Stop()
Write-Output "OK: $(@($mapping).Count) mappinger skrevet til $OutputPath på $([math]::Round($stopwatch.Elapsed.TotalSeconds, 2)) sekunder."
