# ClubsiteCMS-plugin – oppskrift for nye apper

Status: verifisert mot original CMS-admin 26.08.2026  
Referanse: `C:\FTP\SITES\CLUBSITE-4\CS4-ORIG\CSADMIN`

## 1. Arkitekturen

ClubsiteCMS bruker en sidebasert pluginmodell:

```text
CSADMIN sideeditor
  -> cPagePlugins.asp
  -> scr_pages.asp
  -> Pages_Plugins
  -> cPages.asp
  -> cPlugins.asp
  -> pluginvisning
```

En plugin kobles til en side med tre verdier:

| Felt | Betydning |
|---|---|
| `pageID` | Clubsite-siden som skal vise pluginen |
| `pluginID` | Plugindefinisjonen i `Plugins` |
| `pluginRef` | Valgfri underreferanse, for eksempel form-, liste- eller aktivitets-ID |

## 2. Filrollene

| Fil | Rolle | Skal kopieres? |
|---|---|---|
| `CSADMIN\files_pages\cPageEdit.asp` | Sideeditor og faner | Brukes som referanse; er normalt generisk |
| `CSADMIN\files_pages\cPagePlugins.asp` | Viser pluginvalg og underreferanser | Bruk eksisterende generiske side |
| `CSADMIN\files_pages\scr_pages.asp` | Lagrer/fjerner `Pages_Plugins` | Skal ikke kopieres ukritisk |
| `CSADMIN\classlib\cPagefunctions.asp` | Bygger adminvalg for pluginen | Legg til `pagefunc_<pluginMain>` |
| `cs-classes\cPages.asp` | Leser pluginkobling og kaller runtime | Bruk eksisterende runtime |
| `cs-classes\cPlugins.asp` | Viser plugininnhold | Legg til runtime-funksjon etter eksisterende mønster |

## 3. Registrering av en ny plugin

En ny plugin trenger normalt:

1. En rad i `Plugins`, med `pluginMain` som peker til adminfunksjonen.
2. Eventuell kategori i `Plugins_Categories`.
3. En funksjon i `cPagefunctions.asp` med navnet `pagefunc_<pluginMain>`.
4. En runtime-funksjon i `cPlugins.asp` som kan bruke `pluginRef`.
5. En sidekobling i `Pages_Plugins`.

For Frivillig kan konseptet for eksempel være:

```text
Plugins.pluginMain       = frivillig
cPagefunctions.asp       = pagefunc_frivillig(pageID, pluginID)
Pages_Plugins.pluginRef  = eventuell Frivillig-side-/modulreferanse
```

Det konkrete databaseskjemaet for `Plugins` og eventuell pluginmeny må
bekreftes før SQL-migrering. Ingen produksjonsrader skal opprettes manuelt
før SQL-scriptet er gjennomgått.

## 4. Hvordan adminlagringen virker

`cPagePlugins.asp` sender POST til:

```text
files_pages/scr_pages.asp
```

Feltene er blant annet:

```text
hidDepID
hidPageID
hidPluginID
pluginRef
```

`scr_pages.asp` gjør i praksis:

1. Leser og renser POST-feltene.
2. Deler flere `pluginRef`-verdier.
3. Sletter eksisterende pluginrader for siden.
4. Setter inn én `Pages_Plugins`-rad per valgt referanse.

Dette er en replace-all-modell for pluginene på siden, ikke en individuell
oppdatering av én rad.

## 5. Tenant- og tilgangskrav

Eksisterende CMS bruker blant annet:

- `adm_DepID` som aktiv adminavdeling/tenantkontekst;
- `session("arrDepartments")` for adminens avdelinger;
- `session("arrAreas")` og `checkAdminAccess(pageModuleID)` for tilgang;
- `Admin_Users` og `Admin_Users_Departments` for adminidentitet og tilgang.

Frivillig skal i tillegg:

- hente tenant server-side fra Clubsite-konteksten;
- kontrollere at side/objekt tilhører aktiv tenant før lagring;
- ikke stole på `hidDepID`, `clubID` eller tenantverdi fra nettleseren;
- bruke egne tenant-sikre tabeller for aktiviteter, vakter og påmeldinger;
- aldri bruke `pageID` alene som tenantkontroll.

## 6. CKEditor og redigerbart innhold

CMS-et bruker CKEditor 4.14.0 i `CSADMIN\ckeditor`. Innholdssiden sender
`pagecontent`, som behandles med `safeInpEditor` og lagres via
`Page_Save_Content`.

Frivillig bør først gjenbruke denne editoren og CMS-ets eksisterende
innholdsmodell. CKEditor 5 bør behandles som et separat migreringsprosjekt.

## 7. Anbefalt implementering for Frivillig

Start i en separat branch med en read-only POC:

1. Vis Frivillig som pluginvalg i admin.
2. Vis aktiv `adm_DepID` og innlogget adminstatus.
3. Vis et CKEditor-felt uten lagring.
4. Vis hvilken `pluginRef` som er valgt.
5. Test at en side fra tenant A ikke kan leses eller endres fra tenant B.
6. Lag deretter SQL-design og lagring for Frivillig-objekter.

Ikke endre den generiske `scr_pages.asp` for å få POC-en til å virke.

## 8. Hva som kan kopieres til andre repoer

Kopier prinsippet og filstrukturen, ikke hele CMS-installasjonen:

- pluginens `pagefunc_*`-funksjon;
- pluginens runtime-funksjon;
- tenantkontroll og adminkontroll;
- eventuelle Frivillig-spesifikke ASP-/API-filer;
- separat SQL-migrering med review.

La disse ligge som eksisterende Clubsite-felleskode:

- `cPageEdit.asp`;
- `cPagePlugins.asp`;
- `scr_pages.asp`;
- `cPages.asp`;
- `cPlugins.asp`;
- CKEditor-distribusjonen.

## 9. Python på IIS – avgrensning

Python kan kjøre på IIS som en separat applikasjon, for eksempel via en
FastCGI-/proxykonfigurasjon. Det gjør likevel ikke Classic ASP/VBScript-koden
om til Python og erstatter ikke Clubsite-integrasjonen.

Originalkoden er bygget rundt:

- Classic ASP/VBScript;
- IIS-side- og include-struktur;
- Clubsite `Session(...)`;
- `dbConn`/ADODB;
- `CSADMIN`-tilgang og `adm_DepID`;
- eksisterende `Pages_Plugins` og `pagefunc_*`.

En Python-app ville derfor blitt en separat runtime. Den måtte selv håndtere
innlogging/session, tenantbestemmelse, adminrettigheter, SQL-tilkobling,
IIS-mapping og sikker kobling mot Classic ASP. Den kan ikke bare importere
eller kjøre `.asp`-filer.

Anbefaling:

- bruk Classic ASP/Clubsite-plugin for adminintegrasjonen;
- bruk Python eventuelt som separat tjeneste for AI, synkronisering,
  bakgrunnsjobber eller beregninger;
- la Python kommunisere gjennom et kontrollert, tenant-sikret API;
- ikke bruk Python som erstatning for selve CMS-pluginlaget.

