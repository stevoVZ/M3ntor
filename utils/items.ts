import { Item, ItemKind, itemKind as getItemKind } from '@/types';
import { ITEM_AREAS, KIND_CONFIG } from '@/constants/config';

export { getItemKind as itemKind };

export function projectProgress(item: Item): number {
  if (!item.steps || item.steps.length === 0) return 0;
  const done = item.steps.filter((s) => s.done).length;
  return done / item.steps.length;
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
