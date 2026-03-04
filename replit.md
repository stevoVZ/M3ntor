# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Growth, Creativity, Home, Fun). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) that analyzes user input and suggests how to categorize and structure their tasks.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server that handles AI requests. Data is stored locally on the device using AsyncStorage with optional Supabase cloud sync when authenticated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with expo-router for file-based navigation
- **Navigation**: Tab-based layout with 4 main tabs: Today, My Life, Discover, and Plan. Modal sheets for adding items and viewing item details. Login screen for Supabase auth (optional)
- **State Management**: React Context API (`ItemsProvider` in `lib/store.ts`) wraps the app and provides item CRUD operations, auth state (userId, profile), and Supabase sync to all screens. TanStack React Query is available for server data fetching
- **Local Storage**: `AsyncStorage` (`lib/storage.ts`) persists all item data locally on the device as JSON. When authenticated with Supabase, items are dual-written to both local and remote storage
- **Supabase Integration**: `lib/supabase.ts` provides client initialization (with graceful fallback if not configured), typed query helpers (`fetchItems`, `upsertItem`, `deleteItemRemote`, `upsertStep`, `upsertSubtask`, `fetchJourneyProgress`), and auth via `@supabase/supabase-js`
- **NLP Utilities**: `utils/nlp.ts` provides instant local area suggestion and type inference from text (no API call needed). Used in the Add screen for real-time category suggestions as the user types
- **Date Utilities**: `utils/dates.ts` provides dayjs-powered date formatting helpers (formatDeadline, isOverdue, formatDate, fromNow, todayISO, greetingForTime)
- **Styling**: Plain React Native `StyleSheet` with an iOS design system-inspired color palette (`constants/colors.ts`). Supports light/dark mode via `useColorScheme`
- **Animations**: `react-native-reanimated` for smooth transitions and spring animations. `expo-haptics` for tactile feedback
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **UI Components**: Custom reusable components in `components/ui/` (Button, Badge, Card), `components/items/` (ItemCard, TaskRow, ProgressBar), and `components/add/` (FabActionSheet, ProjectAddSheet)

### Backend Architecture

- **Server**: Express.js (`server/index.ts`) running as a separate Node.js process
- **AI Routes**: 
  - `POST /api/ai/assist` — Main AI assist (area, kind, description, steps, timeOfDay)
  - `POST /api/ai/hint` — Per-kind contextual hint
  - `POST /api/ai/tasks` — Generate project tasks from title/description
  - `POST /api/ai/subtasks` — Break down a step into subtasks
- **CORS**: Configured dynamically for Replit dev/prod domains and localhost
- **Storage Layer**: `server/storage.ts` has an in-memory `MemStorage` class for users (not yet wired to the database in active routes)
- **Build**: Server built with esbuild for production deployment

### Data Models

**Client-side types** (`types/index.ts`):
- `Item`: The core entity with fields for title, description, area, status (`active`, `someday`, `paused`, `done`), recurrence (with rich types: daily, weekdays, specific_days, interval, monthly, weekly), habit_time_of_day (morning, afternoon, evening, anytime), deadline, priority, effort, emoji, user_id, and optional steps array
- `Step`: Sub-tasks within a project item, with blocked_by, assignees, and subtasks arrays
- `Subtask`: Individual sub-items within a step
- `Recurrence`: Rich recurrence type supporting daily, weekdays, specific_days, interval, monthly, and weekly patterns
- `Profile`: User profile with name, avatar_url
- `JourneyProgress`: Tracks user progress through curated journey programs
- Item type (`action`, `habit`, `goal`, `project`) is **derived** from item properties at runtime via the `itemKind()` function, not stored directly

**Server-side schema** (`shared/schema.ts`):
- `users` table with `id`, `username`, `password` — defined with Drizzle ORM for PostgreSQL
- Validation schemas generated with `drizzle-zod`

### AI Integration

- **Provider**: Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Flow**: User types a title in the Add screen → NLP instantly suggests area and type → after 1 second debounce → frontend calls `/api/ai/assist` → Express server calls Claude → returns JSON with suggested area, kind, description, steps, and timeOfDay
- **Additional AI features**: Contextual hints per item kind, project task generation, subtask breakdown
- **Graceful degradation**: If AI call fails, app continues with NLP-based local suggestions

### Routing Structure

```
app/
  _layout.tsx          # Root layout with providers
  login.tsx            # Supabase auth screen (optional)
  (tabs)/
    _layout.tsx        # Tab bar configuration
    today.tsx          # Today's scheduled items
    mylife.tsx         # Items organized by life area
    discover.tsx       # Journey/program discovery
    plan.tsx           # Full item list with filters
  add.tsx              # Add item modal sheet (accepts ?kind= param)
  item/[id].tsx        # Item detail modal sheet
```

### Platform Considerations

- The app targets iOS, Android, and Web. Platform-specific code uses `Platform.OS` checks
- Tab bar uses native iOS tab implementation (`NativeTabs`) when Liquid Glass is available, falls back to classic Expo `Tabs`
- Keyboard handling uses `react-native-keyboard-controller` on native, falls back to standard `ScrollView` on web

## External Dependencies

### Third-Party Services

- **Anthropic Claude API**: Powers the AI assistant feature. Requires `ANTHROPIC_API_KEY` environment variable on the server
- **Supabase**: Cloud database and auth. Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables. App works without Supabase configured (uses local-only storage)
- **PostgreSQL**: Database provisioned for server-side storage. Requires `DATABASE_URL` environment variable. Drizzle ORM manages schema migrations

### Key Libraries

| Library | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `@tanstack/react-query` | Server state management and caching |
| `@supabase/supabase-js` | Supabase client for auth and data persistence |
| `drizzle-orm` + `drizzle-zod` | PostgreSQL ORM and schema validation |
| `@anthropic-ai/sdk` | Claude AI API client |
| `@react-native-async-storage/async-storage` | Local device data persistence |
| `react-native-reanimated` | Animations |
| `expo-haptics` | Haptic feedback |
| `expo-linear-gradient` | Gradient UI elements |
| `expo-blur` | Blur effects (tab bar) |
| `react-native-gesture-handler` | Touch gesture handling |
| `react-native-keyboard-controller` | Keyboard-aware scrolling |
| `expo-image-picker` | Image selection (available, not yet fully wired) |
| `expo-location` | Location access (available) |
| `dayjs` | Date formatting with relative time and isToday/isTomorrow plugins |

### Environment Variables Required

- `ANTHROPIC_API_KEY` — For AI assist feature (server-side)
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (client-side)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (client-side)
- `DATABASE_URL` — PostgreSQL connection string (server-side)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API URL resolution (client-side, set automatically in Replit)
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` — Used for CORS configuration and dev server routing
