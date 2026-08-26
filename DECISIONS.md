# DECISIONS

## 2026-08-09 – Plattform og tenantmodell

1. IIS/Clubsite-versjonen er den aktive utviklingslinjen for denne løsningen.
2. React/Firebase-versjonen behandles som separat standalone-app.
3. Felles IIS-appkode ligger under `C:\FTP\APPS\FRIVILLIG-APP\`.
4. Tenant-spesifikk frontend/integrasjon kan ligge under hver Clubsite-tenant, for eksempel `C:\FTP\SITES\CLUBSITE-4\SKI\FRIVILLIG-APP\`.
5. IIS-integrasjonen skal dele Clubsite user-session når appen ligger under samme tenant-site.
6. IIS-versjonen skal bruke Clubsite user-login via `Siteusers`; Firebase-login skal ikke være avhengighet for IIS-brukerflyten.
7. Admin/editor-tilgang skal holdes separat og bruke eksisterende Clubsite `CSADMIN`/`Admin_Users`-modell.
8. Tenant skal bestemmes server-side fra Clubsite-site/tenantdatabase. `clubID` eller tenantverdi fra frontend skal ikke være en tillitskilde.
9. Frivillig-data skal lagres i egne tenant-tabeller. Eksisterende Clubsite-aktiviteter skal ikke utvides med uavklarte dugnadsvakter.
10. SQL-passord, Firebase-hemmeligheter og persondata skal ikke legges i frontend eller commit-tre.
11. `gkit-norwegian-club-tenants.v1.json` er felles, versjonert identitetskatalog for klubber/tenants.
12. Klubbregisteret skal ikke styre lisens eller tilgang direkte. Dette håndteres separat med tenant/app- og appOwner-relasjoner.
13. Fasitregister versjon 1.1 inkluderer godkjente ikke-klubbtenants og `serverFolderMappings`, mens v1.0 beholdes som historisk kilde.
14. `C:\FTP\SITES\SYSTEM-COMMON\` behandles som legacy Clubsite-runtime og skal ikke endres eller brukes som ny GKIT-kilde uten eksplisitt verifisering.
15. Nye felles GKIT-runtimefiler anbefales lagt under `C:\FTP\APPS\APPS-COMMON\`, med mindre Classic ASP/IIS-inkludering krever et kontrollert område under `C:\FTP\SITES`.
16. Secrets skal ligge utenfor `C:\FTP\SITES` og ikke i registry-, mapping- eller appfiler.
17. Før `C:\FTP\SITES\APPS-COMMON\` vurderes, skal vi prøve IIS Virtual Directory/intern mapping fra `C:\FTP\APPS\APPS-COMMON\`. Fallback er deployet kopi av nødvendige include-filer per tenant.
