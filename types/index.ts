export type ItemStatus   = 'someday' | 'active' | 'paused' | 'done';
export type ItemKind     = 'action'  | 'habit'  | 'goal'   | 'project';
export type StepStatus   = 'todo'    | 'doing'  | 'blocked'| 'done';
export type Priority     = 'urgent'  | 'high'   | 'normal' | 'low';
export type Effort       = 'quick'   | 'medium' | 'deep';
export type TimeOfDay    = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type MoodValue    = 1 | 2 | 3 | 4 | 5;

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
  days?: string[];
  interval?: number;
  month_day?: number;
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
  linked_items?: string[];
  linked_journeys?: string[];
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface CompletionEntry {
  done: number;
  skipped: number;
  total: number;
}

export interface CompletionLog {
  [date: string]: CompletionEntry;
}

export interface MoodEntry {
  date: string;
  mood: MoodValue;
}

export interface JourneyProgress {
  id: string;
  user_id: string;
  journey_id: string;
  status: 'active' | 'paused' | 'done';
  current_week: number;
  current_day?: number;
  streak: number;
  last_session_at?: string;
  enrolled_at: string;
}

export interface Profile {
  id: string;
  name?: string;
  avatar_url?: string;
  country?: string;
  created_at: string;
}

export interface Journey {
  id: string;
  a: string;
  sa?: string[];
  t: string;
  e: string;
  w: number;
  d: 'beginner' | 'moderate' | 'advanced';
  m: number;
  u: number;
  rt: number;
  f?: boolean;
  ds: string;
  wp: string[];
  scope?: 'global' | 'regional';
  regions?: string[];
}

export interface TodayAction {
  id: string;
  type: 'journey' | 'habit' | 'project' | 'action';
  title: string;
  description?: string;
  timeOfDay: TimeOfDay;
  duration?: number;
  area: string;
  emoji: string;
  sourceItemId?: string;
  journeyId?: string;
  weekNum?: number;
  dayNum?: number;
  dayTitle?: string;
  stepId?: string;
}
