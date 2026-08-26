# Anbefalt felles serverområde for GKIT-appene

## Anbefaling

Bruk eksisterende:

```text
C:\FTP\SITES\SYSTEM-COMMON\GKIT\
```

Dette er bedre enn å opprette et parallelt `C:\FTP\APPS\apps-common`-område. Clubsite har allerede etablert `SYSTEM-COMMON` som felles plattformområde, og en egen `GKIT`-gren gir tydelig eierskap uten å blande GKIT-filer direkte med eldre Clubsite-filer.

## Foreslått struktur

```text
C:\FTP\SITES\SYSTEM-COMMON\
└── GKIT\
    ├── registry\
    │   ├── gkit-norwegian-club-tenants.v1.1.json
    │   └── current.json
    ├── mappings\
    │   └── server-folder-mappings.v1.json
    ├── apps\
    │   ├── apps.v1.json
    │   └── tenant-app-activation.v1.json
    ├── libs\
    │   └── shared ASP/include-filer
    └── logs\
```

## Hva skal ligge hvor

| Område | Innhold | Tilgang |
|---|---|---|
| `registry` | Klubber, tenants og stabile identiteter | Read-only for apper |
| `mappings` | Fysiske servermapper og tenantkoblinger | Server/API, ikke offentlig |
| `apps` | Appregister og lisens-/aktiveringskonfigurasjon | AppOwner/API |
| `libs` | Felles Clubsite/GKIT-kode | IIS-applikasjoner |
| `logs` | Tekniske logger uten passord | Drift/utvikling |
| `C:\FTP\APPS\FRIVILLIG-APP` | Frivillig-appens felles kode | IIS/API |
| `C:\FTP\SITES\CLUBSITE-4\<TENANT>\FRIVILLIG-APP` | Tenant-spesifikk frontend/integrasjon | Den aktuelle tenanten |

## Viktige regler

1. Git-repoet er kilde for konfigurasjonsfiler; serverområdet er deployet runtime-kopi.
2. Ikke rediger fasitfiler manuelt på serveren uten å oppdatere repoet.
3. Bruk versjonerte filer og en kontrollert `current.json`; overskriv ikke historiske versjoner.
4. Servermappinger kan inneholde interne fysiske stier og skal ikke eksponeres offentlig.
5. SQL-passord, API-nøkler og andre secrets skal ikke ligge under `C:\FTP\SITES`. Bruk separat beskyttet område, for eksempel `C:\ProgramData\GKIT\Secrets`, med ACL for aktuell IIS AppPool.
6. Før området tas i bruk må IIS-bindinger kontrolleres slik at `SYSTEM-COMMON` ikke kan lastes direkte fra internett.

## Hvorfor ikke legge alt under `C:\FTP\APPS`

`C:\FTP\APPS\FRIVILLIG-APP` er riktig for felles appkode. Register, mappinger og plattformkonfigurasjon gjelder imidlertid alle apper og bør ha samme livssyklus som Clubsite-plattformen. Derfor er `SYSTEM-COMMON\GKIT` riktig plassering for runtime-fellesdata, mens appkode fortsatt ligger under `APPS`.
