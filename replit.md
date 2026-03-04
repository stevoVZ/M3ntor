# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Growth, Creativity, Home, Fun). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) that analyzes user input and suggests how to categorize and structure their tasks.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server that handles AI requests. Data is stored locally on the device using AsyncStorage. Supabase integration is planned for a future session.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with expo-router for file-based navigation
- **Navigation**: Tab-based layout with 4 main tabs: Today, My Life, Discover, and Plan. Modal sheets for adding items and viewing item details
- **State Management**: React Context API (`ItemsProvider` in `lib/store.ts`) wraps the app and provides item CRUD operations to all screens. TanStack React Query is available for server data fetching
- **Local Storage**: `AsyncStorage` (`lib/storage.ts`) persists all item data locally on the device as JSON. No server-side sync for items yet
- **Styling**: Plain React Native `StyleSheet` with an iOS design system-inspired color palette (`constants/colors.ts`). Supports light/dark mode via `useColorScheme`
- **Animations**: `react-native-reanimated` for smooth transitions and spring animations. `expo-haptics` for tactile feedback
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **UI Components**: Custom reusable components in `components/ui/` (Button, Badge, Card) and `components/items/` (ItemCard, TaskRow, ProgressBar)

### Backend Architecture

- **Server**: Express.js (`server/index.ts`) running as a separate Node.js process
- **AI Route**: Single POST endpoint `/api/ai/assist` that accepts a user prompt and returns structured JSON suggestions via Claude
- **CORS**: Configured dynamically for Replit dev/prod domains and localhost
- **Storage Layer**: `server/storage.ts` has an in-memory `MemStorage` class for users (not yet wired to the database in active routes)
- **Build**: Server built with esbuild for production deployment

### Data Models

**Client-side types** (`types/index.ts`):
- `Item`: The core entity with fields for title, description, area, status (`active`, `someday`, `paused`, `done`), recurrence (for habits), deadline, priority, effort, and optional steps array
- `Step`: Sub-tasks within a project item
- Item type (`action`, `habit`, `goal`, `project`) is **derived** from item properties at runtime via the `itemKind()` function, not stored directly

**Server-side schema** (`shared/schema.ts`):
- `users` table with `id`, `username`, `password` — defined with Drizzle ORM for PostgreSQL
- Validation schemas generated with `drizzle-zod`

### AI Integration

- **Provider**: Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Flow**: User types a title in the Add screen → after 1 second debounce → frontend calls `/api/ai/assist` → Express server calls Claude with a structured system prompt → returns JSON with suggested area, kind, description, steps, and timeOfDay
- **Graceful degradation**: If AI call fails, app continues without suggestions (returns empty object)

### Routing Structure

```
app/
  _layout.tsx          # Root layout with providers
  (tabs)/
    _layout.tsx        # Tab bar configuration
    today.tsx          # Today's scheduled items
    mylife.tsx         # Items organized by life area
    discover.tsx       # Journey/program discovery
    plan.tsx           # Full item list with filters
  add.tsx              # Add item modal sheet
  item/[id].tsx        # Item detail modal sheet
```

### Platform Considerations

- The app targets iOS, Android, and Web. Platform-specific code uses `Platform.OS` checks
- Tab bar uses native iOS tab implementation (`NativeTabs`) when Liquid Glass is available, falls back to classic Expo `Tabs`
- Keyboard handling uses `react-native-keyboard-controller` on native, falls back to standard `ScrollView` on web

## External Dependencies

### Third-Party Services

- **Anthropic Claude API**: Powers the AI assistant feature. Requires `ANTHROPIC_API_KEY` environment variable on the server
- **PostgreSQL**: Database provisioned for server-side storage. Requires `DATABASE_URL` environment variable. Drizzle ORM manages schema migrations

### Key Libraries

| Library | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `@tanstack/react-query` | Server state management and caching |
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
| `dayjs` | Date formatting |

### Environment Variables Required

- `ANTHROPIC_API_KEY` — For AI assist feature (server-side)
- `DATABASE_URL` — PostgreSQL connection string (server-side)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API URL resolution (client-side, set automatically in Replit)
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` — Used for CORS configuration and dev server routing