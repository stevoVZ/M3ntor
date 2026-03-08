# M3NTOR - AI Life Coach & Productivity App

## Overview

M3NTOR is a mobile-first productivity and life coaching application built with Expo (React Native). It helps users organize their lives into actionable items across different life areas (Health, Career, Finance, Relationships, Learning, Fun, Home, Spirituality, Life Tasks). Items can be categorized as actions (one-off tasks), habits (recurring), goals (aspirations), or projects (multi-step). The app includes an AI assistant powered by Claude (Anthropic) for contextual hints, project task generation, subtask breakdown, journey recommendations, and custom program building.

The app runs as an Expo React Native app for mobile devices and web, with a companion Express.js backend server. AI calls go directly from the client to Anthropic (no server proxy). Data persistence uses Zustand for local state with optional Supabase cloud sync when authenticated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo (React Native) with `expo-router` for file-based navigation.
- **State Management**: Zustand store manages item CRUD, authentication, journey progress, completion/mood logging, streak tracking, and item reordering. Journeys are managed with `enrollJourney`, `unenrollJourney`, and `advanceJourneyDay`.
- **Soft Delete / Trash**: Items are soft-deleted and can be restored or permanently deleted.
- **AI Utilities**: `lib/ai.ts` provides client-side AI functions.
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

- **Provider**: Anthropic Claude (`claude-sonnet-4-5`) via `@anthropic-ai/sdk`.
- **Client-side AI Module**: `lib/ai.ts` exports functions for AI assistance, hint generation, task generation, subtask expansion, and goal generation.
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
- **User & Progress**: `Profile`, `JourneyProgress`, `CompletionLog`, `MoodEntry` track user-specific data.
- **Static Data**: `Journey` defines expert-curated programs.
- **Dynamic Type Detection**: Item type is derived at runtime via `itemKind()`.

### Routing Structure

Uses `expo-router` for file-based routing:
- **Root Layout**: `_layout.tsx` for Zustand store and Supabase authentication.
- **Auth Screen**: `login.tsx`.
- **Tab Navigation**: `(tabs)/_layout.tsx` defines the main tab bar.
- **Core Tabs**: `today.tsx`, `mylife.tsx`, `discover.tsx`, `plan.tsx`.
- **Item Management**: `create.tsx` for new items, `item/[id].tsx` for item details, and `step/[stepId].tsx` for task (step) detail within a project.

### Key Screens & Features

- **Today**: Displays time-of-day grouped actions, journey session mode, and streak tracking.
- **Plan**: Offers dual hierarchy/list views, goal and project management with progress tracking, and AI generation of steps/subtasks.
- **Discover**: Provides a journey catalog and AI Coach.
- **My Life**: Features the Wheel of Life for self and app scores, insights, and profile management.

## External Dependencies

### Third-Party Services

- **Anthropic Claude API**: AI capabilities. Requires `EXPO_PUBLIC_ANTHROPIC_KEY`.
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

- `EXPO_PUBLIC_ANTHROPIC_KEY`: Anthropic API key.
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `EXPO_PUBLIC_DOMAIN`: Public domain for API URL resolution.

### Database Setup

The Supabase schema defines tables for `profiles`, `items`, `steps`, `subtasks`, `journey_progress`, `completion_logs`, and `mood_entries`, all secured with Row Level Security.

### Data Persistence

- **Guest mode**: Uses sample data and `AsyncStorage` for completion/mood logs.
- **Authenticated mode**: Synchronizes items and journeys with Supabase, with completion/mood logs persisted locally and to Supabase.