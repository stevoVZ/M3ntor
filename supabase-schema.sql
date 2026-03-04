-- ═══════════════════════════════════════════════════════════
-- M3NTOR — Complete Supabase Schema
-- Paste this entire file into: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── ITEMS ───────────────────────────────────────────────────
-- The unified model. No explicit type field —
-- behaviour is derived from properties (steps/recurrence/status).
CREATE TABLE IF NOT EXISTS items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title             TEXT NOT NULL,
  emoji             TEXT DEFAULT '✓',
  description       TEXT,
  area              TEXT NOT NULL DEFAULT 'life',
  secondary_areas   TEXT[],
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('someday','active','paused','done')),
  source            TEXT NOT NULL DEFAULT 'self'
                    CHECK (source IN ('self','journey')),
  recurrence        JSONB,
  habit_time_of_day TEXT,
  habit_duration    INT,
  deadline          TIMESTAMPTZ,
  priority          TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('urgent','high','normal','low')),
  effort            TEXT NOT NULL DEFAULT 'medium'
                    CHECK (effort IN ('quick','medium','deep')),
  paused_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── STEPS ────────────────────────────────────────────────────
-- Tasks within a project item
CREATE TABLE IF NOT EXISTS steps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  done        BOOLEAN DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo','doing','blocked','done')),
  priority    TEXT NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('urgent','high','normal','low')),
  effort      TEXT NOT NULL DEFAULT 'medium'
              CHECK (effort IN ('quick','medium','deep')),
  today       BOOLEAN DEFAULT FALSE,
  blocked_by  UUID[],
  assignees   UUID[],
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBTASKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id    UUID REFERENCES steps(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  done       BOOLEAN DEFAULT FALSE,
  assignees  UUID[],
  sort_order INT DEFAULT 0
);

-- ── JOURNEY PROGRESS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journey_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  journey_id      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','done')),
  current_week    INT DEFAULT 1,
  streak          INT DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, journey_id)
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own
CREATE POLICY "profiles_self" ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Items: users see only their own
CREATE POLICY "items_self" ON items
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Steps: visible if parent item belongs to user
CREATE POLICY "steps_self" ON steps
  USING (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));

-- Subtasks: visible if parent step's item belongs to user
CREATE POLICY "subtasks_self" ON subtasks
  USING (step_id IN (
    SELECT s.id FROM steps s
    JOIN items i ON i.id = s.item_id
    WHERE i.user_id = auth.uid()
  ));

-- Journey progress: users see their own
CREATE POLICY "journey_progress_self" ON journey_progress
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── REALTIME ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE steps;
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS items_user_id    ON items(user_id);
CREATE INDEX IF NOT EXISTS items_status     ON items(status);
CREATE INDEX IF NOT EXISTS steps_item_id    ON steps(item_id);
CREATE INDEX IF NOT EXISTS subtasks_step_id ON subtasks(step_id);
CREATE INDEX IF NOT EXISTS jp_user_id       ON journey_progress(user_id);

-- ── DONE ─────────────────────────────────────────────────────
-- Run SELECT * FROM items; to confirm the table exists.
-- You should see an empty result (no error = success).
