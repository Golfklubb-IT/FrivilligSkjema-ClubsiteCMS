[CmdletBinding()]
param(
    [int]$MaxMinutesPerRoot = 10,
    [switch]$ScanContent,
    [string]$OutputRoot = 'C:\FTP\APPS\_readonly-audit'
)

$ErrorActionPreference = 'SilentlyContinue'
$roots = @(
    'C:\FTP\APPS',
    'C:\FTP\SITES\CLUBSITE-4',
    'C:\FTP\SITES\SYSTEM-COMMON',
    'C:\FTP\SITES\CLUBSITE-4\cs4-common',
    'C:\FTP\SITES\CLUBSITE-4\SKI'
)
$skipFolders = @('.git','node_modules','bin','obj','cache','temp','logs','_readonly-audit')
$textExtensions = @('.asp','.asa','.inc','.js','.ts','.html','.htm','.css','.config','.xml','.json','.sql','.ps1','.vbs','.txt','.csv','.md')
$patterns = @(
    @{ Name='ckeditor'; Regex='ckeditor|CKEditor' },
    @{ Name='other-editor'; Regex='tinymce|quill|wysiwyg|contenteditable' },
    @{ Name='plugin'; Regex='plugin|module|extension|addon' },
    @{ Name='tenant'; Regex='tenant|clubid|club_id|clubfolder|dbName|database' },
    @{ Name='session-user'; Regex='Session\s*\(|userID|Admin_Users|Siteusers' },
    @{ Name='database'; Regex='ADODB.Connection|connectionstring|Initial Catalog|Data Source|provider=' },
    @{ Name='secret-indicator'; Regex='password\s*=|pwd\s*=|api[_-]?key|secret|private[_-]?key|token' }
)

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$start = Get-Date
$filesCsv = Join-Path $OutputRoot 'files.csv'
$hitsCsv = Join-Path $OutputRoot 'content-hits.csv'
$statusCsv = Join-Path $OutputRoot 'root-status.csv'

@('Root,RelativePath,FullPath,Extension,SizeBytes,LastWriteTime') |
    Set-Content -LiteralPath $filesCsv -Encoding UTF8
@('Root,RelativePath,Pattern,MatchCount') |
    Set-Content -LiteralPath $hitsCsv -Encoding UTF8
@('Root,Status,Files,Directories,ElapsedSeconds,Message') |
    Set-Content -LiteralPath $statusCsv -Encoding UTF8

function Is-SkippedPath([string]$Path) {
    foreach ($name in $skipFolders) {
        if ($Path -match "[\\/]$([regex]::Escape($name))([\\/]|$)") { return $true }
    }
    return $false
}

function Add-CsvLine([string]$Path, [object]$Object) {
    $Object | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 |
        Add-Content -LiteralPath $Path -Encoding UTF8
}

foreach ($root in $roots) {
    $rootStart = Get-Date
    $files = 0
    $directories = 0
    $timedOut = $false
    $message = ''

    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        Add-CsvLine $statusCsv ([pscustomobject]@{Root=$root;Status='MISSING';Files=0;Directories=0;ElapsedSeconds=0;Message='Mappe finnes ikke'})
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
        $directories++

        $items = @(Get-ChildItem -LiteralPath $current -Force -ErrorAction SilentlyContinue)
        foreach ($item in $items) {
            if (Is-SkippedPath $item.FullName) { continue }

            if ($item.PSIsContainer) {
                $queue.Enqueue($item.FullName)
                continue
            }

            $files++
            $relative = $item.FullName.Substring($root.Length).TrimStart('\')
            Add-CsvLine $filesCsv ([pscustomobject]@{
                Root=$root; RelativePath=$relative; FullPath=$item.FullName;
                Extension=$item.Extension.ToLowerInvariant(); SizeBytes=$item.Length; LastWriteTime=$item.LastWriteTime
            })

            if (($files -eq 1) -or ($files % 25 -eq 0)) {
                $elapsed = [int]((Get-Date) - $rootStart).TotalSeconds
                Write-Progress -Activity "Clubsite audit: $root" -Status "Filer: $files | Mapper: $directories | Siste: $($item.Name) | $elapsed sek" -PercentComplete 0
                Write-Host "[$(Get-Date -Format HH:mm:ss)] $root | filer=$files mapper=$directories | $($item.FullName)"
            }

            if ($ScanContent -and ($textExtensions -contains $item.Extension.ToLowerInvariant()) -and ($item.Length -le 2MB)) {
                try {
                    $content = Get-Content -LiteralPath $item.FullName -Raw -ErrorAction Stop
                    foreach ($pattern in $patterns) {
                        $count = ([regex]::Matches($content, $pattern.Regex, [Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                        if ($count -gt 0) {
                            Add-CsvLine $hitsCsv ([pscustomobject]@{Root=$root;RelativePath=$relative;Pattern=$pattern.Name;MatchCount=$count})
                        }
                    }
                } catch { }
            }
        }
    }

    $elapsed = [int]((Get-Date) - $rootStart).TotalSeconds
    $status = if ($timedOut) { 'TIMEOUT' } else { 'OK' }
    Add-CsvLine $statusCsv ([pscustomobject]@{Root=$root;Status=$status;Files=$files;Directories=$directories;ElapsedSeconds=$elapsed;Message=$message})
    Write-Progress -Activity "Clubsite audit: $root" -Completed
    Write-Host "[$(Get-Date -Format HH:mm:ss)] FERDIG: $root | status=$status filer=$files mapper=$directories tid=${elapsed}s" -ForegroundColor Green
}

$iis = [ordered]@{
    ComputerName = $env:COMPUTERNAME
    UserName = $env:USERNAME
    ApplicationHostConfig = Test-Path 'C:\Windows\System32\inetsrv\config\applicationHost.config'
    Sites = @()
    AppPools = @()
    Applications = @()
    VirtualDirectories = @()
}
try {
    Import-Module WebAdministration -ErrorAction Stop
    $iis.Sites = @(Get-Website | Select-Object Name,State,PhysicalPath,Bindings)
    $iis.AppPools = @(Get-ChildItem IIS:\AppPools | Select-Object Name,State,ManagedRuntimeVersion,ManagedPipelineMode)
} catch { }
try {
    $appcmd = 'C:\Windows\System32\inetsrv\appcmd.exe'
    if (Test-Path $appcmd) {
        $iis.Applications = @(& $appcmd list app 2>$null)
        $iis.VirtualDirectories = @(& $appcmd list vdir 2>$null)
    }
} catch { }

$iis | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $OutputRoot 'iis.json') -Encoding UTF8
[pscustomobject]@{
    ComputerName=$env:COMPUTERNAME; UserName=$env:USERNAME; Started=$start; Completed=Get-Date;
    OutputRoot=$OutputRoot; ScanContent=[bool]$ScanContent; MaxMinutesPerRoot=$MaxMinutesPerRoot;
    Note='Kun auditfiler er opprettet. Eksisterende filer, IIS og SQL er ikke endret.'
} | ConvertTo-Json | Set-Content (Join-Path $OutputRoot 'system.json') -Encoding UTF8

Write-Host ''
Write-Host "AUDIT FERDIG: $OutputRoot" -ForegroundColor Green
Get-ChildItem -LiteralPath $OutputRoot | Select-Object Name,Length,LastWriteTime
