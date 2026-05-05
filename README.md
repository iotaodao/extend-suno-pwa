# Extend · Suno

Production-grade PWA + Android app for the Suno API v5.5 extend workflow.
Built with **Vite + React + Tailwind**, packaged as an installable PWA via
`vite-plugin-pwa` and as a native Android app via **Capacitor**.

---

## Stack

| Layer       | Tech                                    |
| ----------- | --------------------------------------- |
| Build       | Vite 5                                  |
| UI          | React 18 + Tailwind CSS 3 + lucide-react |
| PWA         | vite-plugin-pwa (Workbox)               |
| Storage     | IndexedDB (history, queue, settings)    |
| Android     | Capacitor 6 (Filesystem, Share, Toast, StatusBar, SplashScreen) |
| API         | sunoapi.org `/generate/extend` + `/generate/upload-extend` + `/file-stream-upload` |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (PWA active in dev too)
npm run dev
# → http://localhost:5173

# 3. Build for production
npm run build
npm run preview      # local preview of built bundle

# 4. Deploy /dist to any static host (Cloudflare Pages, Vercel, Netlify, Dokploy, S3+CloudFront)
```

The PWA is fully functional: install prompt on Android Chrome / Edge / desktop
Chromium, offline shell, audio-result caching, and background-sync queue for
submissions made offline.

---

## Android (Capacitor)

### One-time setup

```bash
# 1. Build the web bundle
npm run build

# 2. Add Android platform (creates ./android folder)
npm run android:init

# 3. Open in Android Studio
npm run android:open
```

Android Studio will prompt to install Gradle / Android SDK if missing.
Minimum: **Android Studio Hedgehog** + **Android SDK 34** + JDK 17.

### Daily workflow

```bash
# Sync changes from /dist into /android
npm run android:sync

# Build and run on device or emulator
npm run android:run
```

### Build a release APK / AAB

```bash
npm run android:build
# Produces android/app/build/outputs/apk/release/app-release-unsigned.apk
```

To sign and produce a Play-Store-ready `.aab`:

1. Create a keystore: `keytool -genkey -v -keystore release.keystore -alias suno -keyalg RSA -keysize 2048 -validity 10000`
2. In Android Studio: `Build → Generate Signed Bundle / APK → Android App Bundle`
3. Upload the resulting `.aab` to Google Play Console.

---

## Project structure

```
extend-suno-pwa/
├── public/
│   ├── icons/                 # PWA + Android adaptive icons (auto-generated)
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── maskable-192.png
│   │   ├── maskable-512.png
│   │   ├── apple-touch-icon.png
│   │   ├── splash-2732.png    # Capacitor splash
│   │   └── screenshot-{wide,narrow}.png
│   └── favicon.svg
├── src/
│   ├── App.jsx                # Main app, connects everything
│   ├── main.jsx               # Entry: SW + native init
│   ├── index.css              # Tailwind base + global animations
│   ├── components/
│   │   ├── UI.jsx             # Primitives: Input, Select, Slider, Timeline, Waveform
│   │   ├── UploadPanel.jsx    # Drag-drop + upload progress + states
│   │   ├── SongCard.jsx       # Result audio card with native share/save
│   │   └── Banners.jsx        # Install / Update / Offline / Toast banners
│   ├── lib/
│   │   ├── api.js             # Suno API client + queue replay
│   │   ├── storage.js         # IndexedDB wrappers
│   │   ├── native.js          # Capacitor abstractions w/ web fallbacks
│   │   ├── sw-register.js     # Service worker registration (Workbox)
│   │   └── theme.js           # Color tokens, formatters
│   └── hooks/
│       ├── useNetworkStatus.js
│       ├── useInstallPrompt.js
│       ├── useUpdatePrompt.js
│       └── useShareTarget.js
├── index.html                 # Splash screen + meta tags
├── vite.config.js             # PWA manifest + Workbox runtime caching
├── tailwind.config.js
├── postcss.config.js
├── capacitor.config.ts        # Android wrapper config
└── package.json
```

---

## PWA features

### Manifest

- **Standalone display** — launches without browser chrome
- **Theme color** `#070F1F` matches header / status bar
- **Maskable icons** for Android adaptive icon system
- **Shortcuts** — long-press app icon for "New extension"
- **Share target** — appears in OS share sheet for audio files; received files
  open the upload tab pre-filled

### Service worker (Workbox)

| Asset type            | Strategy           | Cache TTL     |
| --------------------- | ------------------ | ------------- |
| App shell (JS/CSS)    | Precache           | until update  |
| Google Fonts          | Stale-while-revalidate / Cache-first | 1 year |
| Suno audio results    | **Cache-first** with range-request support for seeking | 14 days (matches Suno retention) |
| Cover images / SVGs   | Stale-while-revalidate | 30 days     |
| API status (record-info) | Network-first w/ 8s timeout | 1 hour |

### Background sync

When the user submits a job offline, the request is stored in an IndexedDB
queue. As soon as `online` event fires, the queue is replayed against the
real API and any successful tasks are added to history. The user sees a toast
showing how many submissions were replayed.

### Update flow

When a new service worker version is detected, the user gets a non-blocking
banner with a "reload" button. Clicking it triggers `skipWaiting`, the new SW
takes control, and the page reloads with the new code.

---

## Native Android features

| Feature             | Implementation                                          |
| ------------------- | ------------------------------------------------------- |
| Splash screen       | `@capacitor/splash-screen` with brand-aligned image    |
| Status bar          | `@capacitor/status-bar` set to dark navy `#070F1F`     |
| Hardware back       | `@capacitor/app` with smart routing (history → exit)   |
| Native share        | `@capacitor/share` for OS share sheet                  |
| File save           | `@capacitor/filesystem` writes to `Documents/Extend-Suno/` |
| Toast notifications | `@capacitor/toast` (graceful web fallback)             |

All native APIs are abstracted in `src/lib/native.js` with `isNativePlatform()`
checks, so the same component code runs on both web and Android. No platform
forks in components.

---

## API integration

The app talks to two services:

### File upload (own audio)

```
POST https://sunoapiorg.redpandaai.co/api/file-stream-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Returns `{ data: { fileUrl, fileId, expiresAt, ... } }`. Files retained 3 days.

### Music extension

```
POST https://api.sunoapi.org/api/v1/generate/extend         # existing audioId
POST https://api.sunoapi.org/api/v1/generate/upload-extend  # uploaded file URL
GET  https://api.sunoapi.org/api/v1/generate/record-info    # poll status
```

The choice between `extend` and `upload-extend` is determined by the source
tab in the UI. The API client handles both transparently.

---

## Customization

### Branding

All colors live in `src/lib/theme.js` (mirrored in `tailwind.config.js`).
Swap the navy/blue tokens to rebrand the entire app.

### Icons

Re-run `python /home/claude/gen_icons.py` after editing the source SVG (or
replace files in `public/icons/` with your own). For best Android adaptive
icon results, keep the safe zone (inner 80%) free of important content in
maskable variants.

### Endpoints

If sunoapi.org changes URLs, edit `src/lib/api.js` `API.GEN` and `API.UPLOAD`.
All HTTP calls go through this one module.

---

## Production deployment checklist

- [ ] Set proper `callBackUrl` to your backend webhook handler
- [ ] Replace the demo URL `webhook.site/your-unique-id` example
- [ ] Configure HTTPS on the host (required for PWA install + service worker)
- [ ] Verify `manifest.webmanifest` is served with `application/manifest+json`
- [ ] For Android Play Store: digital asset links file at
      `/.well-known/assetlinks.json` if you also distribute as TWA
- [ ] Add Sentry / analytics if needed (none included by default for privacy)

---

## License

MIT — feel free to adapt.
