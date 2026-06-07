# SilverPay Android APK (from web app)

**App icon (SP mark):** `silverpaysplogo.png` at repo root → `cd app && npm run icons` for PWA / APK / home screen. App UI uses text branding (SilverPay).

The user app is a **PWA**. You can:

1. **Install from browser** — Profile → *Install app* (Chrome Android).
2. **Download APK** — Profile → *Download APK* (`/silverpay-release.apk`).

## Generate APK (Bubblewrap / TWA)

1. Deploy the **user app** first (HTTPS required), e.g. Railway `app` service.
2. Install **JDK 17** and **Android SDK** (Android Studio command-line tools).
3. From `app/` folder:

```bash
APP_URL=https://YOUR-APP.up.railway.app npm run build:apk
```

This creates `app/android-twa/` and copies the release APK to:

- `app/public/silverpay.apk` — served at `https://your-app/silverpay.apk`
- `app/dist/silverpay.apk` — included in production build

4. Redeploy the app service so users can download the APK.

## Host APK elsewhere (optional)

Set on Railway **app** service:

```env
VITE_APK_DOWNLOAD_URL=https://cdn.example.com/silverpay.apk
```

Rebuild/redeploy the app.

## Without Android SDK (recommended)

From `app/` with live HTTPS URL:

```bash
APP_URL=https://silverpay.live npm run build:apk:cloud
```

This calls PWABuilder cloud with **signed** APK (`signingMode: new`) and also writes:

- `app/public/silverpay-release.apk` — installable signed APK
- `app/public/.well-known/assetlinks.json` — required for TWA (full-screen app, not browser tab)

Commit both files + redeploy the app service.

**Important:** Unsigned APK (`signingMode: none`) will **not install** on most Android phones.

Or use [PWABuilder](https://www.pwabuilder.com/) manually:

1. Enter your live app URL.
2. Package for Android → download APK.
3. Upload as `app/public/silverpay.apk` and redeploy.
