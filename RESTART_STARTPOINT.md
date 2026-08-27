# Restartpunkt – 27.08.2026

## Aktiv branch og prosjekt

- Repository: `Golfklubb-IT/FrivilligSkjema-ClubsiteCMS`
- Branch: `firebase-admin-migration`
- Firebase-prosjekt: `frivillig-kalendar-klubb`
- Kildekode: `firebase-app/`
- Produksjonsbranch `master` er ikke merge'et.

## Hva som er ferdig

- Adminversjon er deployet til alle tre produksjonssites:
  - `https://frivillig-kalendar-demo.web.app/admin`
  - `https://frivillig-kalendar-skigk.web.app/admin`
  - `https://frivillig-kalendar-klubb.web.app/admin`
- Google-login fungerer fortsatt.
- Vanlig e-post/passordregistrering er lagt til.
- Registrering sender verifiserings-e-post.
- Uverifiserte e-postkontoer stoppes ved innlogging.
- `appOwner` er begrenset til `owe-admin@golfklubb-it.com`.
- `clubAdmin` får ikke appOwner-panelet eller Demo som klubbvalg.
- AppOwner-panel finnes for klubber, clubAdmin og lisenser.
- Firestore-regler er deployet for `appOwners`, `tenants`, `appCatalog` og `licenses`.
- Lokal `lint` og `build` er bestått.

## Viktige commits

- `0583a97` – e-post/passordautentisering
- `9d2af48` – produksjonsdeploy dokumentert
- `b627895` – appOwner begrenset til eierkonto
- `1c87a09` – dokumentasjon av eierkonto

## Første steg etter omstart

Kjør fra repo-roten:

```powershell
git status
git branch --show-current
git log -5 --oneline
```

Kjør deretter fra `firebase-app`:

```powershell
npm run lint
npm run build
```

## Gjenstående arbeid

1. Koble inn Playwright-nettleseren igjen og ta autentiserte skjermbilder.
2. Test e-postregistrering og verifiseringslenke.
3. Opprett eller bruk en faktisk testkonto som `clubAdmin`.
4. Test tilgang på demo, Ski GK og klubbportalen.
5. Kontroller at `clubAdmin` ikke kan lese en annen tenants data.
6. Rydd testkontoens adminrolle etter testen.
7. Først etter godkjent test vurderes merge til `master`.

## Viktig begrensning

Playwright/browser bridge var utilgjengelig ved siste økt og returnerte
`No browser is available`. Dette må verifiseres før autentisert UI-testing.

## Sikkerhetsnotat

Produksjonsdeploy er utført eksplisitt. Ikke deploy til produksjon på nytt uten
å kontrollere endringene. Hardkodet e-post-bootstrap for appOwner er en
midlertidig løsning; senere bør dette erstattes av eksplisitt owner-oppsett.
