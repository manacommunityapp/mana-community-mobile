# Mana Community — Mobile App

React Native (Expo) mobile app for Android & iOS.  
Connects to the same Spring Boot backend used by the web app.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | React Native + Expo SDK 52          |
| Navigation   | Expo Router (file-based)            |
| State        | Zustand + TanStack Query            |
| HTTP Client  | Axios with JWT auto-refresh         |
| WebSocket    | @stomp/stompjs (same as web)        |
| Secure Store | expo-secure-store (replaces localStorage) |
| Build & Ship | EAS Build + EAS Submit              |

---

## Project Structure

```
mana-community-mobile/
├── app/
│   ├── _layout.tsx          # Root layout — auth guard, QueryClient, SplashScreen
│   ├── auth/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── tabs/
│       ├── _layout.tsx      # Bottom tab navigator
│       ├── feed.tsx         # Community feed
│       ├── events.tsx       # Events + RSVP
│       ├── sports.tsx       # Sports hub
│       ├── chat.tsx         # Conversations list
│       └── profile.tsx      # Profile + settings
├── services/
│   ├── apiClient.ts         # Axios instance + JWT interceptor + auto-refresh
│   ├── authService.ts
│   ├── feedService.ts
│   └── chatService.ts
├── hooks/
│   ├── useAuth.ts           # Zustand auth store
│   └── useWebSocket.ts      # STOMP WebSocket hook
├── types/
│   └── api.ts               # TypeScript DTOs (mirrors Spring Boot responses)
├── constants/
│   └── config.ts            # API URLs, theme colours
├── app.json                 # Expo configuration
└── eas.json                 # EAS Build configuration
```

---

## 1 — Local Development Setup

### Prerequisites
- Node.js 22+
- Expo Go app on your phone (iOS / Android) — [expo.dev/go](https://expo.dev/go)
- Or: iOS Simulator (Mac + Xcode) / Android Emulator (Android Studio)

### Install

```bash
npm install
```

### Configure API URL

Edit `constants/config.ts`:

```ts
const DEV_API_URL = 'http://YOUR_LOCAL_IP:8082';
// e.g. 'http://192.168.1.42:8082'
```

> Use your machine's local IP, not `localhost` — phones can't reach localhost.  
> Find it with: `ipconfig` (Windows) or `ifconfig | grep inet` (Mac/Linux)

### Run

```bash
npm start          # Opens Expo dev tools — scan QR with Expo Go
npm run ios        # iOS Simulator (Mac only)
npm run android    # Android Emulator
```

---

## 2 — Backend CORS (Spring Boot)

Add your local IP and production mobile origin to Spring Boot's CORS config:

```java
// SecurityConfig.java or CorsConfig.java
configuration.setAllowedOrigins(List.of(
  "http://localhost:5173",             // web dev
  "https://manacommunity.in",          // web prod
  "http://192.168.1.42:8082",          // mobile dev (your local IP)
  "capacitor://localhost",             // Capacitor origin if used
  "https://localhost"                  // Expo Go
));
```

---

## 3 — Building for App Stores (EAS)

### One-time EAS setup

```bash
npm install -g eas-cli
eas login
eas build:configure   # generates eas.json, links to Expo account
```

### Build

```bash
# Android APK (internal testing)
eas build --platform android --profile preview

# iOS TestFlight
eas build --platform ios --profile production

# Both platforms
eas build --platform all --profile production
```

### Submit to stores

```bash
eas submit --platform android
eas submit --platform ios
```

---

## 4 — Push Notifications (Expo Push + Spring Boot)

### Mobile side — register device token

```ts
import * as Notifications from 'expo-notifications';
import { authService } from '@/services/authService';

const { data: token } = await Notifications.getExpoPushTokenAsync();
await api.post('/users/push-token', { token: token.data, platform: Platform.OS });
```

### Backend side — send via Expo Push API

```java
// Add to your NotificationService.java
// POST https://exp.host/--/api/v2/push/send
// { "to": "ExponentPushToken[xxx]", "title": "...", "body": "..." }
```

---

## 5 — GitHub Repository Setup

```bash
# 1. Create the repo on GitHub (via website or GitHub CLI)
gh repo create YOUR_ORG/mana-community-mobile --private

# 2. Initialise git and push
git init
git add .
git commit -m "feat: initial React Native Expo scaffold"
git remote add origin https://github.com/YOUR_ORG/mana-community-mobile.git
git branch -M main
git push -u origin main
```

### Recommended branch strategy (mirrors your web repo)
```
main       ← production builds (App Store / Play Store)
develop    ← integration branch
feature/*  ← feature branches
```

---

## 6 — Environment Variables

Create `.env` (not committed — already in .gitignore):

```env
EXPO_PUBLIC_API_URL=https://api.manacommunity.in
EXPO_PUBLIC_WS_URL=wss://api.manacommunity.in/ws
```

Access in code: `process.env.EXPO_PUBLIC_API_URL`

---

## Screens Roadmap

| Screen              | Status      |
|---------------------|-------------|
| Login               | ✅ Done     |
| Register            | ✅ Done     |
| Forgot Password     | ✅ Done     |
| Community Feed      | ✅ Done     |
| Events + RSVP       | ✅ Done     |
| Sports Hub          | ✅ Done     |
| Chat List           | ✅ Done     |
| Chat Window         | 🔜 Next     |
| Profile             | ✅ Done     |
| Edit Profile        | 🔜 Next     |
| Notifications       | 🔜 Next     |
| Marketplace         | 🔜 Next     |
| Auction (live)      | 🔜 Next     |
| Admin Panel         | 🔜 Next     |
