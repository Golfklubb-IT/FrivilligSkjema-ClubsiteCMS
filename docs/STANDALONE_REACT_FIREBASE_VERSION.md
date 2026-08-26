# Standalone-versjon med React og Firebase

## Formål

Dette er en separat standalone-app for moderne hosting via Firebase Hosting.
Den er ikke den samme implementasjonen som Classic ASP/IIS-versjonen i dette
repoet.

## Verifiserte live-sites

- Demo: https://frivillig-kalendar-demo.web.app/
- Klubb: https://frivillig-kalendar-klubb.web.app/
- Ski GK: https://frivillig-kalendar-skigk.web.app/

Alle tre live-sites ble observert med samme React/Vite-baserte build-artifact.
Firebase Hosting viste siste release 03.06.2026 kl. 15:19.

## Teknisk profil

- Frontend: React-bundle med Tailwind CSS
- Hosting: Firebase Hosting
- Firebase SDK er inkludert i live-bygget
- Kildekoden til denne builden er ikke identifisert i
  `Golfklubb-IT/FrivilligSkjema-ClubsiteCMS`

## Avgrensning mot IIS-versjonen

- Skal ikke deployes til IIS som om den var Classic ASP-versjonen.
- Skal ikke bruke IIS-versjonens relative Classic ASP-API-er uten en bevisst integrasjon.
- Endringer i denne appen bør gjøres i et eget repo med egen deployhistorikk.

## Anbefalt videre organisering

Opprett et eget repo for React/Firebase-appen, for eksempel:

`FrivilligSkjema-Standalone-Firebase`

Bruk separate branches i dette IIS-repoet bare dersom det senere blir en felles
kodebase med reelle, delte komponenter. Separate repos er anbefalt nå fordi
plattform, backend, autentisering, datalagring og deployløp er forskjellige.

