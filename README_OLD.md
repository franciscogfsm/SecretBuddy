# SecretBuddy – Early Technical Prototype

This repo currently contains:

- `app/` – Expo React Native project targeting iOS-first launch with placeholder UI flows.
- `server/` – Lightweight Express API stub for prompts and daily matches.
- `docs/` – Product requirements, experience guidelines, and roadmap.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Xcode (for iOS simulator) or Android Studio (for Android emulator)
- Expo CLI (`npm install -g expo-cli`) suggested for easier device testing

### Mobile App (Expo)

```powershell
cd app
npm install
npm run start
# Press i for iOS simulator or scan the QR code with Expo Go.
```

Additional scripts:

- `npm run typecheck` – TypeScript validation (currently clean)
- `npm run lint` – ESLint with Expo presets
- `npm run test` – Placeholder Jest command (tests not yet added)

### Backend Stub (Express + TypeScript)

```powershell
cd server
npm install
npm run dev
# API available at http://localhost:4000
```

Endpoints:

- `GET /health` – service health check
- `GET /prompts/today` – returns the current prompt mock
- `GET /matches/today` – returns mock match info
- `POST /matches/today/decision` – accepts `{ "decision": "continue" | "pass" }`

Build command:

```powershell
npm run build
```

## Current App Screens

- **Onboarding** – collects name, age, country, and game mode.
- **Home** – displays today’s prompt, mystery buddy card, and streak/points summary.
- **Reveal Modal** – timed decision mock for nightly reveal.
- **Matches, Points, Profile Tabs** – placeholder content reflecting future features.

Animations, camera capture, notifications, and backend integration are not yet implemented.

## Next Implementation Steps

1. Hook the app to the backend stub (fetch prompt, match, submit decisions).
2. Add media capture flow with selfie detection spike.
3. Implement emoji picker and video upload UI.
4. Persist onboarding profile using SecureStore + async storage fallback.
5. Build moderation/reporting flows and integrate analytics instrumentation.
