# Read-only serverinventar – ClubsiteCMS og Frivillig

Dato for rapport: 21.08.2026  
Rapportmaskin: `WIN-KD6TE5J6HOK`  
Rapportbruker: `Owe`  
Rapporttype: Read-only filinventar

## Formål

Rapporten kartlegger hvor ClubsiteCMS, felleskode, pluginstruktur,
tenantmapper og Frivillig-prototypen ligger på IIS-serveren.

Omfattede rotmapper:

```text
C:\FTP\APPS
C:\FTP\SITES\CLUBSITE-4
C:\FTP\SITES\SYSTEM-COMMON
C:\FTP\SITES\CLUBSITE-4\cs4-common
C:\FTP\SITES\CLUBSITE-4\SKI
```

## Avgrensning

- `ScanContent=false` var brukt. Filinnhold og kode er ikke analysert.
- `content-hits.csv` er derfor tom.
- Filinventaret viser ikke om en fil faktisk er aktivt brukt av IIS.
- `C:\FTP\SITES\CLUBSITE-4` nådde timeout etter 10 minutter. Tallet for denne roten er ufullstendig.
- Ingen eksisterende filer, IIS-konfigurasjon eller SQL-data ble endret.

## Resultatsammendrag

| Rot | Status | Filer | Mapper | Tid | Vurdering |
|---|---:|---:|---:|---:|---|
| `C:\FTP\APPS` | OK | 90 | 36 | 5 sek. | Oversiktlig felles appområde |
| `C:\FTP\SITES\CLUBSITE-4` | TIMEOUT | 13 096+ | 1 318+ | 606 sek. | Ufullstendig tenant-/siteinventar |
| `C:\FTP\SITES\SYSTEM-COMMON` | OK | 1 479 | 319 | 70 sek. | Eldre felles runtime/legacy-kode |
| `C:\FTP\SITES\CLUBSITE-4\cs4-common` | OK | 6 085 | 723 | 280 sek. | Sterk kandidat for CMS-/pluginfelleskode |
| `C:\FTP\SITES\CLUBSITE-4\SKI` | OK | 4 771 | 200 | 215 sek. | Ski tenant-site med CMS-struktur |

## `C:\FTP\APPS`

Rapporten viser:

- `CLUBSITE-APP`: 69 filer.
- `FRIVILLIG-APP`: 19 filer.

`FRIVILLIG-APP` inneholder Classic ASP-API, statisk frontend, adminfrontend,
tenantregister og kartleggingsscript. Det er et egnet utviklingsområde for
felles Frivillig-kode, men rapporten beviser ikke at appen er deployet eller
koblet til en aktiv IIS-site.

`CLUBSITE-APP` inneholder blant annet .NET-relaterte DLL-er, `appsettings` og
`web.config`. Dette bør behandles som en separat eksisterende applikasjon til
utvikleren bekrefter rollen i ClubsiteCMS.

## `C:\FTP\SITES\CLUBSITE-4\cs4-common`

Førstenivået viser flere sterke spor etter CMS-/pluginfunksjonalitet:

| Område | Filer |
|---|---:|
| `ckeditor` | 4 224 |
| `plugins` | 830 |
| `CSADMIN` | 372 |
| `booking` | 210 |
| `forms` | 14 |
| `api` | 10 |
| `common-site` | 12 |
| `includes` | 3 |

Dette er det sterkeste funnet for eksisterende plugin- og editorintegrasjon.
Filnavnene bekrefter likevel ikke CKEditor-versjon, aktiv bruk,
pluginregistrering, tenantoppslag eller adminrettigheter.

Neste analyse bør begrenses til:

```text
C:\FTP\SITES\CLUBSITE-4\cs4-common\ckeditor
C:\FTP\SITES\CLUBSITE-4\cs4-common\plugins
C:\FTP\SITES\CLUBSITE-4\cs4-common\CSADMIN
C:\FTP\SITES\CLUBSITE-4\cs4-common\forms
C:\FTP\SITES\CLUBSITE-4\cs4-common\api
C:\FTP\SITES\CLUBSITE-4\cs4-common\includes
C:\FTP\SITES\CLUBSITE-4\cs4-common\common-site
```

## Ski-tenant

`C:\FTP\SITES\CLUBSITE-4\SKI` inneholder blant annet:

- `CSADMIN`: 853 filer.
- `BLOGADMIN`: 41 filer.
- `common-front` og `common-site`.
- `useraccount`.
- `config`.
- `forms` og `formsview`.
- `FRIVILLIG-APP` med bare:

```text
FRIVILLIG-APP\clubsite-session-check.asp
FRIVILLIG-APP\README.md
```

Dette bekrefter at session-testen ligger på Ski-sitet, men at den felles
Frivillig-prototypen fra `C:\FTP\APPS\FRIVILLIG-APP` ikke er fullstendig
kopiert eller deployet under Ski-tenantens mappe.

## `SYSTEM-COMMON`

`SYSTEM-COMMON` har 1 479 filer og 319 mapper. De største områdene er:

- `libs`;
- `cs4`;
- `BLOGADMIN`.

Området ser fortsatt ut som eldre Clubsite-runtime/legacy-felleskode. Inventar
alene beviser ikke at det er ubrukt, men gir heller ikke grunnlag for å legge
ny GKIT-/Frivillig-kode der.

Anbefaling: La `SYSTEM-COMMON` være urørt inntil aktive IIS-referanser er
dokumentert.

## Konfigurasjons- og sikkerhetsfunn

Filinventaret viser flere potensielle konfigurasjons-/secret-bærere:

- mange `web.config`-filer i tenantmapper;
- `appsettings.json` og `appsettings.Development.json` under `CLUBSITE-APP`;
- `.env`-filer under blant annet `API\chatbot`, `API\csadmin-api` og `API\python`;
- `.env`-kopier under `API-BACKUP`;
- `appsettings.json` og `web.config` under `cs4-common\api\chat`.

Dette beviser ikke at filene inneholder aktive hemmeligheter. Innholdet er ikke
kontrollert. Filene bør likevel ikke kopieres til GitHub eller nye rapporter.

## Konklusjon for Frivillig-pluginen

Foreløpig anbefalt plassering for felles Frivillig-kode:

```text
C:\FTP\APPS\FRIVILLIG-APP\
```

CMS-/pluginmønsteret bør undersøkes i:

```text
C:\FTP\SITES\CLUBSITE-4\cs4-common\plugins\
C:\FTP\SITES\CLUBSITE-4\cs4-common\CSADMIN\
C:\FTP\SITES\CLUBSITE-4\cs4-common\ckeditor\
```

ClubsiteCMS bør fortsatt være autoritativ kilde for aktiv tenant, innlogget
bruker og adminrolle. Frivillig-pluginen bør bruke egne tenant-sikre tabeller
og ikke lage en parallell tenantmekanisme.

## Neste sikre steg

1. Kjør avgrenset innholdsanalyse av `cs4-common\ckeditor`, `plugins`,
   `CSADMIN`, `forms` og `api`.
2. Identifiser eksisterende pluginregistrering, CMS-meny, tenantkontekst og
   adminrolle.
3. Identifiser CKEditor-versjon og initieringsmønster.
4. Fullfør `CLUBSITE-4`-inventar i mindre undermapper fordi hovedrapporten
   timet ut.
5. Gjennomgå `.env`, `appsettings` og `web.config` for tilgang og plassering
   uten å kopiere hemmelighetsverdier.
6. Ikke opprett IIS Virtual Directory, SQL-tabeller eller live-deploy før
   pluginmønsteret er bekreftet.
