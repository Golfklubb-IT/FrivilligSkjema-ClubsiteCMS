# Begrenset plugin-discovery – ClubsiteCMS

Dato: 23.08.2026  
Kilde: begrenset read-only audit kjørt på `WIN-KD6TE5J6HOK`  
Output: `C:\FTP\APPS\_readonly-plugin-audit`

## Kort konklusjon

Ja, rapporten hjelper oss betydelig. Den viser konkrete spor etter en
eksisterende ClubsiteCMS-pluginmodell, tenantkontekst, CMS-adminbibliotek og
skjemafunksjoner. Vi trenger trolig ikke bygge en ny pluginmotor eller en ny
tenantmekanisme for Frivillig-appen.

Det mest lovende er kombinasjonen:

```text
cs4-common\plugins\
cs4-common\CSADMIN\classlib\
cs4-common\forms\
cs4-common\ckeditor\
```

## Rapportstatus

### Oppdatert etter målrettet rapport 24.08.2026

Den nye rapporten `C:\FTP\APPS\_readonly-integration-audit` fant alle 18
utvalgte filer. Det mangler ingen av filene i utvalget, og rapporten inneholder
1 202 evidenstreff. Treffene er nå kontrollert mot de konkrete filene, slik at
generiske søketreff ikke behandles som sikre bevis.

### Korrigert rapport 25.08.2026

Den korrigerte rapporten `C:\FTP\APPS\_readonly-registration-audit` er
gyldig formatert og viser:

- 7 av 7 filer lest;
- 2 117 linjer lest;
- 416 evidenstreff;
- 0 manglende filer;
- read-only-kjøring på `WIN-KD6TE5J6HOK`.

Treffene er fordelt på plugin-/menyspor, pluginreferanser, tenantkontekst,
databasekall, admin-tilgang og forms. Treffantallene er søkeindikatorer; de
konkrete linjene under er grunnlaget for konklusjonene.

### Utvidet plugin-søk 26.08.2026

Søket `pages-plugin-search.txt` fant 1 025 filseksjoner og er derfor større
enn forventet. PowerShell-kommandoen inkluderte binærfiler selv om `-Include`
ble brukt. Binærtreffene skal ignoreres.

De relevante ASP-funnene er likevel klare:

- `cs-classes\cPages.asp` leser `Pages_Plugins`, henter `pluginID` og
  `pluginRef`, og kaller pluginfunksjonen dynamisk med `pageID`, `depAlias`,
  `pagePluginID` og `pagePluginRef`.
- `cs-classes\cPlugins.asp` inneholder runtime-funksjonene som gjengir
  plugininnholdet, blant annet `getForm`, `getPhotoalbum`, `getContacts` og
  aktivitetsfunksjoner.
- `CSADMIN\classlib\cPagefunctions.asp` er admin-/valglogikken som bygger
  `pluginRef`-valg og leser eksisterende koblinger.
- Det ble ikke funnet direkte `INSERT INTO Pages_Plugins` eller
  `UPDATE Pages_Plugins` i rapportens ASP-filer.

Runtime-kjeden er dermed:

```text
CSADMIN-side -> Pages_Plugins -> cPages.asp -> cPlugins.asp -> pluginvisning
```

Selve lagringen kan ligge i en generell CSADMIN-side, en `scr_`-rutine eller
en stored procedure.

Søkerapporten 26.08.2026 fant ingen direkte `Request.Form("pluginRef")`,
`INSERT INTO Pages_Plugins` eller `UPDATE Pages_Plugins` i CSADMIN-materialet
som hadde relevante treff. Vi skal derfor ikke anta at en fil med navnet
`plugin` er lagringsfilen. Neste steg er å identifisere CSADMIN-siden som
redigerer en eksisterende side, og deretter følge dens `action`/`scr_`-kall.

| Område | Status | Filer | Innholdsskannet | Vurdering |
|---|---:|---:|---:|---|
| `ckeditor` | TIMEOUT | 1 773 registrert | 1 714 | Delvis, men nok til å bekrefte omfattende CKEditor-installasjon |
| `plugins` | OK | 830 | 398 | Godt materiale for plugin-eksempel |
| `CSADMIN` | OK | 372 | 274 | Viktig for admin, roller og felles klasser |
| `forms` | OK | 14 | 14 | Direkte relevant for Frivillig-skjemaer |
| `api` | OK | 10 | 4 | Begrenset server-/API-spor |
| `includes` | OK | 3 | 3 | Mulige felles include-filer |
| `common-site` | OK | 12 | 12 | Relevante tenant/session/database-spor |

CKEditor-området nådde timeout etter fem minutter. Det betyr at det totale
antallet CKEditor-filer er større enn 1 773 i denne rapporten.

Merk: `MatchCount` og `FirstLineNumbers` i `content-hits.csv` er begrenset til
de første 20 treffene per fil og mønster. Tallene er indikatorer, ikke komplett
statistikk over alle treff.

## CKEditor-funn

Rapporten viser disse filene i både felles `ckeditor` og `CSADMIN\ckeditor`:

- `build-config.js`
- `ckeditor.js`
- `config.js`
- `styles.js`
- `templates.js`
- `contents.css`
- `core\...`
- `plugins\...`
- `skins\...`
- `lang\...`

Strukturen med `core`, `plugins`, `skins`, `scayt`, `wsc` og
`templates` er sterk dokumentasjon på en eksisterende CKEditor 4-linje, ikke
en moderne CKEditor 5-installasjon. Nøyaktig versjon må fortsatt hentes fra
versjonsfelt eller header i `ckeditor.js`/`build-config.js`.

Det finnes også en egen og nyere endret kopi under `CSADMIN\ckeditor`.
Den eksakte versjonen er verifisert i `CSADMIN\ckeditor\ckeditor.js`:

```text
version:"4.14.0"
```

Det betyr at CMS-et bruker CKEditor 4.14.0, ikke CKEditor 5. Den bør gjenbrukes
i første POC. Oppgradering til CKEditor 5 er et separat migreringsprosjekt.

Filene har disse registrerte endringene:

| Fil | Registrert endring |
|---|---|
| `CSADMIN\ckeditor\config.js` | 13.05.2026 |
| `CSADMIN\ckeditor\styles.js` | 08.04.2025 |
| `CSADMIN\ckeditor\templates.js` | 16.12.2025 |
| `CSADMIN\ckeditor\ckeditor.js` | 28.05.2020 |

Dette kan bety at CMS-admin har en egen konfigurasjon oppå en eldre CKEditor-
distribusjon. Det bør gjenbrukes i første omgang, ikke erstattes med CKEditor 5
før utvikleren har bekreftet kompatibilitet og lisens.

## Verifisert tilgangs-, plugin- og forms-mønster

Den målrettede rapporten viser følgende konkrete mønstre:

- `cCommon.asp` har `checkAdminAccess(pageModuleID)` og
  `checkAdminAccess_Script`. Tilgangen bygger blant annet på
  `session("arrAreas")` og `session("arrDepartments")`.
- `cPagefunctions.asp` inneholder etablerte `pagefunc_*`-funksjoner for CMS-
  funksjoner og pluginrelaterte sidekoblinger.
- Pluginkoblingen bruker `Pages_Plugins`, `pluginID`, `pluginRef` og
  `pageID`. Dette er den eksisterende ClubsiteCMS-mekanismen vi bør koble
  Frivillig-pluginen til.
- `cPagefunctions.asp` viser at `pagefunc_*`-funksjonene bygger adminvalg som
  radio-/checkbox-felter med `pluginRef`. For eksempel leser
  `pagefunc_photoalbum` eksisterende `pluginRef` fra `Pages_Plugins` og
  markerer gjeldende valg. Dette bekrefter pluginens side-/referansemodell.
- Rapporten viser ikke selve INSERT-/UPDATE-koden som oppretter eller lagrer en
  rad i `Pages_Plugins`. Den komplette registreringsflyten må derfor hentes fra
  den relevante CSADMIN-siden eller et kontrollert databaseskjema-uttrekk.
- Aktiv klubb-/avdelingskontekst forekommer som `depID` og `adm_depID`.
  Dette er verifisert som tenant-/avdelingskontekst i kode, men utvikleren må
  bekrefte om `depID` er den endelige tenantidentiteten i alle deler av CMS-et.
- Forms-løsningen bruker tabellene `Forms`, `Forms_Fields`,
  `Forms_Fields_Source` og `Forms_FieldTypes`. Aktivitetsskjemaene knytter
  skjema til aktivitet og bruker lagringsprosedyrer som
  `A_Activities_Signup_Save`.
- `vbsUpload` viser eksisterende opplastingskode, men
  `Process_File.asp` bruker den hardkodede stien `c:\Newupload\`. Den skal
  ikke gjenbrukes direkte før sti, ACL, filtypekontroll og tenantsperre er
  sikkerhetsgjennomgått.

## Arkitekturkonklusjon

Frivillig bør bygges som en innfødt ClubsiteCMS-plugin med:

1. eksisterende `Pages_Plugins`/`pagefunc_*`-mønster;
2. eksisterende CMS-tilgangskontroll;
3. eksisterende `depID`/`adm_depID`-kontekst, kontrollert server-side;
4. CKEditor 4.14.0 i admin;
5. eksisterende forms-motor der den passer, men egne Frivillig-tabeller for
   aktiviteter, vakter og påmeldinger dersom eksisterende aktivitetstabeller
   ikke dekker vaktidentitet.

Vi bør derfor ikke starte med en ny pluginmotor, CKEditor 5-integrasjon eller
en separat tenantmekanisme.

## Eksisterende plugin-eksempel

Under `cs4-common\plugins` finnes en konkret pluginstruktur:

```text
chatbot\ai_chatbot_loader.asp
chatbot\ai_chat_widget.asp
chatbot\chatbot.css
chatbot\chatbot.js

vbsUpload\conn.asp
vbsUpload\Download.asp
vbsUpload\Process_DB.asp
vbsUpload\Process_File.asp
vbsUpload\vbsUpload.asp
```

`chatbot`-filene har treff på:

- tenantkontekst;
- admin-/menyreferanser;
- pluginregistrering.

`vbsUpload\conn.asp` har treff på databasekobling og tenantkontekst.

Dette gjør `chatbot` til beste første kandidat for å forstå hvordan en plugin
kobles inn i ClubsiteCMS. `vbsUpload` er relevant for eventuell fil- og
bildeopplasting til CKEditor-innhold.

## CMS-admin og tenant/session

Følgende eksisterende CSADMIN-filer har relevante treff:

```text
CSADMIN\classlib\cCommon.asp
CSADMIN\classlib\cPagefunctions.asp
CSADMIN\ckeditor\config.js
CSADMIN\ckeditor\styles.js
CSADMIN\ckeditor\templates.js
```

`cCommon.asp` har treff på:

- tenantkontekst;
- user-session;
- admin-/menyfunksjoner;
- pluginmønster.

`cPagefunctions.asp` har treff på:

- tenantkontekst;
- pluginmønster;
- side-/adminfunksjoner.

Dette er sannsynligvis de viktigste filene for å finne standard include- og
klassebruk i en ny Frivillig-adminside.

## Eksisterende forms-motor

`cs4-common\forms` inneholder blant annet:

```text
activitysignup_hotel.asp
frm_activitysignup_hotel.asp
frm_activitysignup_hotel_TEST.asp
memberschange.asp
membersignout.asp
membersignup.asp
membersignup_family.asp
payment_shop_local.asp
signup_activities.asp
signup_vtg.asp
formsview\sub_memberchange.asp
formsview\sub_memberin.asp
formsview\sub_memberout.asp
formsview\viewform.asp
```

Rapporten fant tenant- og sessionmønstre i forms-området. Dette er svært
relevant for Frivillig fordi det viser at Clubsite allerede har skjema-
arbeidsflyter vi kan lære av eller integrere med.

Det er fortsatt uavklart om forms-funksjonene er en generell skjemabygger
eller mange faste ASP-sider. Det må avklares ved lesing av et lite utvalg,
spesielt `signup_activities.asp`, `formsview\viewform.asp` og
`activitysignup_hotel.asp`.

## Hva rapporten bekrefter

Med høy sikkerhet:

1. ClubsiteCMS har en eksisterende CKEditor-integrasjon.
2. CMS-admin har egne CKEditor-filer under `CSADMIN`.
3. Det finnes en pluginstruktur under `cs4-common\plugins`.
4. Det finnes felles admin-/klassefiler med tenant-, session- og pluginspor.
5. Det finnes eksisterende skjema- og aktivitetssider.
6. Frivillig-pluginen bør bygges som en Clubsite-integrert modul, ikke som en
   separat adminløsning.

## Hva rapporten ikke bekrefter

- Den komplette registreringsflyten for en plugin i CMS-menyen, selv om
  `Pages_Plugins`, `pluginID`, `pluginRef` og `pageID` nå er verifisert.
- Hvilken klasse eller include som setter aktiv tenant.
- Hvilken rolle som kreves for CMS-admin.
- Hvilke SQL-tabeller/forms API-er som brukes.
- Om `chatbot` fortsatt er aktiv eller bare legacy-kode.
- Om `ckeditor`- og `CSADMIN\ckeditor`-kopiene skal behandles som samme
  distribusjon.

## Anbefalt neste lesing

Kjør et nytt, svært begrenset read-only-script på disse filene/områdene:

```text
cs4-common\CSADMIN\classlib\cCommon.asp
cs4-common\CSADMIN\classlib\cPagefunctions.asp
cs4-common\plugins\chatbot\
cs4-common\plugins\vbsUpload\
cs4-common\forms\signup_activities.asp
cs4-common\forms\formsview\viewform.asp
cs4-common\forms\activitysignup_hotel.asp
cs4-common\CSADMIN\ckeditor\ckeditor.js
cs4-common\CSADMIN\ckeditor\build-config.js
cs4-common\CSADMIN\ckeditor\config.js
```

Målet er å hente kun:

- CKEditor-versjon;
- pluginregistrering og menykobling;
- tenantvariabel/databasekobling;
- adminrolle/sessionkontroll;
- mønster for lagring av redigerbart innhold;
- eventuell bildeopplasting.

Ingen SQL- eller IIS-endringer skal gjøres før denne lesingen er ferdig.

### Anbefalt neste steg etter rapporten

Den brede discovery-fasen kan avsluttes. Neste read-only-verifisering bør bare
bekrefte:

- hva `depID` betyr i forhold til klubb/tenant;
- hvordan `Pages_Plugins` opprettes/oppdateres fra adminmenyen;
- hvilken konkret adminrolle som kreves;
- hvilke felt i forms-motoren som kan brukes av Frivillig.

Deretter kan vi lage en lokal POC i ny branch: én adminside med tilgangssjekk,
tenantvisning og CKEditor-felt uten lagring. Ingen endring i live-linjen.

### Endelig funn – pluginregistrering 26.08.2026

Den konkrete lagringsrutinen er identifisert:

`C:\FTP\SITES\CLUBSITE-4\CS4-ORIG\CSADMIN\files_pages\scr_pages.asp`

Rutinen leser `hidPageID`, `hidPluginID` og `pluginRef` fra POST, sletter
eksisterende `Pages_Plugins`-rader for siden og setter inn nye rader med
`pageID`, `pluginID` og `pluginRef`. Adminflyten er:

`cPageEdit.asp -> cPagePlugins.asp -> scr_pages.asp -> Pages_Plugins`

`cPagePlugins.asp` sender POST til `files_pages/scr_pages.asp` med
`hidDepID`, `hidPageID`, `hidPluginID` og `pluginRef`. `scr_pages.asp` bruker
`safeInpShort`, splitter flere `pluginRef`-verdier og lagrer én rad per verdi.
Innholdsfanen bruker `safeInpEditor` for CKEditor-data og lagrer via
`Page_Save_Content`.

Sikkerhetspunkt for Frivillig: eksisterende pluginlagring bruker `pageID` i
`DELETE`/`INSERT`, mens `hidDepID` ikke inngår direkte i disse betingelsene.
Ny kode må derfor validere at objektet tilhører aktiv tenant server-side før
lagring, og bør bruke parameterisert SQL eller stored procedure.

### Avgrensning 26.08.2026

`csadmin-file-list.txt` viser at `cs4-common\CSADMIN` bare inneholder
klassebibliotek, ikke selve admin-UI-et. Sideeditoren må derfor undersøkes
under `C:\FTP\SITES\CLUBSITE-4\CSADMIN` før vi søker etter lagringsrutinen.
