[CmdletBinding()]
param(
    [string[]]$RootPath = @(
        'C:\FTP\APPS\FRIVILLIG-APP',
        'C:\FTP\APPS\CLUBSITE-APP',
        'C:\FTP\SITES\CLUBSITE-4',
        'C:\FTP\SITES\CLUBSITE-APP',
        'C:\FTP\SITES\GKIT'
    ),
    [string]$OutputRoot = 'C:\FTP\APPS\GKIT\readonly-audit',
    [switch]$IncludeFileHashes
)

$ErrorActionPreference = 'Continue'
$started = Get-Date

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$outputFull = [IO.Path]::GetFullPath($OutputRoot).TrimEnd('\')

function Save-JsonFile {
    param([string]$Name, [object]$Value)
    $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputRoot $Name) -Encoding UTF8
}

function Get-SafeRelativePath {
    param([string]$Base, [string]$Path)
    try { return [IO.Path]::GetRelativePath($Base, $Path) } catch { return $Path }
}

$existingRoots = @($RootPath | Where-Object { Test-Path -LiteralPath $_ -PathType Container })
$missingRoots = @($RootPath | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Container) })

$folderReport = foreach ($root in $existingRoots) {
    $rootFull = [IO.Path]::GetFullPath($root).TrimEnd('\')
    [pscustomobject]@{
        Root = $rootFull
        Exists = $true
        FileCount = @(Get-ChildItem -LiteralPath $rootFull -File -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "$outputFull*" }).Count
        FolderCount = @(Get-ChildItem -LiteralPath $rootFull -Directory -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "$outputFull*" }).Count
        LastWriteTime = (Get-Item -LiteralPath $rootFull).LastWriteTime
    }
}

$files = New-Object System.Collections.Generic.List[object]
$contentHits = New-Object System.Collections.Generic.List[object]
$textExtensions = @('.asp','.asa','.inc','.js','.ts','.html','.htm','.css','.config','.xml','.json','.sql','.ps1','.vbs','.md','.txt','.csv')
$skipDirectories = @('node_modules','.git','bin','obj','cache','temp','logs')
$patterns = @(
    @{Name='ckeditor'; Regex='ckeditor|CKEditor'},
    @{Name='other-editor'; Regex='tinymce|quill|contenteditable|wysiwyg'},
    @{Name='plugin'; Regex='plugin|module|extension|addon'},
    @{Name='tenant'; Regex='tenant|clubid|club_id|clubfolder|dbName|database'},
    @{Name='session-user'; Regex='Session\s*\(|userID|Admin_Users|Siteusers'},
    @{Name='database-connection'; Regex='connectionstring|provider=|Initial Catalog|Data Source|ADODB.Connection'},
    @{Name='secret-indicator'; Regex='password\s*=|pwd\s*=|api[_-]?key|secret|token|private[_-]?key'}
)

foreach ($root in $existingRoots) {
    $rootFull = [IO.Path]::GetFullPath($root).TrimEnd('\')
    $allFiles = Get-ChildItem -LiteralPath $rootFull -File -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object {
            $fileItem = $_
            $fileItem.FullName -notlike "$outputFull*" -and
            -not ($skipDirectories | Where-Object { $fileItem.FullName -match "[\\/]$([regex]::Escape($_))[\\/]" })
        }

    foreach ($file in $allFiles) {
        $relative = Get-SafeRelativePath -Base $rootFull -Path $file.FullName
        $item = [ordered]@{
            Root = $rootFull
            RelativePath = $relative
            FullPath = $file.FullName
            Extension = $file.Extension.ToLowerInvariant()
            Length = $file.Length
            LastWriteTime = $file.LastWriteTime
            SHA256 = $null
        }
        if ($IncludeFileHashes -and $file.Length -le 25MB) {
            try { $item.SHA256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash } catch { }
        }
        $files.Add([pscustomobject]$item)

        if ($textExtensions -contains $file.Extension.ToLowerInvariant() -and $file.Length -le 2MB) {
            try {
                $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
                foreach ($pattern in $patterns) {
                    $count = ([regex]::Matches($text, $pattern.Regex, [Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                    if ($count -gt 0) {
                        $contentHits.Add([pscustomobject]@{
                            Root = $rootFull
                            RelativePath = $relative
                            Pattern = $pattern.Name
                            MatchCount = $count
                        })
                    }
                }
            } catch { }
        }
    }
}

$system = [ordered]@{
    ComputerName = $env:COMPUTERNAME
    UserName = $env:USERNAME
    PowerShellVersion = $PSVersionTable.PSVersion.ToString()
    WindowsVersion = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Caption)
    Started = $started
    Completed = Get-Date
    OutputRoot = $outputFull
    ExistingRoots = $existingRoots
    MissingRoots = $missingRoots
    ReadOnlyNotice = 'Rapporten er laget ved lesing og opprettelse av auditfiler. Ingen app-, IIS- eller SQL-endringer er utført.'
}

$iis = [ordered]@{
    WebAdministrationModule = [bool](Get-Module -ListAvailable -Name WebAdministration)
    ApplicationHostConfigExists = Test-Path 'C:\Windows\System32\inetsrv\config\applicationHost.config'
    Sites = @()
    Applications = @()
    VirtualDirectories = @()
    AppPools = @()
}

try {
    Import-Module WebAdministration -ErrorAction Stop
    $iis.Sites = @(Get-Website -ErrorAction SilentlyContinue | Select-Object Name, State, PhysicalPath, Bindings)
    $iis.AppPools = @(Get-ChildItem IIS:\AppPools -ErrorAction SilentlyContinue | Select-Object Name, State, ManagedRuntimeVersion, ManagedPipelineMode)
} catch { }

try {
    $appcmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
    if (Test-Path $appcmd) {
        $iis.AppcmdApplications = @(& $appcmd list app 2>$null)
        $iis.AppcmdVirtualDirectories = @(& $appcmd list vdir 2>$null)
    }
} catch { }

$aclReport = foreach ($root in $existingRoots) {
    try {
        $acl = Get-Acl -LiteralPath $root
        [pscustomobject]@{
            Path = $root
            Owner = $acl.Owner
            Access = @($acl.Access | Select-Object IdentityReference, FileSystemRights, AccessControlType, IsInherited)
        }
    } catch { }
}

Save-JsonFile -Name 'system.json' -Value $system
Save-JsonFile -Name 'folders.json' -Value $folderReport
Save-JsonFile -Name 'iis.json' -Value $iis
Save-JsonFile -Name 'acl.json' -Value $aclReport
$files | Export-Csv -LiteralPath (Join-Path $OutputRoot 'files.csv') -NoTypeInformation -Encoding UTF8
$contentHits | Export-Csv -LiteralPath (Join-Path $OutputRoot 'content-hits.csv') -NoTypeInformation -Encoding UTF8

@"
ClubsiteCMS read-only audit
===========================
Start: $started
Ferdig: $(Get-Date)
Maskin: $($env:COMPUTERNAME)

Rapporter:
- system.json             Server- og kjøreinformasjon
- folders.json            Registrerte rotmapper og antall filer/mapper
- files.csv               Filinventar og eventuelle SHA-256-hasher
- content-hits.csv        Kun mønster/navn og antall treff; ingen linjeinnhold
- iis.json                Read-only IIS-sites, app pools og virtuelle mapper
- acl.json                Eier og tilgangsregler på rotmappene

Sikkerhet:
- Scriptet skal ikke endre apper, IIS, SQL eller eksisterende filer.
- content-hits.csv inneholder ikke filinnhold, men secret-indicator viser kun at et mønster finnes.
- Ikke send rapporter videre før eventuelle personopplysninger eller konfigurasjonsverdier er kontrollert.
"@ | Set-Content -LiteralPath (Join-Path $OutputRoot 'README.txt') -Encoding UTF8

Write-Output "Audit ferdig. Rapporter lagret i: $outputFull"
