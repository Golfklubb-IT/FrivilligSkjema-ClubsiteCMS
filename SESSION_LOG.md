# SESSION_LOG

## 2026-08-26 – Firebase admin-migrering

- Preview-build er oppdatert med adminaktiveringsflyt etter ekte Google-login;
  bootstrap-identitet får kun aktiveringsvisning og må opprette et godkjent
  Firestore-admin-dokument før dashboardet vises.
- AI Studio-kilden er importert til `firebase-app/` uten å overskrive eksisterende filer.
- Firebase targets `demo`, `klubb` og `skigk` er verifisert i prosjektet `frivillig-kalendar-klubb`.
- Firebase fallback-konfigurasjonen er rettet til riktig prosjekt.
- Simulert login, e-postbypass og URL-basert adminautorisasjon er fjernet.
- `npm run lint`, `npm run build` og Firestore Rules-kompilering er bestått.
- Firestore `(default)`-database ble opprettet under Firebase-validering fordi prosjektet manglet database.
- `admin-test` preview er publisert for alle tre sites. Produksjonskanalene er ikke endret.

Preview utløper 02.09.2026 dersom kanalene ikke forlenges.

## 2026-08-26 – AppOwner og lisenser

- Implementert globalt `appOwner`-nivå over `clubAdmin`.
- AppOwner-panelet kan opprette/deaktivere klubber, registrere clubAdmin og
  aktivere/suspendere lisenser for VTG, Golfbil og Frivilligportal.
- Firestore-regler er deployet med tenant-, appkatalog- og lisensisolasjon.
- Ny kode er lintet, bygget og publisert til `admin-test` for demo, Ski GK og
  klubb-portalen. Produksjonskanalene er fortsatt uendret.
- AppOwner er strammet inn til `owe-admin@golfklubb-it.com`; Demo er ikke
  lenger en valgmulighet for `clubAdmin`.
