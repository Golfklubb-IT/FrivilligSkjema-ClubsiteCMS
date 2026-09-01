# NEXT_STEPS

## Produktstrategi for distribusjonsvariantene

**Fast beslutning:** Firebase er den permanente fullversjonen. IIS/Classic er en separat, valgfri ClubsiteCMS-plugin for klubber som har CMS-integrasjonen. Firebase skal fortsatt være løsningen for alle andre klubber.

### IIS/Classic-plugin

- [ ] Skaffe og dokumentere et reelt ClubsiteCMS-plugin/API-eksempel før implementasjonsdetaljer låses.
- [ ] Definere integrasjonskontrakt for CMS-eid klubb-, rolle- og tenantkontekst.
- [ ] Lage IIS/Classic som et separat plugin-/deployspor uten å endre Firebase-versjonen.
- [ ] Bygge og verifisere én liten Demo-vertikal gjennomgang i ClubsiteCMS før videre utvidelse.
- [ ] Dokumentere funksjonsmatrise og tydelig fallback til Firebase for klubber uten ClubsiteCMS.

## Firebase admin-migrering

- [x] Importere AI Studio-kilden uten overskriving.
- [x] Koble Firebase-konfigurasjon til riktig prosjekt.
- [x] Fjerne simulert login, bypass og URL-basert adminautorisasjon.
- [x] Kjøre lint/build og kompilere Firestore Rules.
- [x] Publisere `admin-test` preview for alle tre sites.
- [ ] Teste Google-login med godkjent admin-/klubblederkonto.
- [ ] Kontrollere `admins`-dokumenter og tenantisolasjon.
- [ ] Review og deploye Firestore Rules.
- [ ] Merge til `master` etter godkjent preview.
- [x] Deploye produksjonskanalene etter godkjent test.

## AppOwner og lisensiering

- [x] Innføre `appOwner`-nivå over `clubAdmin`.
- [x] Legge til Firestore-kolleksjoner for `appOwners`, `tenants`, `appCatalog` og `licenses`.
- [x] Lage appOwner-panel for klubbaktivering, clubAdmin og lisensstatus.
- [ ] Teste opprettelse/aktivering av én testklubb i preview.
- [ ] Teste at clubAdmin ikke kan lese eller endre andre klubbers data.
- [ ] Knytte en eksisterende Google-konto til test-`clubAdmin`.
- [ ] Teste e-postregistrering, verifiseringslenke og e-postinnlogging i produksjon.

## Restart 27.08.2026

- [ ] Koble til Playwright/browser bridge igjen.
- [ ] Ta autentiserte skjermbilder av appOwner- og clubAdmin-flyt.
- [ ] Teste og rydde en midlertidig e-postbasert test-`clubAdmin`.
- [ ] Verifisere tenantisolasjon før eventuell merge til `master`.
- [ ] Erstatte midlertidig e-post-bootstrap med eksplisitt owner-oppsett.
