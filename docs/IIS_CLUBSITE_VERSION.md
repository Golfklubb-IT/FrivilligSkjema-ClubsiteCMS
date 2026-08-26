# IIS-versjon for Clubsite CMS

## Formål

Dette er den integrerte versjonen av Frivillig- og dugnadsmodulen for Clubsite CMS.
Versjonen skal kjøre på klubbens eksisterende Windows Server/IIS-miljø og kunne
legges inn i eller lenkes fra Classic ASP-baserte Clubsite-sider.

## Teknisk profil

- Frontend: HTML, CSS og JavaScript
- Backend: Classic ASP-endepunkter under `api/`
- Lagring i prototypefasen: JSON-filer under `data/`
- Integrasjon: relative URL-er slik at frontend og API kan kjøre under samme nettsted
- Admin: skal sikres gjennom Clubsite CMS/`CSADMIN`

## Repo og produksjonsmål

- GitHub: https://github.com/Golfklubb-IT/FrivilligSkjema-ClubsiteCMS
- Målmiljø: IIS/Classic ASP
- Denne versjonen er den aktive utviklingslinjen for Clubsite CMS.

## Viktig avgrensning

Denne versjonen skal ikke blandes direkte med React/Firebase-standalone-appen.
Funksjoner kan vurderes og porteres manuelt, men runtime, deploy, autentisering
og datalagring skal behandles som separate løsninger.

## Kjente gjenstående oppgaver

1. Implementere faktisk lagring i `api/save_registration.asp`.
2. Sikre adminruter gjennom Clubsite CMS.
3. Fikse og verifisere innloggingslogikken før eventuell bruk av Firebase Auth.
4. Erstatte placeholder-konfigurasjon for push dersom push skal brukes i IIS-versjonen.
5. Teste filrettigheter, JSON-skriving og alle API-kall på IIS.

