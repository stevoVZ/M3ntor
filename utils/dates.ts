import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);

export function formatDeadline(iso?: string): string {
  if (!iso) return '';
  const d = dayjs(iso);
  if (d.isToday())    return 'Due today';
  if (d.isTomorrow()) return 'Due tomorrow';
  if (d.diff(dayjs(), 'day') < 7) return `Due ${d.fromNow()}`;
  return `Due ${d.format('D MMM YYYY')}`;
}

export function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  return dayjs(iso).isBefore(dayjs(), 'day');
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('D MMM YYYY');
}

export function fromNow(iso: string): string {
  return dayjs(iso).fromNow();
}

export function todayISO(): string {
  return dayjs().toISOString();
}

export function greetingForTime(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
