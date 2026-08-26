<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This Firebase source is maintained under `firebase-app/` in the
`FrivilligSkjema-ClubsiteCMS` repository. The three Hosting targets are
`demo`, `klubb` and `skigk`, all in the `frivillig-kalendar-klubb` project.

Production Hosting is deliberately unchanged until the admin preview has been
tested with real Firebase Authentication and tenant-scoped admin records.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2f6dd5bf-36d1-4730-8016-77d46c933f89

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) only for local development
3. Run the app:
   `npm run dev`
