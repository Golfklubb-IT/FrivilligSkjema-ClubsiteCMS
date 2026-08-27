# Prosjektoverlevering

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
