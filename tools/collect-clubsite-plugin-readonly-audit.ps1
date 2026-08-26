[CmdletBinding()]
param(
    [int]$MaxMinutesPerRoot = 5,
    [int]$MaxFileSizeMB = 2,
    [string]$OutputRoot = 'C:\FTP\APPS\_readonly-plugin-audit'
)

# Read-only plugin discovery.
# Oppretter kun rapportfiler i OutputRoot.
$ErrorActionPreference = 'SilentlyContinue'
$auditStarted = Get-Date
$roots = @(
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\ckeditor',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\plugins',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\CSADMIN',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\forms',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\api',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\includes',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common\common-site'
)

$skipFolders = @('.git','node_modules','bin','obj','cache','temp','logs')
$scanExtensions = @('.asp','.asa','.inc','.js','.ts','.html','.htm','.css','.config','.xml','.json','.sql','.ps1','.vbs','.txt','.md')
$sensitiveNames = @('.env','appsettings.json','appsettings.development.json','web.config')
$patterns = @(
    @{ Name='ckeditor'; Regex='ckeditor|CKEDITOR' },
    @{ Name='plugin-registration'; Regex='plugin|plugins|module|extension|addon|register' },
    @{ Name='admin-menu'; Regex='CSADMIN|admin|menu|navigation|modules' },
    @{ Name='tenant-context'; Regex='tenant|clubid|club_id|clubfolder|clubFolder|dbName|dbConn' },
    @{ Name='user-session'; Regex='Session\s*\(|userID|Admin_Users|Siteusers|A_Siteuser_Login' },
    @{ Name='database-access'; Regex='ADODB.Connection|connectionstring|Initial Catalog|Data Source|provider=' },
    @{ Name='form-content'; Regex='form|forms|textarea|contenteditable|wysiwyg' },
    @{ Name='secret-indicator'; Regex='password\s*=|pwd\s*=|api[_-]?key|secret|private[_-]?key|token' }
)

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$filesCsv = Join-Path $OutputRoot 'files.csv'
$hitsCsv = Join-Path $OutputRoot 'content-hits.csv'
$sensitiveCsv = Join-Path $OutputRoot 'sensitive-files.csv'
$statusCsv = Join-Path $OutputRoot 'root-status.csv'

'Root,RelativePath,FullPath,Extension,SizeBytes,LastWriteTime,ContentScanned' | Set-Content $filesCsv -Encoding UTF8
'Root,RelativePath,Pattern,MatchCount,FirstLineNumbers' | Set-Content $hitsCsv -Encoding UTF8
'Root,RelativePath,Reason,SizeBytes,LastWriteTime' | Set-Content $sensitiveCsv -Encoding UTF8
'Root,Status,Files,Directories,ContentFiles,ElapsedSeconds,Message' | Set-Content $statusCsv -Encoding UTF8

function Add-CsvLine {
    param([string]$Path, [object]$Object)
    $Object | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 |
        Add-Content -LiteralPath $Path -Encoding UTF8
}

function Is-SkippedPath([string]$Path) {
    foreach ($name in $skipFolders) {
        if ($Path -match "[\\/]$([regex]::Escape($name))([\\/]|$)") { return $true }
    }
    return $false
}

function Is-SensitiveFile([string]$Name) {
    $lower = $Name.ToLowerInvariant()
    if ($sensitiveNames -contains $lower) { return $true }
    if ($lower -match 'password|secret|credential|private|token') { return $true }
    return $false
}

foreach ($root in $roots) {
    $rootStart = Get-Date
    $fileCount = 0
    $directoryCount = 0
    $contentCount = 0
    $timedOut = $false
    $message = ''

    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        Add-CsvLine $statusCsv ([pscustomobject]@{Root=$root;Status='MISSING';Files=0;Directories=0;ContentFiles=0;ElapsedSeconds=0;Message='Mappe finnes ikke'})
        Write-Host "[$(Get-Date -Format HH:mm:ss)] MANGLER: $root" -ForegroundColor Yellow
        continue
    }

    Write-Host "[$(Get-Date -Format HH:mm:ss)] STARTER: $root" -ForegroundColor Cyan
    $queue = New-Object System.Collections.Queue
    $queue.Enqueue([IO.Path]::GetFullPath($root).TrimEnd('\'))

    while ($queue.Count -gt 0) {
        if (((Get-Date) - $rootStart).TotalMinutes -ge $MaxMinutesPerRoot) {
            $timedOut = $true
            $message = "Tidsgrense på $MaxMinutesPerRoot minutter nådd"
            break
        }

        $current = $queue.Dequeue()
        if (Is-SkippedPath $current) { continue }
        $directoryCount++

        $items = @(Get-ChildItem -LiteralPath $current -Force -ErrorAction SilentlyContinue)
        foreach ($item in $items) {
            if (Is-SkippedPath $item.FullName) { continue }

            if ($item.PSIsContainer) {
                $queue.Enqueue($item.FullName)
                continue
            }

            $fileCount++
            $relative = $item.FullName.Substring($root.Length).TrimStart('\')
            $sensitive = Is-SensitiveFile $item.Name
            $canScan = (-not $sensitive) -and ($scanExtensions -contains $item.Extension.ToLowerInvariant()) -and ($item.Length -le ($MaxFileSizeMB * 1MB))

            Add-CsvLine $filesCsv ([pscustomobject]@{
                Root=$root; RelativePath=$relative; FullPath=$item.FullName;
                Extension=$item.Extension.ToLowerInvariant(); SizeBytes=$item.Length;
                LastWriteTime=$item.LastWriteTime; ContentScanned=$canScan
            })

            if ($sensitive) {
                Add-CsvLine $sensitiveCsv ([pscustomobject]@{
                    Root=$root; RelativePath=$relative; Reason='Sensitive/config filename – content not read';
                    SizeBytes=$item.Length; LastWriteTime=$item.LastWriteTime
                })
            }

            if ($canScan) {
                $contentCount++
                try {
                    $lineNumbers = @{}
                    $lineNumber = 0
                    $reader = New-Object System.IO.StreamReader($item.FullName, $true)
                    while (($line = $reader.ReadLine()) -ne $null) {
                        $lineNumber++
                        foreach ($pattern in $patterns) {
                            if ($line -match $pattern.Regex) {
                                if (-not $lineNumbers.ContainsKey($pattern.Name)) { $lineNumbers[$pattern.Name] = New-Object System.Collections.Generic.List[int] }
                                if ($lineNumbers[$pattern.Name].Count -lt 20) { $lineNumbers[$pattern.Name].Add($lineNumber) }
                            }
                        }
                    }
                    $reader.Close()
                    foreach ($name in $lineNumbers.Keys) {
                        Add-CsvLine $hitsCsv ([pscustomobject]@{
                            Root=$root; RelativePath=$relative; Pattern=$name;
                            MatchCount=$lineNumbers[$name].Count;
                            FirstLineNumbers=($lineNumbers[$name] -join '|')
                        })
                    }
                } catch { }
            }

            if (($fileCount -eq 1) -or ($fileCount % 25 -eq 0)) {
                $elapsed = [int]((Get-Date) - $rootStart).TotalSeconds
                Write-Progress -Activity "Plugin audit: $root" -Status "Filer=$fileCount | mapper=$directoryCount | skannet=$contentCount | siste=$($item.Name) | ${elapsed}s" -PercentComplete 0
                Write-Host "[$(Get-Date -Format HH:mm:ss)] $root | filer=$fileCount mapper=$directoryCount skannet=$contentCount | $($item.FullName)"
            }
        }
    }

    $elapsed = [int]((Get-Date) - $rootStart).TotalSeconds
    $status = if ($timedOut) { 'TIMEOUT' } else { 'OK' }
    Add-CsvLine $statusCsv ([pscustomobject]@{Root=$root;Status=$status;Files=$fileCount;Directories=$directoryCount;ContentFiles=$contentCount;ElapsedSeconds=$elapsed;Message=$message})
    Write-Progress -Activity "Plugin audit: $root" -Completed
    Write-Host "[$(Get-Date -Format HH:mm:ss)] FERDIG: $root | status=$status filer=$fileCount mapper=$directoryCount skannet=$contentCount tid=${elapsed}s" -ForegroundColor Green
}

[pscustomobject]@{
    ComputerName=$env:COMPUTERNAME
    UserName=$env:USERNAME
    Started=$auditStarted
    OutputRoot=$OutputRoot
    MaxMinutesPerRoot=$MaxMinutesPerRoot
    MaxFileSizeMB=$MaxFileSizeMB
    Note='Read-only discovery. Sensitive/config filenames were listed, but their content was not read.'
} | ConvertTo-Json | Set-Content (Join-Path $OutputRoot 'system.json') -Encoding UTF8

@"
Begrenset ClubsiteCMS plugin audit

Rapporter:
- root-status.csv       status, teller og timeout per rotmappe
- files.csv             filinventar og om filen ble innholdsskannet
- content-hits.csv      mønsternavn og linjenummer, aldri linjeinnhold
- sensitive-files.csv   sensitive/config-filnavn; innholdet ble ikke lest
- system.json           kjøreinformasjon og begrensninger

Ingen eksisterende app-, IIS- eller SQL-filer ble endret.
"@ | Set-Content (Join-Path $OutputRoot 'README.txt') -Encoding UTF8

Write-Host ''
Write-Host "PLUGIN-AUDIT FERDIG: $OutputRoot" -ForegroundColor Green
Get-ChildItem -LiteralPath $OutputRoot | Select-Object Name,Length,LastWriteTime
