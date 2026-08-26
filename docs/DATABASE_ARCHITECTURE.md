# Foreslått databasearkitektur for Clubsite-applikasjonene

Dato: 2026-08-09  
Status: Designforslag – ingen SQL-tabeller er opprettet eller endret.

## Kort konklusjon

Firebase-appen er undersøkt fra den publiserte React-bundlen. Den bruker i praksis to sentrale Firestore-kolleksjoner:

- `volunteers`
- `shifts`

Dette er et nyttig funksjonelt utgangspunkt, men strukturen bør ikke kopieres 1:1 til SQL. For 23 apper og flere tenants anbefales en felles identitetsmodell med separate koblingstabeller. Da kan samme bruker brukes på tvers av apper og klubber uten å kopiere brukerdata eller blande klubbtilhørighet.

## Verifisert fra Firebase-appen

| Firebase-objekt | Observerte felt/bruk | SQL-konsekvens |
|---|---|---|
| `volunteers` | `name`, `phone`, `email`, `golfboxId`, `tasks`, `availability`, `clubId`, `submittedAt` | Deles mellom `Core_User`, `Core_UserTenant` og eventuell `Volunteer_Profile` |
| `shifts` | `id`, `volunteerId`, `volunteerName`, `volunteerPhone`, `volunteerEmail`, `golfboxId`, `task`, `date`, `timeSlot`, `startTime`, `endTime`, `clubId` | Bør normaliseres til aktivitet, vakt og påmelding |
| Firebase Auth | Firebase UID og e-post/Google-innlogging | Lagres som ekstern identitet, ikke som passord i SQL |
| `clubId` | Brukes som klubbidentifikator, blant annet `73` for Ski | Må alltid være del av tenant-/tilgangskontrollen |
| Profil-cache | `volunteer_profile_<clubId>_v1` i nettleseren | Kun cache; ikke autoritativ datakilde |

## Anbefalt felles modell

`Core_`-tabellene er felles for alle 23 apper. App-spesifikke tabeller skal koble til `Core_User.userID` og `Core_Tenant.tenantID`.

| Tabell | Viktige kolonner | Formål |
|---|---|---|
| `Core_User` | `userID`, `email`, `firstName`, `lastName`, `phone`, `active`, `createdAt`, `updatedAt` | Én global brukerpost per person |
| `Core_UserIdentity` | `identityID`, `userID`, `provider`, `providerUserID`, `tenantID`, `memberID`, `lastLoginAt` | Kobler samme person til Firebase, Clubsite og senere Golfbox |
| `Core_Tenant` | `tenantID`, `clubID`, `tenantKey`, `name`, `active` | Klubben/tenanten som eier dataene |
| `Core_TenantApp` | `tenantID`, `appID`, `enabled`, `enabledAt`, `disabledAt` | Om en app er aktivert for tenanten |
| `Core_TenantLicense` | `tenantID`, `appID`, `plan`, `status`, `validFrom`, `validTo` | Lisens per app og tenant |
| `Core_UserTenant` | `userID`, `tenantID`, `status`, `role`, `joinedAt` | Mange-til-mange: én bruker kan tilhøre flere klubber |
| `Core_App` | `appID`, `appKey`, `name`, `active` | Register over de 23 appene |
| `Core_UserApp` | `userID`, `appID`, `tenantID`, `role`, `active` | App- og tenant-spesifikk tilgang |
| `Core_AppOwner` | `userID`, `appID`, `active` | AppOwner-tilgang på appnivå |
| `Core_AppOwnerTenant` | `userID`, `appID`, `tenantID` | Begrensning til tenants appOwner kan administrere |
| `Core_UserExternalProfile` | `userID`, `provider`, `externalID`, `profileJSON`, `syncedAt` | Utvidbare data fra Golfbox eller andre eksterne systemer |
| `Core_UserDevice` | `deviceID`, `userID`, `appID`, `tenantID`, `pushToken`, `active` | Push-varsler per app/tenant |
| `Volunteer_Profile` | `userID`, `tenantID`, `tasks`, `availability`, `notes` | Frivillig-spesifikke opplysninger; ikke identitet |
| `Volunteer_Activity` | `activityID`, `tenantID`, `title`, `description`, `location`, `activityDate`, `active` | Aktivitet eller arrangement |
| `Volunteer_Shift` | `shiftID`, `activityID`, `tenantID`, `task`, `startTime`, `endTime`, `capacity`, `status` | En konkret vakt som kan bemannes |
| `Volunteer_Registration` | `registrationID`, `shiftID`, `tenantID`, `userID`, `status`, `registeredAt`, `cancelledAt` | Påmelding; én rad per bruker/vakt |
| `Core_SyncRun` | `syncID`, `provider`, `tenantID`, `startedAt`, `finishedAt`, `status`, `errorMessage` | Sporbar Golfbox-synkronisering |

## Hvorfor brukeren ikke bør ligge direkte i tenant-tabellen

Vi bør ikke bruke `tenantID + userID` som eneste brukeridentitet. En bruker kan senere:

- være medlem av flere klubber;
- bruke flere av de 23 appene;
- logge inn med Google, Firebase e-post/passord, Clubsite og Golfbox;
- ha ulike roller i ulike klubber eller apper.

Derfor er riktig kobling:

```text
Core_User
  ├── Core_UserIdentity       (Firebase / Clubsite / Golfbox)
  ├── Core_UserTenant         (klubbmedlemskap og tenantrolle)
  ├── Core_UserApp            (tilgang til app)
  └── Volunteer_Profile       (appens egne frivilligdata)
```

## Kobling mot dagens Clubsite

For Ski bør eksisterende Clubsite-bruker kobles omtrent slik:

| Kilde | Ny kolonne |
|---|---|
| `CS4-SKI.dbo.Siteusers.userID` | `Core_UserIdentity.providerUserID` med `provider='clubsite'` |
| `Siteusers.memberID` | `Core_UserIdentity.memberID` |
| `CLUBSITE-COMMON.dbo.Clubs.clubID = 73` | `Core_Tenant.clubID` og `Core_UserIdentity.tenantID` |
| `Session("userID")` | Brukes av IIS-integrasjonen for å finne riktig bruker |

`Admin_Users` skal ikke blandes automatisk med vanlige brukere. Admin/editor-tilgang må ha separat rolle- eller identitetsmapping.

## Golfbox senere

Golfbox bør registreres som en ekstern identitet, for eksempel:

```text
provider          = 'golfbox'
providerUserID    = Golfbox-ID
userID            = intern Core_User.userID
tenantID          = aktuell klubb
```

Golfbox-passord skal ikke lagres i den nye databasen. Synkroniseringen bør lagre siste vellykkede tidspunkt, status og eventuelle eksterne profilverdier, slik at data kan oppdateres uten å overskrive intern brukerdata.

## Viktig sikkerhetsregel

Alle tenant-spesifikke tabeller må ha `tenantID`, og alle API-spørringer må kontrollere både:

1. at brukeren er autentisert;
2. at brukeren har tilgang til aktuell `tenantID`;
3. at objektet, for eksempel `shiftID`, tilhører samme tenant.

Det er ikke tilstrekkelig å filtrere tenant-data i React-klienten.

## Felles klubbregister og appOwner

Fasitfilen `data/registries/gkit-norwegian-club-tenants.v1.json` er den felles, versjonerte klubbkatalogen. Den importeres til `Core_Tenant`, mens aktivering og lisensiering håndteres separat med `Core_TenantApp`, `Core_TenantLicense` og appOwner-tabellene.

## Ikke ferdig verifisert

- Firebase Security Rules er ikke tilgjengelige i repoet eller den publiserte bundle.
- Den publiserte Firebase-appen viser logisk feltnavnstruktur, men ikke nødvendigvis hele produksjonsmodellen.
- Vi har ikke ennå besluttet om Clubsite `Siteusers` skal være master for brukere, eller om en ny felles `Core_User` skal bli master.
- Vi har ikke laget DDL eller skrevet til SQL.

## Anbefalt beslutning

Bruk Firebase-modellen som funksjonell referanse, men implementer den relasjonelt som:

```text
Core_User + Core_UserIdentity + Core_Tenant + Core_UserTenant + Core_UserApp
    + Volunteer_Activity + Volunteer_Shift + Volunteer_Registration
```

Dette gir gjenbruk på tvers av 23 apper, tenant-sikkerhet, støtte for Clubsite-session og mulighet for Golfbox senere.

Neste tekniske steg er å lage en ikke-kjørbar SQL-design/DDL med nøkler, unike regler og indeksforslag. Den skal gjennomgås før noen tabeller opprettes i SQL Server.
