# CareDose AI — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod 3 (`zod`), `drizzle-zod`
- **Build**: esbuild (ESM bundle)
- **Mobile**: Expo React Native + TypeScript
- **State**: Zustand + TanStack Query

## Project Goal

CareDose AI is a production-grade SaaS mobile app for smart medicine management targeting elderly patients:
- AI-powered voice call reminders via Twilio
- Medicine adherence tracking with percentage stats
- Family monitoring dashboard
- OCR prescription scanning with OpenAI LLM parsing
- BullMQ scheduler (requires Redis/Upstash)

## Structure

```text
workspace/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/
│   │   │   ├── controllers/ # auth, patients, medicines, logs, ai
│   │   │   ├── routes/      # index.ts mounts all routes
│   │   │   ├── services/    # twilio.service.ts, openai.service.ts
│   │   │   ├── queues/      # scheduler.ts (BullMQ, conditional on REDIS_URL)
│   │   │   ├── middlewares/ # authenticate.ts (JWT)
│   │   │   └── utils/       # auth.ts (bcryptjs + JWT)
│   │   └── build.mjs        # esbuild config
│   ├── caredose/            # Expo React Native mobile app
│   │   ├── app/             # Expo Router screens
│   │   │   ├── _layout.tsx  # Root layout (fonts, auth redirect, QueryClient)
│   │   │   ├── index.tsx    # Redirect (authenticated → tabs, else → onboarding)
│   │   │   ├── onboarding.tsx  # 4-slide onboarding carousel
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx   # Tab navigation (native or classic)
│   │   │   │   ├── index.tsx     # Dashboard (adherence ring + doses)
│   │   │   │   ├── activity.tsx  # Activity timeline / logs
│   │   │   │   └── profile.tsx   # Settings and user profile
│   │   │   └── patients/
│   │   │       ├── add.tsx         # Add patient form
│   │   │       ├── add-medicine.tsx # Add medicine schedule
│   │   │       ├── prescription.tsx # AI prescription scanner
│   │   │       ├── medicines.tsx   # Medicine list management
│   │   │       └── list.tsx        # Patient list and selector
│   │   ├── components/
│   │   │   ├── AdherenceRing.tsx   # SVG circular progress ring
│   │   │   ├── MedicineDoseCard.tsx # Dose card with status + actions
│   │   │   ├── PatientAvatar.tsx   # Color-coded initials avatar
│   │   │   └── ErrorBoundary.tsx
│   │   ├── constants/
│   │   │   └── colors.ts    # Design system colors
│   │   ├── store/
│   │   │   ├── authStore.ts    # Zustand auth (JWT + AsyncStorage persist)
│   │   │   └── patientStore.ts # Selected patient state
│   │   └── lib/
│   │       └── api.ts         # Typed API client (fetch + auth header)
│   └── mockup-sandbox/     # Vite component preview server
├── lib/
│   ├── api-spec/           # OpenAPI spec
│   ├── db/                 # Drizzle ORM schema + DB connection
│   │   └── src/schema/     # users, patients, medicines, activity_logs
│   └── ...
└── pnpm-workspace.yaml
```

## Environment Variables

### API Server (required for full functionality)
- `DATABASE_URL` — PostgreSQL URL (auto-provided by Replit)
- `SESSION_SECRET` / `JWT_SECRET` — JWT signing secret
- `TWILIO_ACCOUNT_SID` — for voice call reminders
- `TWILIO_AUTH_TOKEN` — for voice call reminders
- `TWILIO_PHONE_NUMBER` — Twilio phone number
- `OPENAI_API_KEY` — for prescription parsing (falls back to mock)
- `REDIS_URL` or `UPSTASH_REDIS_REST_URL` — for BullMQ scheduler (optional)
- `UPSTASH_REDIS_REST_TOKEN` — if using Upstash

### Mobile (Expo)
- `EXPO_PUBLIC_DOMAIN` — API server domain (auto-set in workflow)

## API Routes

All routes under `/api`:
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /patients`, `POST /patients`, `GET/PUT/DELETE /patients/:id`
- `GET /patients/:id/dashboard` — adherence ring + today's doses
- `GET /patients/:id/logs` — activity timeline
- `GET/POST /patients/:id/medicines`, `PUT/DELETE /patients/:id/medicines/:id`
- `PATCH /logs/:id/status` — mark taken/missed
- `POST /ai/parse-prescription` — OCR + AI extraction

## Color System

- Green `#10B981` = Taken
- Red `#EF4444` = Missed
- Yellow `#F59E0B` = Pending

## Development Commands

```bash
# Start API server dev
pnpm --filter @workspace/api-server run dev

# Start Expo app
pnpm --filter @workspace/caredose run dev

# Push DB schema
pnpm --filter @workspace/db run push

# Build API server
pnpm --filter @workspace/api-server run build
```

## Key Design Decisions

- `zod/v4` imports were changed to `zod` (Zod v3 installed)
- Zod `.email()` standalone changed to `.string().email()`
- BullMQ scheduler is conditional — gracefully disabled without Redis
- `isLiquidGlassAvailable()` used to toggle iOS 26 NativeTabs vs classic Tabs
- `onSuccess` in TanStack Query v5 removed; replaced with `useEffect`
