# IIS session check

## Formål

Tester om `Session("userID")` fra Clubsite-brukerlogin er tilgjengelig fra en
ny virtuell mappe under samme Clubsite-site.

## Deploytest

1. Kopier `clubsite-session-check.asp` til en midlertidig mappe under riktig
   tenant, for eksempel:

   `C:\FTP\SITES\CLUBSITE-4\SKI\frivillig-test\`

2. Gjør mappen tilgjengelig som virtuell mappe under samme IIS-site, for
   eksempel `/frivillig-test`.
3. Logg inn som vanlig Clubsite-bruker.
4. Åpne:

   `https://<tenant-domene>/frivillig-test/clubsite-session-check.asp`

5. Siden skal vise at `Session("userID")` finnes.

## Tolkning

- **OK:** Den nye mappen deler Clubsite-session og kan bygges videre som IIS-integrasjon.
- **IKKE LOGGET INN:** Mappen deler ikke session, eller brukeren er ikke logget inn.

Testfilen skal fjernes etter verifisering. Den viser ikke selve bruker-ID-en.
