[CmdletBinding()]
param(
    [string]$CommonRoot = 'C:\FTP\SITES\CLUBSITE-4\cs4-common',
    [string]$OutputRoot = 'C:\FTP\APPS\_readonly-registration-audit',
    [int]$MaxMinutes = 5
)

# Begrenset read-only-verifisering. Skriptet leser kun utvalgte filer og
# skriver rapporter til OutputRoot. Det endrer ikke IIS, SQL eller kildefiler.
$ErrorActionPreference = 'Stop'
$started = Get-Date
$deadline = $started.AddMinutes($MaxMinutes)

$selectedFiles = @(
    'CSADMIN\classlib\cCommon.asp',
    'CSADMIN\classlib\cPagefunctions.asp',
    'plugins\chatbot\ai_chatbot_loader.asp',
    'plugins\chatbot\ai_chat_widget.asp',
    'forms\signup_activities.asp',
    'forms\formsview\viewform.asp',
    'forms\activitysignup_hotel.asp'
)

$patterns = @(
    @{ Name='plugin-table'; Regex='Pages_Plugins|pluginID|pluginRef|pageID' },
    @{ Name='plugin-menu'; Regex='plugin|menu|pagefunc_' },
    @{ Name='tenant-context'; Regex='\bdepID\b|adm_depID|clubID|clubFolder|tenant' },
    @{ Name='admin-access'; Regex='checkAdminAccess|arrAreas|arrDepartments|Admin_Users|noaccess' },
    @{ Name='session-user'; Regex='Session\s*\(|userID|Siteusers' },
    @{ Name='forms-tables'; Regex='Forms|Forms_Fields|Forms_FieldTypes|Forms_Fields_Source' },
    @{ Name='stored-procedure'; Regex='A_[A-Za-z0-9_]+' },
    @{ Name='database-access'; Regex='Execute\s*\(|ADODB|dbConn|Connection' }
)

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$filesCsv = Join-Path $OutputRoot 'selected-files.csv'
$evidenceCsv = Join-Path $OutputRoot 'evidence.csv'
$missingCsv = Join-Path $OutputRoot 'missing-files.csv'

function Add-CsvObject {
    param([string]$Path, [object]$Object)
    $Object | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 |
        Add-Content -LiteralPath $Path -Encoding UTF8
}

function Mask-Line([string]$Text) {
    if ($null -eq $Text) { return '' }
    $Text = $Text -replace '(?i)(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*[^,;\s&<]+', '$1=[MASKED]'
    $Text = $Text -replace '(?i)(connectionstring|connstr)\s*[:=]\s*[^;]+', '$1=[MASKED]'
    return $Text.Trim()
}

'RelativePath,FullPath,SizeBytes,LastWriteTime,ReadStatus' | Set-Content -LiteralPath $filesCsv -Encoding UTF8
'RelativePath,LineNumber,Pattern,MaskedLine' | Set-Content -LiteralPath $evidenceCsv -Encoding UTF8
'RelativePath,FullPath,Reason' | Set-Content -LiteralPath $missingCsv -Encoding UTF8

$fileCount = 0
$lineCount = 0
$hitCount = 0

foreach ($relative in $selectedFiles) {
    if ((Get-Date) -ge $deadline) { break }
    $full = Join-Path $CommonRoot $relative

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Add-CsvObject $missingCsv ([pscustomobject]@{ RelativePath=$relative; FullPath=$full; Reason='Mangler eller er ikke tilgjengelig' })
        Write-Host "MANGLER: $relative" -ForegroundColor Yellow
        continue
    }

    $item = Get-Item -LiteralPath $full
    Add-CsvObject $filesCsv ([pscustomobject]@{
        RelativePath=$relative; FullPath=$full; SizeBytes=$item.Length
        LastWriteTime=$item.LastWriteTime; ReadStatus='OK'
    })

    Write-Host "[$(Get-Date -Format HH:mm:ss)] Starter $relative" -ForegroundColor Cyan
    $localLine = 0
    foreach ($line in [System.IO.File]::ReadLines($full)) {
        if ((Get-Date) -ge $deadline) { throw "Tidsgrense nådd under lesing av $relative" }
        $localLine++
        $lineCount++
        foreach ($pattern in $patterns) {
            if ($line -match $pattern.Regex) {
                Add-CsvObject $evidenceCsv ([pscustomobject]@{
                    RelativePath=$relative; LineNumber=$localLine
                    Pattern=$pattern.Name; MaskedLine=(Mask-Line $line)
                })
                $hitCount++
            }
        }
        if (($localLine % 50) -eq 0) {
            Write-Host "  linjer=$lineCount treff=$hitCount filer=$fileCount" -ForegroundColor DarkGray
        }
    }
    $fileCount++
    Write-Host "[$(Get-Date -Format HH:mm:ss)] Ferdig $relative | filer=$fileCount treff=$hitCount" -ForegroundColor Green
}

[pscustomobject]@{
    ComputerName=$env:COMPUTERNAME; UserName=$env:USERNAME; CommonRoot=$CommonRoot
    OutputRoot=$OutputRoot; Started=$started; Completed=(Get-Date)
    SelectedFileCount=$selectedFiles.Count; ReadFileCount=$fileCount
    LineCount=$lineCount; EvidenceCount=$hitCount; MaxMinutes=$MaxMinutes
    ReadOnly=$true
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputRoot 'system.json') -Encoding UTF8

@"
ClubsiteCMS registration read-only audit

Leser kun: cCommon.asp, cPagefunctions.asp, chatbot-eksempel og forms-eksempler.
Se evidence.csv for Pages_Plugins, depID/adm_depID, admin-tilgang og forms-mønster.
Ingen IIS-, SQL- eller kildefiler er endret.
"@ | Set-Content -LiteralPath (Join-Path $OutputRoot 'README.txt') -Encoding UTF8

Write-Host "`nFERDIG: $OutputRoot" -ForegroundColor Green
Get-ChildItem -LiteralPath $OutputRoot | Select-Object Name,Length,LastWriteTime
