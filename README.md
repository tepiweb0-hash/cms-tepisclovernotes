# Tepis Clover Notes CMS

Standalone React + Vite CMS for Tepis Clover Notes.

## Stack
- React + TypeScript + Vite
- Firebase Authentication
- Express CMS API on Vercel
- Firestore behind the API
- Cloudinary signed image uploads

## Required Vercel environment variables

```text
VITE_API_BASE_URL=https://api-tepisclovernotes-flame.vercel.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`VITE_FIREBASE_STORAGE_BUCKET` is kept because it is part of the Firebase Web config, but CMS image uploads use Cloudinary rather than Firebase Storage.

## Vercel deployment
- Framework/Application Preset: Vite
- Root Directory: `./`
- Build Command: default (`npm run build`)
- Output Directory: default (`dist`)

`vercel.json` already includes an SPA rewrite so direct URLs such as `/artists` or `/media` work.

## After first CMS deployment
Take the CMS production URL and add it to the API Vercel project as:

```text
CMS_ORIGIN=https://your-cms-domain.vercel.app
```

Then redeploy the API. Without this step, browser API calls will be blocked by CORS.
