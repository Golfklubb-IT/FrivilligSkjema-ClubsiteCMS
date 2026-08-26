[CmdletBinding()]
param(
    [string]$CommonRoot = 'C:\FTP\SITES\CLUBSITE-4\cs4-common',
    [string]$OutputRoot = 'C:\FTP\APPS\_readonly-integration-audit',
    [int]$MaxMinutes = 8
)

# Leser kun utvalgte Clubsite-filer. Skriptet oppretter bare rapporter i OutputRoot.
$ErrorActionPreference = 'SilentlyContinue'
$started = Get-Date

$selectedFiles = @(
    'CSADMIN\classlib\cCommon.asp',
    'CSADMIN\classlib\cPagefunctions.asp',
    'CSADMIN\ckeditor\ckeditor.js',
    'CSADMIN\ckeditor\build-config.js',
    'CSADMIN\ckeditor\config.js',
    'CSADMIN\ckeditor\styles.js',
    'plugins\chatbot\ai_chatbot_loader.asp',
    'plugins\chatbot\ai_chat_widget.asp',
    'plugins\chatbot\chatbot.js',
    'plugins\chatbot\chatbot.css',
    'plugins\vbsUpload\conn.asp',
    'plugins\vbsUpload\Download.asp',
    'plugins\vbsUpload\Process_DB.asp',
    'plugins\vbsUpload\Process_File.asp',
    'plugins\vbsUpload\vbsUpload.asp',
    'forms\signup_activities.asp',
    'forms\formsview\viewform.asp',
    'forms\activitysignup_hotel.asp'
)

$scanPatterns = @(
    @{Name='ckeditor-version'; Regex='CKEDITOR_VERSION|version\s*[:=]|CKEditor\s+[0-9]'},
    @{Name='ckeditor-init'; Regex='CKEDITOR\.replace|CKEDITOR\.inline|CKEDITOR\.instances|CKEDITOR\.config'},
    @{Name='ckeditor-data'; Regex='getData|setData|textarea|contenteditable'},
    @{Name='plugin-registration'; Regex='plugin|plugins|module|extension|addon|register|include'},
    @{Name='tenant-context'; Regex='tenant|clubid|club_id|clubFolder|dbName|dbConn|clubfolder'},
    @{Name='user-session'; Regex='Session\s*\(|userID|Admin_Users|Siteusers|A_Siteuser_Login'},
    @{Name='admin-access'; Regex='CSADMIN|admin|role|permission|access|noaccess'},
    @{Name='database-access'; Regex='ADODB.Connection|connectionstring|Initial Catalog|Data Source|provider=|Execute\s*\('},
    @{Name='form-flow'; Regex='Request\.Form|Request\.QueryString|form|signup|activity|member'},
    @{Name='upload-flow'; Regex='upload|Upload|FileSystemObject|SaveAs|image|folder'}
)

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$filesCsv = Join-Path $OutputRoot 'selected-files.csv'
$evidenceCsv = Join-Path $OutputRoot 'evidence.csv'
$missingCsv = Join-Path $OutputRoot 'missing-files.csv'

'RelativePath,FullPath,SizeBytes,LastWriteTime,ReadStatus' | Set-Content $filesCsv -Encoding UTF8
'RelativePath,LineNumber,Pattern,MaskedLine' | Set-Content $evidenceCsv -Encoding UTF8
'RelativePath,FullPath,Reason' | Set-Content $missingCsv -Encoding UTF8

function Add-CsvLine {
    param([string]$Path, [object]$Object)
    $Object | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 |
        Add-Content -LiteralPath $Path -Encoding UTF8
}

function Mask-SensitiveText([string]$Text) {
    if ($null -eq $Text) { return '' }
    $Text = $Text -replace '(?i)(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*[^,;\s&<]+', '$1=[MASKED]'
    $Text = $Text -replace '(?i)(connectionstring|connstr)\s*[:=]\s*[^;]+', '$1=[MASKED]'
    $Text = $Text -replace '(?i)(Bearer\s+)[A-Za-z0-9._-]+', '$1[MASKED]'
    return $Text.Trim()
}

$found = 0
$scanned = 0
$deadline = $started.AddMinutes($MaxMinutes)

foreach ($relative in $selectedFiles) {
    if ((Get-Date) -ge $deadline) { break }
    $full = Join-Path $CommonRoot $relative

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Add-CsvLine $missingCsv ([pscustomobject]@{RelativePath=$relative;FullPath=$full;Reason='Filen finnes ikke eller er ikke tilgjengelig'})
        Write-Host "MANGLER: $full" -ForegroundColor Yellow
        continue
    }

    $file = Get-Item -LiteralPath $full
    Add-CsvLine $filesCsv ([pscustomobject]@{RelativePath=$relative;FullPath=$full;SizeBytes=$file.Length;LastWriteTime=$file.LastWriteTime;ReadStatus='Selected'})
    Write-Host "[$(Get-Date -Format HH:mm:ss)] Leser: $relative" -ForegroundColor Cyan

    if ($file.Length -gt 4MB) {
        Add-CsvLine $missingCsv ([pscustomobject]@{RelativePath=$relative;FullPath=$full;Reason='For stor for kontrollert innholdsskanning'})
        continue
    }

    try {
        $lineNumber = 0
        foreach ($line in (Get-Content -LiteralPath $full -ErrorAction Stop)) {
            $lineNumber++
            foreach ($pattern in $scanPatterns) {
                if ($line -match $pattern.Regex) {
                    $scanned++
                    $masked = Mask-SensitiveText $line
                    Add-CsvLine $evidenceCsv ([pscustomobject]@{RelativePath=$relative;LineNumber=$lineNumber;Pattern=$pattern.Name;MaskedLine=$masked})
                }
            }
            if ((Get-Date) -ge $deadline) { break }
        }
    }
    catch {
        Add-CsvLine $missingCsv ([pscustomobject]@{RelativePath=$relative;FullPath=$full;Reason='Kunne ikke lese filen'})
    }

    $found++
    Write-Host "[$(Get-Date -Format HH:mm:ss)] Ferdig: $relative | filer=$found | treff=$scanned" -ForegroundColor Green
}

[pscustomobject]@{
    ComputerName=$env:COMPUTERNAME
    UserName=$env:USERNAME
    CommonRoot=$CommonRoot
    OutputRoot=$OutputRoot
    Started=$started
    Completed=Get-Date
    SelectedFileCount=$selectedFiles.Count
    FoundFileCount=$found
    EvidenceCount=$scanned
    MaxMinutes=$MaxMinutes
    Note='Kun maskerte mønstertreff er lagret. Ingen full kildekode, secrets, IIS- eller SQL-data er lagret.'
} | ConvertTo-Json | Set-Content (Join-Path $OutputRoot 'system.json') -Encoding UTF8

@"
ClubsiteCMS integration read-only audit

Rapporter:
- selected-files.csv  Valgte filer og metadata
- evidence.csv        Fil, linjenummer, mønsternavn og maskert linjetekst
- missing-files.csv   Filer som mangler eller ikke kunne leses
- system.json         Kjøringsinformasjon

Ingen eksisterende app-, IIS- eller SQL-filer er endret.
"@ | Set-Content (Join-Path $OutputRoot 'README.txt') -Encoding UTF8

Write-Host ''
Write-Host "INTEGRASJONSAUDIT FERDIG: $OutputRoot" -ForegroundColor Green
Get-ChildItem -LiteralPath $OutputRoot | Select-Object Name,Length,LastWriteTime
