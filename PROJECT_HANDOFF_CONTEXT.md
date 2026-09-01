# Prosjektoverlevering

## Fast arkitekturbeslutning

Firebase-versjonen skal alltid beholdes som den komplette fullversjonen. IIS/Classic er en separat, valgfri plugin-/integrasjonsvariant som kan installeres via ClubsiteCMS for klubber som har denne CMS-integrasjonen. Klubber uten ClubsiteCMS skal fortsatt bruke fullversjonen i Firebase. IIS/Classic er derfor ikke en migrering eller erstatning av Firebase, og skal utvikles og deployes i et eget spor.

Firebase-kilden ligger midlertidig under `firebase-app/`.

- Repository: `Golfklubb-IT/FrivilligSkjema-ClubsiteCMS`
- Migreringsbranch: `firebase-admin-migration`
- Firebase-prosjekt: `frivillig-kalendar-klubb`
- Hosting-sites: demo, klubb og skigk
- Produksjonskanalene er ikke endret.
- Før merge/deploy må ekte adminlogin, `admins`-dokumenter og tenantisolasjon testes.
- AppOwner-previewet bruker `appOwners`, `tenants`, `appCatalog` og `licenses`.
- Restartstatus 27.08.2026 er samlet i `RESTART_STARTPOINT.md`. Neste hovedoppgave
  er Playwright-basert autentisert test av e-postregistrering og clubAdmin.
