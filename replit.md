# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Learning, Fun, Home, Spirituality, Life Tasks). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) for contextual hints, project task generation, subtask breakdown, journey recommendations, and custom program building.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server. AI calls go directly from the client to Anthropic (no server proxy). Data persistence uses Zustand for local state with optional Supabase cloud sync when authenticated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with expo-router for file-based navigation
- **Navigation**: Tab-based layout with 4 main tabs: Today, My Life, Discover, and Plan. Modal sheets for adding items and viewing item details. Login screen for Supabase auth (optional)
- **State Management**: Zustand store (`lib/store.ts`) provides item CRUD, auth state, journey progress, completion/mood logging, streak tracking, pause/resume/complete/activate actions, step/subtask management (including `reorderStep`, `reorderSubtask` for up/down reordering), item reordering (`reorderItem` with optional scope filtering), and derived selectors. Journey enrollment (`enrollJourney`) creates both a `JourneyProgress` entry and a synthetic `Item` with `source: 'journey'` so journeys are navigable via `/item/[id]`. On store initialization, synthetic items are auto-created for any enrolled journeys missing them. Subtask operations (toggle, add) sync to Supabase via `upsertSubtask`.
- **Supabase Integration**: `lib/supabase.ts` provides client initialization with graceful fallback if not configured
- **NLP Utilities**: `utils/nlp.ts` provides instant local area suggestion and type inference from text
- **Date Utilities**: `utils/dates.ts` provides dayjs-powered date formatting helpers
- **Item Utilities**: `utils/items.ts` provides `itemKind()`, `createItem()`, `createStep()` factories, progress calculations, recurrence helpers. Items track: `created_at`, `updated_at`, `started_at`, `completed_at`, `paused_at`, `notes`, `tags`, `estimated_minutes`, `actual_minutes`, `review_date`. Steps track: `created_at`, `updated_at`, `completed_at`, `due_date`, `notes`, `estimated_minutes`
- **Score Utilities**: `utils/scores.ts` provides `computeAppScore()` (multi-area weighted scoring), `goalProgress()`, `linkedItemProgress()`, `areaWeight()`, `journeyAreaWeight()`, `appScoreInsight()`, `getUnlinkedItems()`
- **Today Utilities**: `utils/today.ts` provides `getTodayActions()`, `groupByTimeOfDay()`, `pickSessionActions()`, `sortedTimeSlots` for action generation and grouping
- **Design System**: `constants/theme.ts` exports `T` (colors/tokens — indigo `#5856D6` brand), `S` (spacing), `F` (font sizes), `R` (border radii), `shadow` (platform shadows)
- **Config**: `constants/config.ts` exports `ITEM_AREAS`, `AREAS` (10 Wheel of Life areas), `KIND_CONFIG`, `PRIORITY`, `EFFORT`, `STEP_STATUS`, `PRG` (journey catalog), `MOODS` (5-point numeric scale), `DIFF` (difficulty labels/colors), `JOURNEY_ICONS`, `HISTORY` (historical scores), `PEOPLE`, `DEFAULT_USER`
- **Weekly Actions**: `constants/weekly-actions.ts` exports `WA` — 54KB catalog of daily actions per journey per week (accessed as `WA[journeyId][weekIndex]`)
- **Sample Data**: `constants/sample-data.ts` exports `SAMPLE_ITEMS` and `SAMPLE_COMMITTED` — seeded automatically for guest users
- **Animations**: `react-native-reanimated` for transitions, `expo-haptics` for tactile feedback
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`

### Component Architecture

```
components/
  ui/               Badge
  items/            ItemCard, TaskRow, ProgressBar
  add/              AreaPicker, ProjectAddSheet
  today/            SessionView (briefing→mood→cards→completion), CompletionScreen
  plan/             GoalDetailPage, ProjectEditPage, ItemEditSheet
  discover/         AICoach (chat-style coach)
  profile/          ProfileScreen
  WheelOfLife.tsx   SVG radar chart (self + app scores)
  WheelAreaDetail.tsx  Area detail with linked items, insights, journeys
  M3ntorIcon.tsx    Animated SVG logo mark (rainbow arc + leaves + dot) with Reanimated entrance animation
  ErrorBoundary.tsx
```

### Backend Architecture

- **Server**: Express.js (`server/index.ts`) running on port 5000
- **CORS**: Configured dynamically for Replit dev/prod domains and localhost
- **Storage Layer**: `server/storage.ts` has an in-memory `MemStorage` class
- **AI Endpoint**: `/api/ai/assist` proxies AI requests server-side
- **Build**: Server built with esbuild for production deployment

### AI Integration

- **Provider**: Anthropic Claude (`claude-sonnet-4-5`) via `@anthropic-ai/sdk`
- **Client-side AI module**: `lib/ai.ts` exports `aiAssist()`, `getItemHint()`, `generateProjectTasks()`, `generateSubtasks()`, `generateGoal()` — all accept optional `country` param for region-aware responses
- **AI Coach**: Chat-style interface for journey recommendations using server endpoint with fallback keyword matching; filters PRG catalog by user's country (global always shown, regional only when country matches)
- **Smart Type Suggestion**: `getItemHint()` uses a single unified prompt (type-agnostic) and returns `suggestedType`, `typeReason`, `why`, `tip`, `firstStep`, and `effort` in one call; AI fires only on text change (not type switch) so switching approach types is instant; FabActionSheet shows all 4 types in a 2x2 grid with the AI-recommended type pre-highlighted; falls back to local `inferType()` NLP when API fails; all user-facing AI labels use "M3NTOR" branding
- **Creation Mode Toggle**: Create screen offers "M3NTOR plans it" (AI mode) vs "I'll set it up" (manual mode) after type selection; AI mode shows type-specific follow-up questions before generating content; manual mode shows direct input fields per type
- **Type-Specific AI Generation**: `generateHabitPlan()` returns schedule/tip/why/emoji/area; `generateActionPlan()` returns tip/bestTime/emoji/area; `generateGoal()` enriches with emoji/area/why/journeyHints; `generateProjectTasks()` creates step breakdown — each uses follow-up answers as context
- **Complexity Detection**: `assessProjectComplexity()` evaluates whether a project is complex (multi-phase, domain-specific); if complex, shows 2-3 clarifying questions before generating tasks; answers feed into `generateProjectTasks()` context for smarter breakdown
- **Effort Estimation**: AI-generated project tasks include per-task effort levels (quick/medium/deep) with duration labels (< 15 min, ~1-2 hrs, Half day+); effort badges show duration throughout the UI
- **AI Constraints**: All AI prompts include "Never recommend apps, websites, software, or third-party services" to keep recommendations actionable and self-contained
- **Auto-Breakdown**: When AI mode is selected for projects, auto-calls `assessProjectComplexity()` then `generateProjectTasks()` to show inline editable step breakdown
- **Country/Region**: `constants/countries.ts` has curated country list; PRG entries have `scope` (global/regional) and `regions`; ProfileScreen has searchable country picker
- **Env var**: Requires `EXPO_PUBLIC_ANTHROPIC_KEY` on the client
- **Graceful degradation**: All AI functions catch errors and return safe defaults/fallback templates

### Data Models

**Client-side types** (`types/index.ts`):
- `Item`: Core entity with title, description, area, status, recurrence, habit_time_of_day, deadline, priority, effort, emoji, user_id, steps array, linked_items, linked_journeys
- `Step`: Sub-tasks within a project item, with blocked_by, assignees, subtasks
- `Subtask`: Individual sub-items within a step
- `Recurrence`: Supports daily, weekdays, specific_days, interval, monthly
- `Profile`: User profile with name, avatar_url, country (2-letter ISO code)
- `JourneyProgress`: Tracks user progress through curated journey programs
- `Journey`: Static catalog entry for expert-curated programs with `scope` (global/regional) and optional `regions` (country codes)
- `CompletionLog`: Daily completion tracking (date→{done,skipped,total})
- `MoodEntry`: Mood recording with timestamp; `MoodValue` is numeric 1-5 scale
- `TodayAction`: Unified action type for Today screen (journey|habit|project|action)
- Item type is **derived** from properties at runtime via `itemKind()`

### Routing Structure

```
app/
  _layout.tsx          # Root layout with Zustand store, Supabase auth
  login.tsx            # Supabase auth screen
  (tabs)/
    _layout.tsx        # Tab bar + FAB (navigates to /create)
    index.tsx          # Redirects to today
    today.tsx          # Today dashboard + session mode
    mylife.tsx         # My Life — wheel/list, app scores, insights, profile
    discover.tsx       # Journey catalog + AI Coach
    plan.tsx           # Hierarchy/list views, goal detail, project edit
  create.tsx           # Create item (formSheet presentation, native keyboard handling)
  item/[id].tsx        # Item detail with full editing
```

### Key Screens & Features

- **Today**: Time-of-day grouped actions (morning/afternoon/evening/anytime), journey cards with session mode (briefing→mood→action deck→undo→completion→summary), quick-complete checkboxes, streak display
- **Plan**: Dual view (hierarchy/list), goal cards with smooth progress rings + progress bars + target date display + quick-create "+" button, linked/unlinked items with per-item progress bars in expanded view, action menus (edit/pause/resume/delete), goal detail page (progress ring, progress breakdown per linked item, target date editing, priority/effort chips, link modal with create buttons, expandable project steps with checkbox/today toggles), project edit page with step/subtask CRUD and AI generation
- **Discover**: Journey catalog, AI Coach chat for recommendations
- **My Life**: Wheel of Life with self + app scores, wheel/list view toggle, insights (strongest/focus area), time comparison (now/week/month/start), area detail with linked items/journeys, profile screen

### Platform Considerations

- The app targets iOS, Android, and Web
- Tab bar uses native iOS tab implementation when Liquid Glass is available, falls back to classic Expo Tabs
- Web-specific insets (67px top, 34px bottom) applied via Platform.OS checks

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
- `profiles` — auto-created via trigger on signup
- `items` — core entity with steps/subtasks nested queries
- `steps` — project sub-tasks
- `subtasks` — individual items within steps
- `journey_progress` — tracks user journey enrollment
- `completion_logs` — daily completion stats (done/skipped/total) with unique (user_id, date)
- `mood_entries` — mood recordings with numeric 1-5 value and timestamp

All tables have Row Level Security (RLS) policies ensuring users can only access their own data.

### Data Persistence

- **Guest mode**: Sample data auto-seeded on boot via `loadAll('guest')`; completion/mood logs and country persisted to AsyncStorage only
- **Authenticated mode**: Items/journeys stored in Supabase with realtime sync; completion/mood logs persisted to both AsyncStorage (local cache) and Supabase (cloud sync)
- **AsyncStorage keys**: `m3ntor_completion_log`, `m3ntor_mood_log`
