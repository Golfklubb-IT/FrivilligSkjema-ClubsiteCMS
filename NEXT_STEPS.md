# NEXT_STEPS

Ved ny økt: les `PROJECT_HANDOFF_CONTEXT.md` først.

## Prioritet 1 – IIS-integrasjon

- [x] Dokumentere tenant-, IIS- og SQL-struktur.
- [x] Verifisere at Clubsite user-session er tilgjengelig fra `/FRIVILLIG-APP/`.
- [ ] Fjerne `clubsite-session-check.asp` etter verifisering.
- [ ] Avklare hvordan felles API-mappen skal mappes under tenant-URL uten å bryte Clubsite-session.
- [x] Lage en liten, read-only IIS API-test som returnerer innlogget status uten å eksponere `userID`.

## Prioritet 2 – SQL-modell

- [x] Lagre og validere felles norsk klubb-/tenantregister.
- [ ] Lage importdesign fra registry JSON til `Core_Tenant` med endringslogg.
- [ ] Lage lisens-/appOwner-design med `Core_TenantApp`, `Core_TenantLicense` og owner-koblinger.
- [ ] Kjøre read-only `tools/export-club-tenant-mapping.ps1` på serveren og kontrollere avvik.
- [ ] Kjøre filesystem-only `tools/export-folder-tenant-candidates.ps1` uten SQL-innlogging.
- [ ] Fylle ut `tools/club-folder-mapping-overrides.csv` for kjente fysiske mappemappinger.
- [ ] Validere og merge override-filen mot klubbregisteret til separat mapping-JSON.
- [ ] Kontrollere IIS-bindinger og ACL før `SYSTEM-COMMON\GKIT` tas i bruk.
- [ ] Lage deploypakke for registry/mapping til `SYSTEM-COMMON\GKIT`.
- [ ] Kjøre `tools/analyze-common-folder-usage.ps1` før valg mellom `SYSTEM-COMMON` og `APPS-COMMON`.
- [ ] Kartlegge eksisterende `dbConn`/tenant-tilkobling som brukes av Clubsite ASP-kode.
- [ ] Lage SQL-design for `Frivillig_Activities`, `Frivillig_Shifts` og `Frivillig_Registrations`.
- [ ] Koble registreringer til `Siteusers.userID` uten å lagre passord.
- [ ] Lage separate SQL-skript for review før eventuell kjøring på server.

## Prioritet 3 – API og frontend

- [ ] Erstatte JSON-lesing med tenant-lokal SQL-lesing.
- [ ] Sikre alle API-kall med eksisterende Clubsite-session.
- [ ] Implementere vaktvisning og påmelding.
- [ ] Implementere adminfunksjoner etter at tilgangsmodellen er bekreftet.

## Blokkeringer før produksjon

- Nåværende `save_registration.asp` lagrer ikke data.
- Nåværende JSON-API er ikke tenant-sikkert.
- API-mapping mot felles appområde er ikke endelig verifisert.
- SQL-tabeller for Frivillig er ikke opprettet.

## 2026-08-20 – Nye verifikasjonspunkter

- [ ] Få bekreftet fysisk IIS-deploy/mappe for `frontend` og `api`; offentlig URL viser foreløpig Clubsite-fallback.
- [ ] Fjern `clubsite-session-check.asp` fra live når IIS-integrasjonen er ferdig verifisert.
- [ ] Skaff Firebase-kilde/deployreferanse fra riktig repo eller Firebase Console før lokal Firebase-kode kan erklæres synkronisert.
- [ ] Ikke bland Firebase-builden fra 03.06.2026 med IIS-Classic ASP-linjen uten eksplisitt integrasjonsbeslutning.

## 2026-08-21 – Serverinventar og plugin-discovery

- [ ] Kjør avgrenset innholdsanalyse av `cs4-common\ckeditor`, `plugins`, `CSADMIN`, `forms` og `api`.
- [ ] Identifiser eksisterende pluginregistrering, CMS-meny, tenantkontekst og adminrolle.
- [ ] Verifiser CKEditor-versjon og initieringsmønster før ny integrasjon.
- [ ] Fullfør `CLUBSITE-4`-inventar i mindre undermapper fordi hovedrapporten timet ut.
- [ ] Gjennomgå `.env`, `appsettings` og `web.config` for plassering/tilgang uten å kopiere secrets.

## 2026-08-23 – Neste avgrensede kodegjennomgang

- [ ] Bekrefte CKEditor-versjon fra `CSADMIN\ckeditor\ckeditor.js` eller `build-config.js`.
- [ ] Kartlegge pluginregistrering og menykobling gjennom `CSADMIN\classlib\cCommon.asp` og `cPagefunctions.asp`.
- [ ] Bruke `plugins\chatbot` som referanse for pluginstruktur.
- [ ] Bruke `forms\signup_activities.asp` og `formsview\viewform.asp` som referanse for tenant-sikre skjema.
- [ ] Avklare om `vbsUpload` kan gjenbrukes for CKEditor-bilder.

## 2026-08-24 – Målrettet integrasjonsanalyse

- [x] Kopier og kjør `tools/collect-clubsite-integration-readonly.ps1` på serveren.
- [x] Analyser `evidence.csv` for CKEditor-versjon, pluginregistrering, tenant/session og databasekobling.
- [x] Bekrefte at ClubsiteCMS har gjenbrukbart plugin-, tilgangs- og forms-mønster.
- [ ] Bekrefte den komplette `Pages_Plugins`-registreringsflyten og betydningen av `depID`.
- [x] Klargjøre `tools/collect-clubsite-registration-readonly.ps1` for denne verifiseringen.
- [x] Kjøre korrigert script på nytt fordi første CSV-eksport manglet headerlinjer.
- [ ] Hente den konkrete CSADMIN-siden eller databaseskjemaet som oppretter/oppdaterer `Pages_Plugins`.
- [x] Identifisere runtime-kjeden `cs-classes\cPages.asp` -> `cPlugins.asp`.
- [ ] Søke på nytt med korrekt filendelsesfilter etter `Request.Form("pluginRef")`, `scr_`-rutiner og stored procedure-kall.
- [ ] Identifisere CSADMIN-sideeditoren og følge dens form-action til lagringsrutinen.
- [x] Avgrense at `cs4-common\CSADMIN` kun inneholder klassebibliotek, ikke admin-UI.
- [ ] Lage filoversikt for `C:\FTP\SITES\CLUBSITE-4\CSADMIN` før innholdssøk.
- [x] Få bekreftet admin-URL `/csadmin/` og referanseområdet `CS4-ORIG\CSADMIN`.
- [ ] Søke kun i `CS4-ORIG\CSADMIN` etter sideeditorens form-action og lagringsrutine.
- [ ] Lage lokal read-only POC for Frivillig-admin i separat branch.
- [x] Verifisere komplett adminflyt: `cPageEdit.asp` -> `cPagePlugins.asp` -> `scr_pages.asp` -> `Pages_Plugins`.
- [ ] Ta med ekstra server-side tenantkontroll i Frivillig-lagring; ikke kopier `pageID`-only-mønsteret ukritisk.
- [ ] Lage SQL-design for egne aktiviteter, vakter og påmeldinger med tenantfelt.
