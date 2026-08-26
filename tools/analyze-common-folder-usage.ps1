[CmdletBinding()]
param(
    [string]$CommonPath = 'C:\FTP\SITES\SYSTEM-COMMON',
    [string[]]$SearchRoots = @('C:\FTP\SITES\CLUBSITE-4', 'C:\FTP\APPS'),
    [string]$IisConfigPath = 'C:\Windows\System32\inetsrv\config\applicationHost.config',
    [Parameter(Mandatory = $true)] [string]$OutputPath,
    [int]$TimeoutSeconds = 30
)

$watch = [Diagnostics.Stopwatch]::StartNew()
$extensions = @('.asp', '.asa', '.inc', '.aspx', '.config', '.json', '.js', '.ps1', '.xml', '.txt', '.md', '.html', '.htm')
$keywords = @('SYSTEM-COMMON', 'C:\FTP\SITES\SYSTEM-COMMON', '/SYSTEM-COMMON', 'APPS-COMMON', 'C:\FTP\SITES\APPS-COMMON')
$references = New-Object System.Collections.Generic.List[object]
$errors = New-Object System.Collections.Generic.List[string]

function Assert-Time {
    if ($watch.Elapsed.TotalSeconds -ge $TimeoutSeconds) {
        throw "TIMEOUT: analyse stoppet etter $TimeoutSeconds sekunder."
    }
}

function Get-FolderSummary([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        return [pscustomobject]@{ path=$Path; exists=$false; fileCount=0; directoryCount=0; lastWriteTime=$null }
    }
    $files = @(Get-ChildItem -LiteralPath $Path -File -Recurse -ErrorAction SilentlyContinue)
    $dirs = @(Get-ChildItem -LiteralPath $Path -Directory -Recurse -ErrorAction SilentlyContinue)
    return [pscustomobject]@{
        path=$Path
        exists=$true
        fileCount=$files.Count
        directoryCount=$dirs.Count
        lastWriteTime=(Get-Item -LiteralPath $Path).LastWriteTime.ToString('o')
    }
}

try {
    $common = Get-FolderSummary $CommonPath
    $rootSummaries = @($SearchRoots | ForEach-Object { Get-FolderSummary $_ })

    $filesToScan = New-Object System.Collections.Generic.List[string]
    foreach ($root in $SearchRoots) {
        Assert-Time
        if (-not (Test-Path -LiteralPath $root -PathType Container)) {
            $errors.Add("Søkesti finnes ikke: $root")
            continue
        }
        Get-ChildItem -LiteralPath $root -File -Recurse -ErrorAction SilentlyContinue | Where-Object {
            $extensions -contains $_.Extension.ToLowerInvariant()
        } | ForEach-Object { $filesToScan.Add($_.FullName) }
    }

    if (Test-Path -LiteralPath $IisConfigPath -PathType Leaf) {
        $filesToScan.Add($IisConfigPath)
    } else {
        $errors.Add("IIS-konfigurasjon finnes ikke eller kan ikke leses: $IisConfigPath")
    }

    foreach ($file in ($filesToScan | Select-Object -Unique)) {
        Assert-Time
        try {
            $lineNumber = 0
            foreach ($line in [System.IO.File]::ReadLines($file)) {
                $lineNumber++
                Assert-Time
                foreach ($keyword in $keywords) {
                    if ($line.IndexOf($keyword, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                        $references.Add([pscustomobject]@{
                            file=$file
                            line=$lineNumber
                            keyword=$keyword
                        })
                    }
                }
            }
        } catch {
            $errors.Add("Kunne ikke lese $file : $($_.Exception.Message)")
        }
    }

    $report = [pscustomobject]@{
        generatedAt=(Get-Date).ToUniversalTime().ToString('o')
        readOnly=$true
        timeoutSeconds=$TimeoutSeconds
        commonPath=$common
        searchRoots=$rootSummaries
        scannedFileCount=@($filesToScan | Select-Object -Unique).Count
        referenceCount=$references.Count
        references=@($references | Sort-Object file,line,keyword -Unique)
        errors=@($errors)
        conclusion='Indikasjoner fra filreferanser og IIS-konfigurasjon; rapporten beviser ikke alene at ingen prosesser bruker mappen.'
    }

    $outputDirectory = Split-Path -Parent $OutputPath
    if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
        throw "Output-mappe finnes ikke: $outputDirectory"
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding UTF8 -ErrorAction Stop
    $watch.Stop()
    Write-Output "OK: analyse skrevet til $OutputPath på $([math]::Round($watch.Elapsed.TotalSeconds,2)) sekunder. Referanser: $($references.Count)."
} catch {
    $watch.Stop()
    Write-Error $_
    exit 1
}
