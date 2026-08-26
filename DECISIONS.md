# DECISIONS

## 2026-08-26 – Firebase-kilde og deployrekkefølge

- AI Studio-prosjektet er kilde for Firebase-versjonen.
- Koden holdes først under `firebase-app/` for å beskytte eksisterende frontend/API/data.
- Preview-kanal brukes før produksjonsdeploy.
- Admin må bruke reell Firebase Authentication og Firestore-adminregistrering.
- Utvikler-bypass og URL-parametere skal aldri gi adminautorisasjon.
