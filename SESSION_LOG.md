# SESSION_LOG

## 2026-08-24 – Målrettet integrasjonsanalyse klargjort

- Script laget: `tools/collect-clubsite-integration-readonly.ps1`.
- Scriptet leser kun utvalgte CSADMIN-, CKEditor-, plugin- og forms-filer.
- Rapporten lagrer maskerte mønstertreff med fil og linjenummer, ikke full kildekode eller secrets.
- Lokal syntakstest er gjennomført; serverkjøring gjenstår.

## 2026-08-23 – Begrenset plugin-audit analysert

### Verifisert

- `plugins` fullført: 830 filer, 398 innholdsskannet.
- `CSADMIN` fullført: 372 filer, 274 innholdsskannet.
- `forms` fullført: 14 filer, alle innholdsskannet.
- `api`, `includes` og `common-site` fullført.
- `ckeditor` nådde fem minutters timeout etter 1 773 registrerte filer.
- Rapporten viser CKEditor-struktur under både `cs4-common\ckeditor` og `cs4-common\CSADMIN\ckeditor`.
- `CSADMIN\classlib\cCommon.asp` og `cPagefunctions.asp` har tenant-, session-, admin- og pluginspor.
- `plugins\chatbot` har konkrete tenant-, admin- og pluginregistreringsspor.
- `forms` har konkrete tenant- og sessionspor i eksisterende aktivitet-/medlemsskjemaer.

### Dokumentasjon

- `docs/SERVER_PLUGIN_DISCOVERY_2026-08-23.md`

## 2026-08-23 – Begrenset plugin read-only-script

- Script laget: `tools/collect-clubsite-plugin-readonly-audit.ps1`.
- Scriptet undersøker bare `cs4-common\ckeditor`, `plugins`, `CSADMIN`, `forms`, `api`, `includes` og `common-site`.
- Det viser fremdrift, teller filer/mapper, logger timeout per rot og lagrer rapporter fortløpende.
- Kildeinnhold skannes bare for utvalgte filtyper og størrelser. `.env`, `appsettings*.json`, `web.config` og sensitive filnavn listes uten at innholdet leses.
- Ingen serverkjøring er bekreftet ennå; lokal syntakstest er gjennomført.

## 2026-08-21 – Read-only serverinventar mottatt

### Verifisert fra rapportene

- Audit ble kjørt på `WIN-KD6TE5J6HOK` av `Owe`, med `ScanContent=false`.
- `C:\FTP\APPS`: 90 filer og 36 mapper.
- `C:\FTP\SITES\CLUBSITE-4`: 13 096 filer og 1 318 mapper registrert før timeout etter 10 minutter; rapporten er ufullstendig.
- `C:\FTP\SITES\SYSTEM-COMMON`: 1 479 filer og 319 mapper.
- `C:\FTP\SITES\CLUBSITE-4\cs4-common`: 6 085 filer og 723 mapper.
- `C:\FTP\SITES\CLUBSITE-4\SKI`: 4 771 filer og 200 mapper.
- `cs4-common` inneholder mapper med navn `ckeditor`, `plugins`, `CSADMIN`, `forms`, `api`, `common-site` og `includes`.
- Ski har bare to registrerte filer under `FRIVILLIG-APP`: session-testen og README-filen.
- `content-hits.csv` er tom fordi innholdsskanning var avslått.
- Filinventaret viser potensielle secret-bærere som `.env`, `appsettings*.json` og mange `web.config`-filer. Innholdet er ikke kontrollert.

### Dokumentasjon

- Detaljert rapport: `docs/SERVER_READONLY_AUDIT_2026-08-21.md`.

## 2026-08-20 – Read-only kontroll av lokale filer mot offentlig live

### Verifisert

- Lokalt repo har ingen nye commits etter 2026-05-27; prosjekt- og analysefiler ligger som lokale, ucommittede filer.
- Firebase-hostene `frivillig-kalendar-demo.web.app`, `frivillig-kalendar-klubb.web.app` og `frivillig-kalendar-skigk.web.app` svarer med samme HTML/build-artifact.
- Firebase HTML peker til `assets/index-D5JyzyXP.js` (1 295 654 bytes) og `assets/index-C5yBNrGq.css` (39 890 bytes). Alle tre hostene har samme SHA-256 for disse assetene.
- Firebase-hosting oppgir `Last-Modified: 03.06.2026 13:19:14 GMT`.
- IIS-testfilen `clubsite-session-check.asp` er tilgjengelig live og viser uten autentisert nettlesersession at brukeren ikke er logget inn.
- Offentlige IIS-kall til `/FRIVILLIG-APP/`, `/FRIVILLIG-APP/index.html`, `/FRIVILLIG-APP/app/index.html` og `/FRIVILLIG-APP/api/get_activities.asp` returnerer Ski Golfklubbs «Ukjent side»-fallback, ikke lokal app/API-respons.

### Avgrensning

- Firebase-kildekode, deployhistorikk og Security Rules er ikke tilgjengelig fra offentlig hosting og er derfor ikke kontrollert.
- IIS-filsystem, IIS-konfigurasjon og autentisert Clubsite-session kan ikke bekreftes fullt ut via anonym HTTP.

## 2026-08-09 – IIS/Clubsite-kartlegging

### Verifisert

- GitHub-repoet er `Golfklubb-IT/FrivilligSkjema-ClubsiteCMS`.
- IIS kjører SQL Server 2016 Web Edition, default instance `MSSQLSERVER`.
- Clubsite tenant-databaser følger mønsteret `CS4-<TENANT>`.
- `CLUBSITE-COMMON.dbo.Clubs` inneholder tenantregister med `clubID`, `clubFolder`, `dbName` og `dbUser`.
- Ski GK er tenant `SKI`, `clubID=73`, database `CS4-SKI`.
- Felles appområde på serveren: `C:\FTP\APPS\FRIVILLIG-APP\`.
- Ski GK frontend/integrasjon: `C:\FTP\SITES\CLUBSITE-4\SKI\FRIVILLIG-APP\`.
- Offentlig IIS-URL fungerer: `https://skigk.no/FRIVILLIG-APP/`.
- Clubsite user-session er verifisert innlogget og utlogget via `Session("userID")`.
- Clubsite user-login bruker `useraccount/userlogin.asp`, `Siteusers` og stored procedure `A_Siteuser_Login`.
- `CSADMIN`/`Admin_Users` er separat admin/editor-login og er ikke brukerlogin for Frivillig.
- Eksisterende `Activities_Participants` mangler `shiftID`; dugnadsvakter bør derfor få egne tabeller.

### Ikke utført av Codex

- Ingen direkte endringer på IIS-serveren.
- Ingen SQL-tabeller eller SQL-data er endret.
- Testfilen ble manuelt lagt på serveren for session-verifisering og skal fjernes etter testen.
- Lokal read-only endpoint api/get_session_status.asp er opprettet. Den returnerer kun authenticated: true/false.

## 2026-08-09 – Felles klubbregister

- Fasitfilen er validert som JSON med 168 offisielle klubber, én demo-tenant og totalt 169 tenants.
- Ski Golfklubb er `clubId=73`, `tenantKey=skigk`.
- Kopi er lagret i `data/registries/gkit-norwegian-club-tenants.v1.json`.
- SHA-256: `6CA5F9193C9AAE09A20FB82928BB49C3BB8BD667E90CC113B2865CDDEF271F52`.
- Registeret er identitetskatalog; lisens og appOwner-tilgang lagres separat.

## 2026-08-09 – Multi-klubb kontekst og mapping

- Anbefalt modell er aktiv tenant fra Clubsite-side/URL, kontrollert server-side mot brukerens medlemskap.
- Brukere kan ha medlemskap i flere tenants; klubbbytte skal begrenses til godkjente medlemskap.
- Fysisk `clubFolder` skal hentes fra `CLUBSITE-COMMON.dbo.Clubs`, ikke gjettes fra JSON `tenantKey`.
- Read-only eksportscript er laget som `tools/export-club-tenant-mapping.ps1`.
- Scriptet er ikke kjørt mot serveren og ingen mappingrapport er generert ennå.
- SQL SA-passord er ikke nødvendig for første folderkartlegging; et separat filesystem-only script er laget.

### Rapport mottatt

- `tools/club-folder-candidates.json` inneholder 67 mapper fra `C:\FTP\SITES\CLUBSITE-4`.
- 8 mapper ser ut som tekniske/supportmapper, ikke tenants.
- 59 mapper ser ut som klubbrelaterte mapper.
- Kun `SKI` har `FRIVILLIG-APP`-mappe i rapporten.
- Direkte `folderName=tenantKey` ga ingen treff fordi Clubsite bruker andre mappenavn enn registry `tenantKey`.
- Navneanalyse gir 45 entydige kandidater, 5 tvetydige og 9 uten kandidat. Dette er kandidater, ikke godkjent fasitmapping.
- Override-mal er laget i `tools/club-folder-mapping-overrides.csv`; hovedregisteret skal ikke redigeres.

## 2026-08-10 – Godkjent foldermapping og registry v1.1

- Alle 15 mappingrader er behandlet som godkjent etter brukerens bekreftelse.
- Klubb-tenantKeys er validert mot original registry.
- Ikke-klubber er registrert uten `clubId`, med `tenantType` (`association`, `shop` eller `facility`).
- Ny felles fasit er generert som `data/registries/gkit-norwegian-club-tenants.v1.1.json`.
- v1.1 inneholder 168 offisielle klubber, 1 demo-tenant, 6 non-club tenants og 15 serverfolder-mappinger.
- Original `v1.0.0` er beholdt urørt.

## 2026-08-11 – SYSTEM-COMMON inventory

- `C:\FTP\SITES\SYSTEM-COMMON` inneholder 1 479 filer og 318 undermapper.
- Innholdet inkluderer `BLOGADMIN`, `cs4`, `golfbooking`, `libs` og betydelig ASP-/bibliotekskode.
- Filene ser hovedsakelig ut til å være fra 2014–2021.
- Området kan være legacy, men inventory alene beviser ikke at det er ubrukt.
- Ny anbefaling er å la området være urørt og bruke `C:\FTP\APPS\APPS-COMMON` for nye GKIT-fellesfiler, etter IIS-referansekontroll.
## 2026-08-24 – Målrettet Clubsite-integrasjonsanalyse

- Alle 18 utvalgte filer fra `C:\FTP\SITES\CLUBSITE-4\cs4-common` ble funnet.
- `CSADMIN\ckeditor\ckeditor.js` bekrefter eksakt CKEditor-versjon 4.14.0.
- `cCommon.asp` bekrefter admin-tilgang via `checkAdminAccess(pageModuleID)`
  og sessionbaserte `arrAreas`/`arrDepartments`.
- `cPagefunctions.asp` bekrefter `pagefunc_*`-mønster og pluginreferanser via
  `Pages_Plugins`, `pluginID`, `pluginRef` og `pageID`.
- Forms-koden bekrefter `Forms`-/`Forms_Fields`-modellen og lagring via
  eksisterende stored procedures.
- `depID`/`adm_depID` er verifisert som aktiv klubb-/avdelingskontekst i koden,
  men den endelige tenantbetydningen må bekreftes før implementering.
- `vbsUpload` er kun referanse inntil hardkodet opplastingssti og sikkerhet er
  gjennomgått.
- Dokumentasjon oppdatert i `docs/SERVER_PLUGIN_DISCOVERY_2026-08-23.md`.
- Nytt begrenset script er klargjort: `tools/collect-clubsite-registration-readonly.ps1`.
- Første kjøring 25.08.2026 leste alle 7 filer og 2 117 linjer, men CSV-headerne
  ble ikke skrevet korrekt i PowerShell 5.1. Scriptet er korrigert og må kjøres
  én gang til før rapporten arkiveres som endelig analyse.
- Korrigert kjøring 25.08.2026 er validert: 7/7 filer, 2 117 linjer, 416 treff,
  0 manglende filer og gyldige CSV-headere.
- Rapporten bekrefter at `cPagefunctions.asp` leser/viser `Pages_Plugins`
  gjennom `pageID`, `pluginID` og `pluginRef`. Selve INSERT-/UPDATE-flyten for
  pluginregistrering er fortsatt ikke hentet.
- Utvidet søk 26.08.2026 fant runtime-kjeden `cPages.asp` -> `cPlugins.asp`.
  Søkeloggen inneholder også binærfiler fordi `-Include`-filteret ikke virket
  som forventet; binærtreff skal ikke brukes som bevis.
- Målrettet søk 26.08.2026 fant ingen direkte `Request.Form("pluginRef")`,
  `INSERT INTO Pages_Plugins` eller `UPDATE Pages_Plugins` i relevante CSADMIN-
  treff. Neste søk skal identifisere sideeditorens `action`/`scr_`-kall, ikke
  søke bredt gjennom hele `cs4-common`.
- `csadmin-file-list.txt` viser bare fem filer i `cs4-common\CSADMIN\classlib`.
  Sideeditoren må derfor undersøkes under `C:\FTP\SITES\CLUBSITE-4\CSADMIN`.
- Brukeren bekreftet at Clubsite-admin åpnes på `/csadmin/`, og at original
  setup for ny klubb ligger i `C:\FTP\SITES\CLUBSITE-4\CS4-ORIG\CSADMIN`.
  Dette er nå riktig referanseområde for å finne admin-sideeditoren.
