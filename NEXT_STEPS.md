# NEXT_STEPS

## Produktstrategi for distribusjonsvariantene

**Fast beslutning:** Firebase er den permanente fullversjonen. IIS/Classic er en separat, valgfri ClubsiteCMS-plugin for klubber som har CMS-integrasjonen. Firebase skal fortsatt være løsningen for alle andre klubber.

### IIS/Classic-plugin

Arbeidsmodellen er mock-first. SQL-tabeller og ekte databasekobling skal være siste punkt, etter at grensesnitt, API-kontrakt, roller og bookingflyt er verifisert.

1. [ ] Avgrense IIS-pluginen og holde `GKIT-Golfbilutleie-Multi-for-CS-Integration` utenfor dette arbeidet som historisk referanse.
2. [ ] Dokumentere ClubsiteCMS-pluginens faktiske innkoblingspunkt, session- og rollemodell.
3. [ ] Definere stabil API-kontrakt for offentlig visning, tilgjengelighet, booking og admin.
4. [ ] Lage mock connection/mock API med samme responser og feilkoder som produksjonskontrakten.
5. [ ] Koble React/Vite-frontend til mock connection og fjerne avhengighet til `localStorage` i pluginflyten.
6. [ ] Implementere og teste offentlig booking, konfliktkontroll og adminflyt mot mock-data.
7. [ ] Verifisere tenant-/klubbgrense, tilgangsnivåer, Playwright-flyt og CMS-styling i staging.
8. [ ] Lage installasjons-, deploy-, backup- og rollback-dokumentasjon for pluginen.
9. [ ] **Sist:** Definere SQL-tabeller, migrering og ekte Classic ASP/MS SQL connection basert på den verifiserte API-kontrakten.

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
