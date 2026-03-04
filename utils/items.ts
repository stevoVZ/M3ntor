import { Item, Step, ItemKind, itemKind as getItemKind } from '@/types';
import { ITEM_AREAS, KIND_CONFIG } from '@/constants/config';

export { getItemKind as itemKind };

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

export function matchesRecurrence(item: Item, date: Date): boolean {
  const rec = item.recurrence;
  if (!rec) return false;
  const dow = date.getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  switch (rec.type) {
    case 'daily': return true;
    case 'weekly': return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'specific_days':
      return (rec.days ?? []).includes(dayNames[dow]);
    case 'interval': {
      if (!rec.start_date) return true;
      const start = new Date(rec.start_date);
      const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
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
    case 'daily': return 'Every day';
    case 'weekly': return 'Weekly';
    case 'weekdays': return 'Weekdays';
    case 'specific_days':
      return (rec.days ?? [])
        .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    case 'interval': return `Every ${rec.interval} days`;
    case 'monthly': {
      const day = rec.month_day ?? 1;
      const suffix = ['st', 'nd', 'rd'][((day - 1) % 10)] ?? 'th';
      return `Monthly on the ${day}${suffix}`;
    }
    default: return '';
  }
}

export function formatDuration(mins?: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getAreaConfig(areaKey: string) {
  return ITEM_AREAS.find((a) => a.key === areaKey);
}

export function getAreaColor(areaKey: string): string {
  return getAreaConfig(areaKey)?.color ?? '#8E8E93';
}

export function getAreaIcon(areaKey: string): string {
  return getAreaConfig(areaKey)?.icon ?? 'ellipsis-horizontal';
}

export function getAreaTint(areaKey: string): string {
  return getAreaConfig(areaKey)?.tint ?? 'rgba(142, 142, 147, 0.1)';
}

export function getKindConfig(kind: ItemKind) {
  return KIND_CONFIG[kind];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFormattedDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function createItem(
  fields: Partial<Item> & { title: string; area: string },
  userId?: string,
): Item {
  return {
    id: generateId(),
    title: fields.title,
    area: fields.area,
    emoji: '✓',
    status: 'active',
    source: 'self',
    priority: 'normal',
    effort: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...fields,
    ...(userId ? { user_id: userId } : {}),
  };
}

export function createStep(
  itemId: string,
  fields: Partial<Step> & { title: string },
): Step {
  return {
    id: generateId(),
    item_id: itemId,
    done: false,
    status: 'todo',
    priority: 'normal',
    effort: 'medium',
    today: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...fields,
  };
}
