# DECISIONS

## 2026-09-01 – Firebase beholdes permanent; IIS/Classic er valgfri plugin

Dette er en fast produkt- og arkitekturbeslutning:

- Firebase-versjonen skal alltid beholdes som den komplette, selvstendige fullversjonen av løsningen.
- IIS/Classic-versjonen er en separat integrasjonsvariant, ikke en erstatning eller migrering bort fra Firebase.
- IIS/Classic skal kunne installeres som en valgfri plugin/modul via ClubsiteCMS for klubber som har denne CMS-integrasjonen.
- Klubber som ikke har ClubsiteCMS-integrasjon skal fortsatt bruke fullversjonen i Firebase.
- Firebase og IIS/Classic skal ha separate runtime-, deploy- og integrasjonsløp. Felles domenelogikk kan gjenbrukes når det er trygt, men IIS-sporet skal ikke svekke eller fjerne Firebase-sporet.

## 2026-09-01 – Mock connection før SQL

- IIS/Classic utvikles trinnvis med mock connection/mock API først.
- Frontend, API-kontrakt, roller, tenantgrense, bookingregler og adminflyt skal verifiseres før databasearbeid.
- SQL-tabeller, migrering og ekte MS SQL-tilkobling skal være siste implementasjonspunkt.
- Den tidligere `GKIT-Golfbilutleie-Multi-for-CS-Integration`-prototypen er ekskludert fra dette arbeidsløpet og brukes kun som historisk referanse.

## 2026-08-26 – Firebase-kilde og deployrekkefølge

- AI Studio-prosjektet er kilde for Firebase-versjonen.
- Koden holdes først under `firebase-app/` for å beskytte eksisterende frontend/API/data.
- Preview-kanal brukes før produksjonsdeploy.
- Admin må bruke reell Firebase Authentication og Firestore-adminregistrering.
- Utvikler-bypass og URL-parametere skal aldri gi adminautorisasjon.

## 2026-08-26 – Rollemodell for app-eier

- `appOwner` er et eget globalt nivå over `clubAdmin`.
- App-eierdata lagres i `appOwners/{uid}`; klubbtilgang ligger fortsatt i `admins`.
- Klubber, appkatalog og lisenser holdes i egne Firestore-kolleksjoner:
  `tenants`, `appCatalog` og `licenses`.
- `admin-test` er første testflate. Produksjonskanalene skal ikke oppdateres før
  ekte innlogging og tenantisolasjon er kontrollert.
- `owe-admin@golfklubb-it.com` er eneste appOwner-konto i denne fasen.
- E-post-bootstrap er midlertidig og skal senere erstattes av eksplisitte
  owner-dokumenter/claims uten hardkodede e-postadresser i regler.
