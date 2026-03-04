export type ItemStatus = 'someday' | 'active' | 'paused' | 'done';
export type ItemKind = 'action' | 'habit' | 'goal' | 'project';
export type StepStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type Effort = 'quick' | 'medium' | 'deep';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

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
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  area: string;
  secondary_areas?: string[];
  status: ItemStatus;
  source: 'self' | 'journey';
  recurrence?: { type: 'daily' | 'weekly'; days?: number[] };
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
  if (item.steps && item.steps.length > 0) return 'project';
  if (item.recurrence) return 'habit';
  if (item.status === 'someday') return 'goal';
  return 'action';
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
