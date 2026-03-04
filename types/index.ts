export type ItemStatus = 'someday' | 'active' | 'paused' | 'done';
export type ItemKind = 'action' | 'habit' | 'goal' | 'project';
export type StepStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type Effort = 'quick' | 'medium' | 'deep';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Subtask {
  id: string;
  step_id: string;
  title: string;
  done: boolean;
  assignees?: string[];
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
  blocked_by?: string[];
  assignees?: string[];
  sort_order: number;
  subtasks?: Subtask[];
  created_at: string;
}

export interface Recurrence {
  type: 'daily' | 'weekdays' | 'specific_days' | 'interval' | 'monthly' | 'weekly';
  days?: string[];
  interval?: number;
  month_day?: number;
  start_date?: string;
}

export interface Item {
  id: string;
  user_id?: string;
  title: string;
  emoji?: string;
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

export function itemKind(item: Item): ItemKind {
  if (item.status === 'someday') return 'goal';
  if (item.recurrence) return 'habit';
  if ((item.steps?.length ?? 0) > 0) return 'project';
  return 'action';
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

export interface Journey {
  id: string;
  title: string;
  description: string;
  weeks: number;
  category: string;
  color: string;
  icon: string;
}
