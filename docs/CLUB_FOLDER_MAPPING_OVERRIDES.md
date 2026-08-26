# Oppdatering av fysisk klubbmapping

Rediger denne filen:

`tools/club-folder-mapping-overrides.csv`

Ikke rediger:

`data/registries/gkit-norwegian-club-tenants.v1.json`

## Slik fylles filen ut

For hver mappe du kjenner, fyll inn `clubId` og sett `approved` til `YES`. Hvis du bare kjenner klubbnavnet, kan du skrive navnet i `notes` og la `clubId`/`tenantKey` stå tomt; jeg validerer og kompletterer dette mot fasitregisteret.

Eksempel:

```csv
BORRE,37,borregk,YES,Bekreftet mot Clubsite
```

Kolonner:

| Kolonne | Betydning |
|---|---|
| `folderName` | Må være nøyaktig fysisk mappenavn |
| `clubId` | Klubbens ID fra fasitregisteret |
| `tenantKey` | Må samsvare med `clubId` i fasit-JSON |
| `approved` | Bruk `YES` først når koblingen er kontrollert |
| `notes` | Valgfri forklaring/kilde |

Du trenger normalt bare å fylle inn de tomme radene. `SKI` er allerede lagt inn som kontrollert eksempel.

Når filen er oppdatert, last den opp igjen. Da validerer og merger jeg den mot `gkit-norwegian-club-tenants.v1.json` og lager en separat mappingfil. Hovedregisteret blir ikke overskrevet.
