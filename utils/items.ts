import type { Item, Step, ItemKind } from '../types';

// ─────────────────────────────────────────────────────────
// itemKind — derives the display kind from item properties
// No explicit "type" field — behaviour comes from data
// ─────────────────────────────────────────────────────────
export function itemKind(item: Item): ItemKind {
  if (item.status === 'someday')          return 'goal';
  if (item.recurrence)                    return 'habit';
  if ((item.steps?.length ?? 0) > 0)     return 'project';
  return 'action';
}

// ─────────────────────────────────────────────────────────
// Progress calculations
// ─────────────────────────────────────────────────────────
export function subtaskProgress(step: Step): number {
  if (step.done) return 1;
  if (!step.subtasks?.length) return 0;
  return step.subtasks.filter(st => st.done).length / step.subtasks.length;
}

export function projectProgress(item: Item): number {
  const steps = item.steps;
  if (!steps?.length) return 0;
  return steps.reduce((sum, s) => sum + subtaskProgress(s), 0) / steps.length;
}

export function projectProgressPercent(item: Item): number {
  return Math.round(projectProgress(item) * 100);
}

// ─────────────────────────────────────────────────────────
// Recurrence helpers
// ─────────────────────────────────────────────────────────
export function matchesRecurrence(item: Item, date: Date): boolean {
  const rec = item.recurrence;
  if (!rec) return false;
  const dow = date.getDay();
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];

  switch (rec.type) {
    case 'daily':   return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'specific_days':
      return (rec.days ?? []).includes(dayNames[dow]);
    case 'interval': {
      if (!rec.start_date) return true;
      const start = new Date(rec.start_date);
      const diff  = Math.floor((date.getTime() - start.getTime()) / 86400000);
      return diff >= 0 && diff % (rec.interval ?? 7) === 0;
    }
    case 'monthly':
      return date.getDate() === (rec.month_day ?? 1);
    default: return false;
  }
}

export function formatRecurrence(item: Item): string {
  const rec = item.recurrence;
  if (!rec) return '';
  switch (rec.type) {
    case 'daily':         return 'Every day';
    case 'weekdays':      return 'Weekdays';
    case 'specific_days': return (rec.days ?? [])
      .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    case 'interval':      return `Every ${rec.interval} days`;
    case 'monthly': {
      const day = rec.month_day ?? 1;
      const suffix = ['st','nd','rd'][((day - 1) % 10)] ?? 'th';
      return `Monthly on the ${day}${suffix}`;
    }
    default: return '';
  }
}

// ─────────────────────────────────────────────────────────
// Duration formatting
// ─────────────────────────────────────────────────────────
export function formatDuration(mins?: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─────────────────────────────────────────────────────────
// New item factory
// ─────────────────────────────────────────────────────────
export function createItem(
  userId: string,
  fields: Partial<Item> & { title: string; area: string }
): Item {
  return {
    id:          `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id:     userId,
    emoji:       '✓',
    description: '',
    status:      'active',
    source:      'self',
    priority:    'normal',
    effort:      'medium',
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
    ...fields,
  };
}

export function createStep(
  itemId: string,
  fields: Partial<Step> & { title: string }
): Step {
  return {
    id:         `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item_id:    itemId,
    done:       false,
    status:     'todo',
    priority:   'normal',
    effort:     'medium',
    today:      false,
    blocked_by: [],
    assignees:  [],
    sort_order: 0,
    ...fields,
  };
}
