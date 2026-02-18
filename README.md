# NebulaGP

NebulaGP is a browser-based, zero-gravity racing game built with Next.js, React Three Fiber, and Three.js. The current app combines a cinematic home scene, playable race stages, Firebase-backed authentication, and leaderboard persistence.

## Current Application State

### What is currently implemented

- **Playable content:**
  - Stage 1 race mode (`/stages/stage1`)
  - Stage 1 time-trial mode (`/stages/stage1/time-trial`)
- **3D experience:**
  - WebGL-backed home scene with planets, stars, and scroll-reactive camera motion
  - In-race 3D scene with track, ship flight, skyboxes, particle effects, and HUD
- **Race systems:**
  - Lap/checkpoint progression
  - Bot opponents (race mode)
  - Time capture and leaderboard display
- **Account systems:**
  - Firebase Authentication-backed user session flow
  - Dashboard with profile/stats/achievements modules
- **Platform features:**
  - PWA manifest + install prompt support
  - Basic service worker registration
  - Cross-origin isolation headers for SharedArrayBuffer-compatible worker usage
  - Mobile controls and orientation handling components

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Rendering:** React 19 + React Three Fiber + Three.js
- **State:** Zustand
- **Physics:** @react-three/rapier (in selected controllers)
- **Backend services:** Firebase (Auth, Firestore, Admin SDK routes)
- **Styling:** CSS / SCSS modules
- **Language:** TypeScript

## Repository Layout (high-level)

```text
app/
  api/                  # Session, users, and records API routes
  Components/           # 3D scene objects, HUD, UI, auth, audio, dashboard
  Controllers/          # Game, settings, user, audio, records, collision stores/hooks
  Lib/                  # Firebase setup, track definitions, utilities
  stages/stage1/        # Stage 1 race + time trial pages
public/
  models/               # GLB models
  textures/             # Track/planet/skybox textures
  sound/                # Music + SFX assets
  manifest.json         # PWA manifest
  sw.js                 # Service worker
```

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file in the project root.

```bash
# Firebase client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase App Check
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG=false

# Firebase Admin SDK (JSON stringified service account)
FIREBASE_ADMIN_KEY=
```

### 3) Run the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Available Scripts

- `npm run dev` – start dev server (Turbopack)
- `npm run build` – production build
- `npm run start` – run production server
- `npm run lint` – run Next.js linting
- `npm run format` – format repo with Prettier

## API Endpoints

- `POST /api/session` – validate Firebase ID token and set HTTP-only auth cookie
- `DELETE /api/session` – clear session cookie
- `POST /api/users` – create user account + user document
- `GET /api/users?uid=...` – fetch user profile
- `PUT /api/users?uid=...` – update auth/profile fields
- `DELETE /api/users?uid=...` – delete user
- `POST /api/records` – submit race record
- `GET /api/records` – list records (supports `userId`, `trackId` filters)
- `PUT /api/records?id=...` – update record
- `DELETE /api/records?id=...` – delete record

## Areas for Improvement

Based on the current codebase state, these are the highest-value improvements:

1. **Consolidate Next.js config files**
   - Both `next.config.mjs` and `next.config.ts` exist with overlapping behavior. Keeping one canonical config will reduce ambiguity during builds.

2. **Improve service worker strategy**
   - `public/sw.js` is currently a pass-through fetch handler. Introducing an explicit caching/offline strategy would make the PWA implementation more meaningful.

3. **Harden API validation and typing**
   - The route handlers accept broad payloads and include repeated `any`-typed error handling. Shared schemas (e.g., Zod) and typed response contracts would improve reliability.

4. **Add automated test coverage**
   - There is currently no configured unit/integration/e2e test suite in scripts. Core utilities, stores, and API routes would benefit from baseline test coverage.

5. **Reduce duplicated stage scene logic**
   - Stage 1 race and Stage 1 time-trial pages duplicate significant scene setup code. Extracting shared stage composition would simplify maintenance.

6. **Document operational requirements**
   - Runtime requirements such as Firebase credentials, App Check expectations, and race/records data shape should stay documented as the app evolves.

## Notes

- Additional Rust/WASM setup guidance lives in `INSTALL_RUST.md`.
- Audio, installability, and account/dashboard functionality are implemented in-app and surfaced through the top navigation and modals.
