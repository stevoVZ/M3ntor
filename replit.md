# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Learning, Fun, Home, Spirituality, Life Tasks). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) for contextual hints, project task generation, subtask breakdown, journey recommendations, and custom program building.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server. AI calls are proxied through the Express server (frontend `lib/ai.ts` calls server endpoints, server uses Replit AI Integrations for Anthropic access — no user API key required). Data persistence uses Zustand for local state with optional Supabase cloud sync when authenticated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with `expo-router` for file-based navigation.
- **State Management**: Zustand store manages item CRUD, authentication, journey progress, completion/mood logging, streak tracking, and item reordering. Journeys are managed with `enrollJourney`, `unenrollJourney`, `removeJourney` (permanent deletion), `reEnrollJourney`, and `advanceJourneyDay`.
- **Neuro Adaptations**: `constants/neuro.ts` defines base profiles (ADHD, Autism, Dyslexia, Sensory) and state profiles (Anxiety, Low Energy) with a merge engine (DEFAULT → base → state → custom overrides). `lib/neuroStore.ts` is a Zustand store persisted via AsyncStorage with daily reset for state profiles. `components/today/NeuroBanner.tsx` provides a pill + 3-step sheet (base → state → customise). Loaded in `_layout.tsx` on boot. Plan screen consumes `adaptations.fontScale` and `adaptations.bgTint`.
- **Soft Delete / Trash**: Items are soft-deleted and can be restored or permanently deleted.
- **AI Utilities**: `lib/ai.ts` provides AI functions that proxy through the Express server.
- **Design System**: `constants/theme.ts` defines colors, spacing, fonts, and shadows.
- **Configuration**: `constants/config.ts` stores core app constants including areas, item kinds, priorities, and journey catalog.
- **Animations**: `react-native-reanimated` for transitions and `expo-haptics` for tactile feedback.

### Component Architecture

The application uses a modular component structure:
- **UI Components**: Generic reusable components (e.g., Badge).
- **Item-Specific Components**: Components for displaying and interacting with items (e.g., ItemCard, TaskRow).
- **Feature-Specific Components**: Components grouped by application feature (e.g., `add/`, `today/`, `plan/`, `discover/`, `profile/`).
- **Core Visuals**: `WheelOfLife.tsx`, `WheelAreaDetail.tsx`, `M3ntorIcon.tsx` for key visual elements.

### Backend Architecture

- **Server**: Express.js (`server/index.ts`) handles API requests.
- **CORS**: Dynamically configured for development and production environments.
- **Storage Layer**: In-memory `MemStorage` for server-side data handling.
- **AI Endpoint**: `/api/ai/assist` for server-side AI requests.

### AI Integration

- **Provider**: Anthropic Claude (`claude-sonnet-4-5`) via Replit AI Integrations (no API key needed, billed to Replit credits).
- **Architecture**: Frontend `lib/ai.ts` proxies all AI calls through Express server endpoints (`/api/ai/*`). Server `server/ai.ts` uses `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` env vars (auto-configured by Replit).
- **Server Endpoints**: `/api/ai/assist`, `/api/ai/hint`, `/api/ai/item-hint`, `/api/ai/complexity`, `/api/ai/tasks`, `/api/ai/project-tasks`, `/api/ai/subtasks`, `/api/ai/briefing`, `/api/ai/habit-plan`, `/api/ai/action-plan`, `/api/ai/expand-phase`, `/api/ai/goal`.
- **AI Coach**: Chat-style interface for journey recommendations, filtering by user's country.
- **Smart Type Suggestion**: `getItemHint()` provides AI-recommended item types based on text input.
- **Creation Mode Toggle**: Users can choose between "M3NTOR plans it" (AI mode) or "I'll set it up" (manual mode) for item creation.
- **Type-Specific AI Generation**: AI generates plans and details specific to actions, habits, goals, and projects.
- **Complexity Detection & Phase-Aware Expansion**: AI assesses project complexity and can expand project phases or steps with new tasks.
- **Effort Estimation**: AI-generated project tasks include effort levels (quick/medium/deep).
- **AI Constraints**: Prompts ensure AI recommendations are actionable and self-contained, avoiding external services.
- **Graceful Degradation**: AI functions are designed to return safe defaults or fallback templates on error.

### Data Models

- **Core Entities**: `Item`, `Step`, `Subtask` are central to the application.
- **Step Phases**: Steps have an optional `phase?: string` field. Steps sharing the same phase string are grouped under collapsible headers in the project detail view (`app/item/[id].tsx`). Phases show per-phase progress counts, can be collapsed/expanded, and support adding steps directly into a phase. Phase assignment is editable from the step detail screen (`app/step/[stepId].tsx`). AI task generation (`lib/ai.ts`) produces phased steps automatically.
- **User & Progress**: `Profile`, `JourneyProgress`, `CompletionLog`, `MoodEntry` track user-specific data.
- **Static Data**: `Journey` defines expert-curated programs.
- **Dynamic Type Detection**: Item type is derived at runtime via `itemKind()`. Items now store `item_kind` as an explicit fallback so items retain their intended type even without steps/recurrence.

### Routing Structure

Uses `expo-router` for file-based routing:
- **Root Layout**: `_layout.tsx` for Zustand store and Supabase authentication.
- **Auth Screen**: `login.tsx`.
- **Tab Navigation**: `(tabs)/_layout.tsx` defines the main tab bar.
- **Core Tabs**: `today.tsx`, `mylife.tsx`, `discover.tsx`, `plan.tsx`.
- **Item Management**: `create.tsx` for new items, `item/[id].tsx` for item details, and `step/[stepId].tsx` for task (step) detail within a project.

### Key Screens & Features

- **Today**: Displays time-of-day grouped actions, "Start daily M3NTOR" session (reviews all today's actions via swipeable cards with Done/Skip/Later), and streak tracking.
- **Plan**: Offers dual hierarchy/list views, goal and project management with progress tracking, and AI generation of steps/subtasks.
- **Discover**: Provides a journey catalog with segmented Explore/My Journeys tabs. Enrolled journeys are filtered out of Explore. My Journeys rows are tappable to navigate to journey detail. AI Coach branded as "Ask M3NTOR".
- **My Life**: Features the Wheel of Life with manually editable self-scores (1-10 per area), app-computed scores, historical score tracking via snapshots, insights, and profile management. Scores persist via AsyncStorage.

## External Dependencies

### Third-Party Services

- **Anthropic Claude API**: AI capabilities via Replit AI Integrations (no user API key needed).
- **Supabase**: Cloud database and authentication. Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Key Libraries

- `expo-router`: File-based navigation.
- `zustand`: Client-side state management.
- `@supabase/supabase-js`: Supabase client.
- `@anthropic-ai/sdk`: Anthropic Claude API client.
- `@shopify/flash-list`: High-performance list rendering.
- `expo-secure-store`, `@react-native-async-storage/async-storage`: Local data persistence.
- `react-native-reanimated`, `expo-haptics`, `expo-linear-gradient`, `react-native-gesture-handler`: UI and animation libraries.
- `dayjs`: Date formatting.

### Environment Variables

- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`: Auto-configured by Replit AI Integrations (server-side).
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`: Auto-configured by Replit AI Integrations (server-side).
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `EXPO_PUBLIC_DOMAIN`: Public domain for API URL resolution.

### Database Setup

The Supabase schema defines tables for `profiles`, `items`, `steps`, `subtasks`, `journey_progress`, `completion_logs`, and `mood_entries`, all secured with Row Level Security.

### Data Persistence

- **Guest mode**: Full local persistence via `AsyncStorage` — items, deleted items, journeys, name, completion/mood logs, self-scores, and score history all survive app restarts. A debounced Zustand subscriber auto-saves items/journeys on any mutation.
- **Authenticated mode**: Synchronizes items and journeys with Supabase, with completion/mood logs persisted locally and to Supabase.
- **Trash/Soft Delete**: Items are soft-deleted to `deletedItems` array. Profile screen shows a collapsible Trash section with restore and permanent delete options.
- **Profile Name**: Editable inline via tap-to-edit in Profile screen. Persisted to AsyncStorage (guest) or Supabase profiles table (authenticated).