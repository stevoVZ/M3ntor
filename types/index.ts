// ─────────────────────────────────────────────────────────
// M3NTOR — Core types
// The unified Item model: behaviour is derived from
// properties, not from an explicit "type" field.
// ─────────────────────────────────────────────────────────

export type ItemStatus   = 'someday' | 'active' | 'paused' | 'done';
export type ItemKind     = 'action'  | 'habit'  | 'goal'   | 'project';
export type StepStatus   = 'todo'    | 'doing'  | 'blocked'| 'done';
export type Priority     = 'urgent'  | 'high'   | 'normal' | 'low';
export type Effort       = 'quick'   | 'medium' | 'deep';
export type TimeOfDay    = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Subtask {
  id: string;
  step_id: string;
  title: string;
  done: boolean;
  assignees: string[];
  sort_order: number;
}

export interface Step {
  id: string;
  item_id: string;
  title: string;
  description?: string;
  done: boolean;
  status: StepStatus;
  priority: Priority;
  effort: Effort;
  today: boolean;
  blocked_by: string[];
  assignees: string[];
  sort_order: number;
  subtasks?: Subtask[];
  created_at?: string;
}

export interface Recurrence {
  type: 'daily' | 'weekdays' | 'specific_days' | 'interval' | 'monthly';
  days?: string[];      // ['mon','wed','fri']
  interval?: number;    // for 'interval' type
  month_day?: number;   // for 'monthly' type
  start_date?: string;
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  description?: string;
  area: string;
  secondary_areas?: string[];
  status: ItemStatus;
  source: 'self' | 'journey';
  recurrence?: Recurrence;
  habit_time_of_day?: TimeOfDay;
  habit_duration?: number;
  deadline?: string;
  priority: Priority;
  effort: Effort;
  paused_at?: string;
  completed_at?: string;
  steps?: Step[];
  created_at: string;
  updated_at: string;
}

export interface JourneyProgress {
  id: string;
  user_id: string;
  journey_id: string;
  status: 'active' | 'paused' | 'done';
  current_week: number;
  streak: number;
  last_session_at?: string;
  enrolled_at: string;
}

export interface Profile {
  id: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

// ── Journey catalog entry (static data, not from DB) ──
export interface Journey {
  id: string;
  a: string;           // area
  sa?: string[];       // secondary areas
  t: string;           // title
  e: string;           // expert/author
  w: number;           // weeks
  d: 'beginner' | 'moderate' | 'advanced';
  m: number;           // minutes per session
  u: number;           // enrolled count
  rt: number;          // rating
  f?: boolean;         // featured
  ds: string;          // description
  wp: string[];        // week plan titles
}
