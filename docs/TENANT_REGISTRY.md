# Felles norsk klubb- og tenantregister

Original fasitfil er bevart som `data/registries/gkit-norwegian-club-tenants.v1.json`. Den oppdaterte felles fasiten er `data/registries/gkit-norwegian-club-tenants.v1.1.json`.

| Felt | Verdi |
|---|---:|
| Schema | `1.0.0` |
| Offisielle klubber | `168` |
| Totalt antall tenants | `169` |
| Demo-tenant | `clubId=999`, `tenantKey=demo` |
| Ski Golfklubb | `clubId=73`, `tenantKey=skigk` |
| SHA-256 | `6CA5F9193C9AAE09A20FB82928BB49C3BB8BD667E90CC113B2865CDDEF271F52` |

Registeret er en statisk identitetskatalog. Det aktiverer ikke automatisk en klubb og skal ikke inneholde brukere, passord, lisenser eller app-tilganger. Versjon 1.1 inkluderer også godkjente foreninger, shops, anlegg og fysiske servermappinger.

## Anbefalt appOwner-modell

| Tabell | Formål |
|---|---|
| `Core_Tenant` | Importert klubbidentitet fra JSON-registeret |
| `Core_App` | Register over de 23 appene |
| `Core_TenantApp` | Hvilke apper som er aktivert for en tenant |
| `Core_TenantLicense` | Lisens, plan, start-/sluttdato og status |
| `Core_AppOwner` | Hvem som kan administrere appene |
| `Core_AppOwnerTenant` | Hvilke tenants en appOwner kan administrere |

```text
appOwner -> Core_AppOwner -> Core_AppOwnerTenant
                         -> Core_TenantApp / Core_TenantLicense
```

Importen skal opprette og oppdatere identiteter, men aldri slette tenants automatisk eller sette lisensstatus. Endringer skal logges med registry-versjon og kildehash.

`tenantKey` fra URL eller frontend skal aldri alene gi tilgang. Serveren må kontrollere bruker-/appOwner-rettigheter mot tenant- og lisensdata.
