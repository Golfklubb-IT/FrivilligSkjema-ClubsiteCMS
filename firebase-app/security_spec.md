# Security Specification: Ski Golfklubb Frivilligsystem

## Data Invariants
1. **Authenticated Submissions**: Users must be signed in with a Google account to sign up as a volunteer.
2. **Email Integrity**: The email address in a volunteer record must match the verified email of the authenticated user.
3. **Immutability of Records**: Once a volunteer form is submitted, it cannot be modified or deleted by the volunteer.
4. **Admin Exclusivity**: Only users explicitly listed in the `/admins/` collection can view the full list of volunteers.
5. **No Self-Admin**: Users cannot add themselves to the `admins` collection.

## The Dirty Dozen Payloads
1. **UnauthWrite**: `{ "name": "Hack", "email": "hacker@evil.com" }` to `/volunteers` without auth. -> `PERMISSION_DENIED`
2. **EmailSpoof**: Authed as `user@gmail.com` but sending email `admin@skigk.no`. -> `PERMISSION_DENIED`
3. **AdminEscalation**: `{ "email": "me@gmail.com" }` to `/admins/my-uid`. -> `PERMISSION_DENIED`
4. **MassivePayload**: `name` string > 256 chars. -> `PERMISSION_DENIED`
5. **ListLeaching**: `getDocs(collection('volunteers'))` as a regular volunteer. -> `PERMISSION_DENIED`
6. **GhostField**: Adding `internalRating: 5` to a volunteer submission. -> `PERMISSION_DENIED` (Strict schema)
7. **UnverifiedEmail**: Signing in with an unverified email. -> `PERMISSION_DENIED`
8. **MaliciousID**: Document ID with 1024 characters. -> `PERMISSION_DENIED`
9. **AnonymousSubmission**: Trying to submit while an anonymous user. -> `PERMISSION_DENIED`
10. **RecordTampering**: Attempting to `update` an existing volunteer record. -> `PERMISSION_DENIED`
11. **AdminBypass**: Trying to read `/admins` without being an admin. -> `PERMISSION_DENIED`
12. **IDPoisoning**: Using `../../` or other restricted strings as ID. -> `PERMISSION_DENIED`
