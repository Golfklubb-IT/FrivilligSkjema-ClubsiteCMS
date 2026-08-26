# Analyse før valg av felles serverområde

## Formål

`tools/analyze-common-folder-usage.ps1` undersøker om `C:\FTP\SITES\SYSTEM-COMMON` fortsatt er i bruk før eventuell etablering av `C:\FTP\SITES\APPS-COMMON`.

## Hva scriptet undersøker

- om `SYSTEM-COMMON` finnes;
- antall filer og undermapper;
- siste endringstidspunkt;
- tekstlige referanser i Clubsite- og appfiler;
- referanser i IIS `applicationHost.config`;
- eventuelle lesefeil og timeout.

Scriptet viser ikke linjeinnhold, slik at passord og annen konfigurasjon ikke havner i rapporten.

## Begrensning

Manglende tekstreferanser beviser ikke at en mappe er ubrukt. IIS-bindinger, inkluderingsmekanismer, databaseverdier og kjørende prosesser kan referere indirekte. Endelig beslutning bør derfor baseres på rapporten sammen med utviklerens bekreftelse.

## Foreløpig anbefaling

Hvis rapporten viser ingen aktive referanser og utvikler bekrefter at området er historisk, kan `C:\FTP\SITES\APPS-COMMON` brukes. Da bør `SYSTEM-COMMON` beholdes urørt som historisk område til det er tatt backup og formelt avviklet.

## Inventory-funn 2026-08-11

Rapporten `docs/system-common-inventory.txt` viser 1 479 filer og 318 undermapper. Toppnivåområdene er `BLOGADMIN`, `cs4`, `golfbooking` og `libs`, med ASP-kode, Clubsite-funksjoner, adminmoduler og eldre tredjepartsbiblioteker. Filene ser hovedsakelig ut til å være fra 2014–2021.

Dette ser ut som en historisk Clubsite-runtime eller legacy-plattformpakke, ikke et tomt område. Inventory alene beviser likevel ikke om koden fortsatt brukes av aktive IIS-sites.

Oppdatert anbefaling:

1. Ikke slett, flytt eller endre `SYSTEM-COMMON`.
2. Behold det som legacy/read-only inntil IIS-referanser og utviklerens bekreftelse er kontrollert.
3. Ikke legg nye GKIT-appfiler inn der.
4. Bruk heller `C:\FTP\APPS\APPS-COMMON` for nye GKIT-fellesfiler.
5. Bruk `C:\FTP\SITES\APPS-COMMON` bare hvis Classic ASP/IIS inkluderingskrav gjør det nødvendig, og blokker direkte offentlig tilgang.

## Alternativ til punkt 5

Hvis Classic ASP må nå felles kode, skal vi først prøve denne løsningen:

```text
C:\FTP\APPS\APPS-COMMON\
        |
        └── kontrollert IIS Virtual Directory / intern mapping
```

IIS kan da mappe et internt alias til den fysiske mappen uten at vi legger felleskode under `C:\FTP\SITES`. Aliaset skal:

- ikke ha directory browsing;
- ikke servere `.asp`, `.inc`, `.config` eller andre kildefiler som statisk innhold;
- ha minst mulig IIS-/NTFS-tilgang;
- kun brukes av aktuelle tenant-applikasjoner;
- testes med både tillatt og avvist URL før produksjon.

For Classic ASP-kode som ikke kan bruke slik mapping, er tryggeste fallback å deploye en kontrollert kopi av nødvendige include-filer til hver tenantapp:

```text
C:\FTP\SITES\CLUBSITE-4\<TENANT>\FRIVILLIG-APP\_includes\
```

Kopiene skal komme fra `C:\FTP\APPS\APPS-COMMON` gjennom deploy, ikke redigeres manuelt på serveren. På denne måten unngår vi både å bruke legacy `SYSTEM-COMMON` og å gjøre et fellesområde under `SITES` offentlig tilgjengelig.
