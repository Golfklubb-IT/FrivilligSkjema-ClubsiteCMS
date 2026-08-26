# NEXT_STEPS

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
- [ ] Deploye produksjonskanalene etter godkjent test.

## AppOwner og lisensiering

- [x] Innføre `appOwner`-nivå over `clubAdmin`.
- [x] Legge til Firestore-kolleksjoner for `appOwners`, `tenants`, `appCatalog` og `licenses`.
- [x] Lage appOwner-panel for klubbaktivering, clubAdmin og lisensstatus.
- [ ] Teste opprettelse/aktivering av én testklubb i preview.
- [ ] Teste at clubAdmin ikke kan lese eller endre andre klubbers data.
- [ ] Erstatte midlertidig e-post-bootstrap med eksplisitt owner-oppsett.
