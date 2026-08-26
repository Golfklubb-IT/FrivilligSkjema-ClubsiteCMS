# Prosjektoverlevering – FrivilligSkjema ClubsiteCMS

Sist oppdatert: 2026-08-12  
Arbeidslinje: IIS/Clubsite-versjonen  
Repository: `Golfklubb-IT/FrivilligSkjema-ClubsiteCMS`

## Mål

Bygge IIS-versjonen av Frivillig-appen som kan brukes av flere Clubsite-tenants, med Clubsite-brukersession, tenant-sikkerhet og senere støtte for felles brukerdata, 23 apper og Golfbox-synkronisering.

## Viktig arbeidsregel

Ingen SQL-tabeller, IIS-mappinger eller live-mapper skal endres uten eksplisitt godkjenning. Analyse og dokumentasjon skal være read-only først.

## Verifisert infrastruktur

| Område | Verdi |
|---|---|
| SQL Server | SQL Server 2016 Web Edition, default instance `MSSQLSERVER` |
| Felles appkode | `C:\FTP\APPS\FRIVILLIG-APP\` |
| Ski tenant-integrasjon | `C:\FTP\SITES\CLUBSITE-4\SKI\FRIVILLIG-APP\` |
| Ski klubb | `clubID=73`, tenant `SKI`, database `CS4-SKI` |
| Test-URL | `https://skigk.no/FRIVILLIG-APP/` |
| Session-test | `https://skigk.no/FRIVILLIG-APP/clubsite-session-check.asp` |
| Clubsite user-login | `useraccount/userlogin.asp`, tabell `Siteusers`, proc `A_Siteuser_Login` |
| Admin/editor | Separat `CSADMIN`/`Admin_Users`; skal ikke blandes med vanlig brukerlogin |

## Multi-tenant beslutning

En bruker kan være medlem av flere klubber. Aktiv tenant bestemmes først av Clubsite-siden brukeren står på. Server/API skal kontrollere at brukerens `Session("userID")` faktisk har medlemskap i aktiv tenant. Eventuelt klubbbytte skal bare vise brukerens godkjente medlemskap.

Frontend skal aldri få bestemme tilgang ved å sende en vilkårlig `clubID`.

## Felles klubbregister

Original fasit:

`data/registries/gkit-norwegian-club-tenants.v1.json`

Oppdatert fasit for alle apper:

`data/registries/gkit-norwegian-club-tenants.v1.1.json`

v1.1 inneholder:

- 168 offisielle golfklubber;
- 1 demo-tenant;
- 6 godkjente foreninger/shops/anlegg uten `clubID`;
- godkjente serverfolder-mappinger;
- `tenantType` for ikke-klubber.

Mappingkilde:

`tools/club-folder-mapping-overrides.csv`

Merge-script:

`tools/merge-club-folder-mapping.ps1`

## Serverfolder-funn

Rapport:

`docs/system-common-inventory.txt`

`C:\FTP\SITES\SYSTEM-COMMON\` inneholder 1 479 filer og 318 mapper, blant annet `BLOGADMIN`, `cs4`, `golfbooking` og `libs`. Innholdet ser ut som eldre Clubsite-runtime/legacy-kode, hovedsakelig fra 2014–2021.

Beslutning: Ikke slett, flytt eller endre `SYSTEM-COMMON`. Ikke legg nye GKIT-filer der.

## Anbefalt nytt fellesområde

Primær anbefaling:

```text
C:\FTP\APPS\APPS-COMMON\
```

Dette skal brukes for nye GKIT-fellesfiler, registry, mappings og delte appbiblioteker.

Hvis Classic ASP må nå felles kode, prøves først kontrollert IIS Virtual Directory/intern mapping til `APPS-COMMON`. Hvis dette ikke fungerer, deployes nødvendige include-filer som kontrollert kopi til hver tenantapp:

```text
C:\FTP\SITES\CLUBSITE-4\<TENANT>\FRIVILLIG-APP\_includes\
```

`C:\FTP\SITES\APPS-COMMON\` er kun fallback dersom IIS/Classic ASP krever fysisk plassering under `SITES`. Da må direkte offentlig tilgang blokkeres.

Secrets skal ikke ligge under `C:\FTP\SITES` eller i repoet.

## Databasearbeid – status

Databasearkitekturen er dokumentert, men ingen tabeller er opprettet.

Dokument:

`docs/DATABASE_ARCHITECTURE.md`

Anbefalte felles tabeller inkluderer:

- `Core_User`
- `Core_UserIdentity`
- `Core_Tenant`
- `Core_UserTenant`
- `Core_App`
- `Core_UserApp`
- `Core_TenantApp`
- `Core_TenantLicense`
- `Core_AppOwner`
- `Core_AppOwnerTenant`

Frivillig-tabeller bør være separate tenant-sikre tabeller for aktivitet, vakt og registrering.

## Firebase-referanse

Standalone Firebase/React-versjonen er separat fra IIS-versjonen. Live-modellen viste logisk `volunteers`- og `shifts`-data, men Firebase Security Rules og original kildekode er ikke verifisert. Firebase-modellen brukes som funksjonell referanse, ikke som direkte SQL-kopi.

## Viktige lokale filer

| Fil | Formål |
|---|---|
| `SESSION_LOG.md` | Kronologisk status og verifiserte funn |
| `DECISIONS.md` | Arkitektur- og plattformbeslutninger |
| `NEXT_STEPS.md` | Prioritert arbeidsliste |
| `docs/DATABASE_ARCHITECTURE.md` | Foreslått databasestruktur |
| `docs/TENANT_REGISTRY.md` | Klubbregister og appOwner-modell |
| `docs/MULTI_CLUB_CONTEXT_AND_MAPPING.md` | Multi-klubb og fysisk mapping |
| `docs/COMMON_FOLDER_USAGE_ANALYSIS.md` | SYSTEM-COMMON/APPS-COMMON-vurdering |
| `api/get_session_status.asp` | Read-only sessionstatus, eksponerer ikke userID |
| `tools/export-folder-tenant-candidates.ps1` | Read-only folderkartlegging |
| `tools/club-folder-mapping-overrides.csv` | Godkjente manuelle mappinger |
| `tools/merge-club-folder-mapping.ps1` | Genererer registry v1.1 |

## Ikke gjort

- Ingen direkte serverendringer av Codex.
- Ingen SQL-tabeller opprettet.
- Ingen IIS Virtual Directory opprettet.
- `clubsite-session-check.asp` bør fjernes fra live etter at testen er ferdig.
- `save_registration.asp` er fortsatt ikke en ekte SQL-lagring.
- Eksisterende JSON API er ikke produksjonsklar eller tenant-sikker.

## Neste økt – anbefalt rekkefølge

1. Les denne filen, `SESSION_LOG.md`, `DECISIONS.md` og `NEXT_STEPS.md`.
2. Avklar med utvikler om `SYSTEM-COMMON` har aktive IIS-referanser.
3. Velg endelig plassering: `C:\FTP\APPS\APPS-COMMON\` er anbefalt.
4. Lag kun en deploy-/mappestruktur, uten live-opprettelse før godkjenning.
5. Ferdigstill SQL-oversendelsen med DDL-skisse, nøkler, FK-er, indekser og sikkerhetsregler.
6. Avklar om `Siteusers` eller ny `Core_User` skal være master for brukerdata.
7. Implementer tenant-sikker read-only API før lagring/påmelding.

## Handoff-status

Prosjektet er pauset etter analyse og dokumentasjon av tenantregister, servermapping og felles serverområde. Fortsett med verifisering og design; ikke gjør live-endringer automatisk.
