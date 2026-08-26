# DECISIONS

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
