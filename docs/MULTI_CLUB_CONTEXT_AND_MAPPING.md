# Multi-klubb kontekst og servermapping

## Anbefalt brukerflyt

En bruker kan være medlem av flere klubber. Derfor skal ikke innlogging alene bestemme én klubb.

1. Brukeren åpner en klubbside, for eksempel `skigk.no/FRIVILLIG-APP/`.
2. Serveren bestemmer tenant-kontekst fra Clubsite-siden/sessionen.
3. API-et kontrollerer at innlogget bruker har medlemskap i denne tenanten.
4. Appen viser kun data for den aktive tenanten.
5. Hvis brukeren har flere medlemskap, kan appen vise «Bytt klubb».
6. Klubbbytte kan bare velge fra brukerens godkjente medlemskap.

Dette gir riktig kontekst når brukeren kommer fra Ski, samtidig som samme bruker kan være medlem i Norsk Senior Golf eller andre klubber.

## Sikkerhetsregel

`tenantID`/`clubID` fra URL, querystring eller JavaScript er bare et forespurt kontekstvalg. Serveren må kontrollere Session, aktiv Clubsite-side og brukerens medlemskap før data returneres.

## Servermapping

Fasit-JSON-en inneholder `clubId` og `tenantKey`, men ikke nødvendigvis den faktiske Clubsite-mappeverdien `clubFolder`. Den fysiske mappingen skal derfor hentes read-only fra `CLUBSITE-COMMON.dbo.Clubs`.

| Kilde | Mapping |
|---|---|
| `Clubs.clubID` | JSON `tenant.clubId` |
| `Clubs.clubFolder` | fysisk mappe under `C:\FTP\SITES\CLUBSITE-4\` |
| `Clubs.clubName` | kontroll mot JSON `displayName` |
| `Clubs.dbName` | tenantdatabase, for eksempel `CS4-SKI` |
| `Clubs.active` | kontrollstatus, ikke automatisk lisensaktivering |

For Ski forventes `clubID=73`, `tenantKey=skigk`, `clubFolder=SKI` og `C:\FTP\SITES\CLUBSITE-4\SKI\FRIVILLIG-APP\`.

For øvrige klubber skal ingen mappe antas før `clubFolder` er hentet fra SQL eller kontrollert på serveren. SQL/`sa` er ikke nødvendig for første steg: `tools/export-folder-tenant-candidates.ps1` kan kartlegge mapper read-only og markere sikre treff mot `tenantKey`. Mapper med avvik får status `REQUIRES_REVIEW`.

## Resultatfil

Read-only-scriptet genererer en JSON-rapport med `clubId`, `tenantKey`, `clubFolder`, fysiske stier, `dbName`, `active`, `registryMatch` og `folderExists`. Scriptet endrer ikke SQL, IIS, mapper eller registry-kilden.
