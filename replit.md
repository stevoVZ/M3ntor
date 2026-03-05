# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Learning, Fun, Home, Spirituality, Life Tasks). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) for contextual hints, project task generation, and subtask breakdown.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server. AI calls go directly from the client to Anthropic (no server proxy). Data persistence uses Zustand for local state with optional Supabase cloud sync when authenticated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with expo-router for file-based navigation
- **Navigation**: Tab-based layout with 4 main tabs: Today, My Life, Discover, and Plan. Modal sheets for adding items and viewing item details. Login screen for Supabase auth (optional)
- **State Management**: Zustand store (`lib/store.ts`) provides item CRUD operations, auth state (userId, profile), Supabase sync, and derived selectors (activeItems, pausedItems, somedayItems, projectItems, habitItems, actionItems, itemsByArea, getItem)
- **Supabase Integration**: `lib/supabase.ts` provides client initialization with graceful fallback if not configured (exports `isSupabaseConfigured` flag), typed query helpers (`fetchItems`, `upsertItem`, `deleteItem`, `upsertStep`, `upsertSubtask`, `fetchJourneyProgress`), and auth via `@supabase/supabase-js`
- **NLP Utilities**: `utils/nlp.ts` provides instant local area suggestion and type inference from text
- **Date Utilities**: `utils/dates.ts` provides dayjs-powered date formatting helpers
- **Item Utilities**: `utils/items.ts` provides `itemKind()` (derive type from properties), `createItem()` and `createStep()` factories, progress calculations, recurrence helpers
- **Design System**: `constants/theme.ts` exports `T` (colors/tokens), `S` (spacing), `F` (font sizes), `R` (border radii), `shadow` (platform shadows). Legacy `constants/colors.ts` still exists and is used by older UI components
- **Config**: `constants/config.ts` exports `ITEM_AREAS` (Record<string, {n,c,e}>), `AREAS` (10 Wheel of Life areas with id, name, color, score, icon, description), `KIND_CONFIG`, `PRIORITY`, `EFFORT`, `STEP_STATUS`, `PRG` (journey catalog). Also exports `normalizeAreaId()`, `resolveArea()`, `scoreLabel()`, `scoreTier()` for bridging between ITEM_AREAS and AREAS systems
- **Animations**: `react-native-reanimated` for smooth transitions and spring animations. `expo-haptics` for tactile feedback
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **UI Components**: Custom reusable components in `components/ui/` (Button, Card), `components/items/` (ItemCard, TaskRow, ProgressBar), `components/add/` (FabActionSheet, ProjectAddSheet), `components/WheelOfLife.tsx` (SVG Wheel of Life visualization using react-native-svg), `components/WheelAreaDetail.tsx` (tappable area detail panel)

### Backend Architecture

- **Server**: Express.js (`server/index.ts`) running as a separate Node.js process on port 5000
- **CORS**: Configured dynamically for Replit dev/prod domains and localhost
- **Storage Layer**: `server/storage.ts` has an in-memory `MemStorage` class
- **Build**: Server built with esbuild for production deployment

### AI Integration

- **Provider**: Anthropic Claude (`claude-sonnet-4-5`) via `@anthropic-ai/sdk` — called directly from the client
- **Client-side AI module**: `lib/ai.ts` exports `aiAssist()`, `getItemHint()`, `generateProjectTasks()`, `generateSubtasks()`
- **Env var**: Requires `EXPO_PUBLIC_ANTHROPIC_KEY` on the client (not server-side)
- **Graceful degradation**: All AI functions catch errors and return safe defaults

### Data Models

**Client-side types** (`types/index.ts`):
- `Item`: Core entity with title, description, area, status, recurrence, habit_time_of_day, deadline, priority, effort, emoji, user_id, steps array
- `Step`: Sub-tasks within a project item, with blocked_by, assignees, subtasks
- `Subtask`: Individual sub-items within a step
- `Recurrence`: Supports daily, weekdays, specific_days, interval, monthly
- `Profile`: User profile with name, avatar_url
- `JourneyProgress`: Tracks user progress through curated journey programs
- `Journey`: Static catalog entry for expert-curated programs
- Item type is **derived** from properties at runtime via `itemKind()`

### Routing Structure

```
app/
  _layout.tsx          # Root layout with Zustand store, Supabase auth
  login.tsx            # Supabase auth screen
  (tabs)/
    _layout.tsx        # Tab bar configuration
    index.tsx          # Redirects to today
    today.tsx          # Today's active items
    mylife.tsx         # My Life — Wheel of Life SVG visualization, area scoring, glass-card design, insight cards
    discover.tsx       # Journey/program discovery
    plan.tsx           # Full item list with filters
  add.tsx              # Add item modal sheet
  item/[id].tsx        # Item detail modal sheet
```

### Platform Considerations

- The app targets iOS, Android, and Web
- Tab bar uses native iOS tab implementation when Liquid Glass is available, falls back to classic Expo Tabs

## External Dependencies

### Third-Party Services

- **Anthropic Claude API**: Powers AI features. Requires `EXPO_PUBLIC_ANTHROPIC_KEY` environment variable (client-side)
- **Supabase**: Cloud database and auth. Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. App works without Supabase configured (uses local-only Zustand state)

### Key Libraries

| Library | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `zustand` | Client state management |
| `@supabase/supabase-js` | Supabase client for auth and data persistence |
| `@anthropic-ai/sdk` | Claude AI API client (direct from client) |
| `@shopify/flash-list` | High-performance list rendering |
| `expo-secure-store` | Secure credential storage |
| `@react-native-async-storage/async-storage` | Local device data persistence |
| `react-native-reanimated` | Animations |
| `expo-haptics` | Haptic feedback |
| `expo-linear-gradient` | Gradient UI elements |
| `react-native-gesture-handler` | Touch gesture handling |
| `dayjs` | Date formatting |

### Environment Variables

- `EXPO_PUBLIC_ANTHROPIC_KEY` — Anthropic API key for AI features (client-side)
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (client-side, optional)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (client-side, optional)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API URL resolution (set automatically in Replit)

### Database Setup

The Supabase schema is defined in `supabase-schema.sql`. It creates:
- `profiles` — auto-created via trigger on signup (uses `SET search_path = public` for proper permissions)
- `items` — core entity with steps/subtasks nested queries
- `steps` — project sub-tasks
- `subtasks` — individual items within steps
- `journey_progress` — tracks user journey enrollment

All tables have Row Level Security (RLS) policies ensuring users can only access their own data. Realtime subscriptions are enabled for items, steps, and subtasks.
