import type { Item, JourneyProgress, Journey, TodayAction, TimeOfDay } from '../types';
import { matchesRecurrence } from './items';

export function getTodayActions(
  items: Item[],
  journeyProgresses: JourneyProgress[],
  journeyCatalog: Journey[]
): TodayAction[] {
  const actions: TodayAction[] = [];
  const today = new Date();

  items.filter(i => i.status === 'active' && i.recurrence && matchesRecurrence(i, today)).forEach(item => {
    actions.push({
      id: `habit-${item.id}`,
      type: 'habit',
      title: item.title,
      description: item.description,
      timeOfDay: item.habit_time_of_day || 'anytime',
      duration: item.habit_duration,
      area: item.area,
      emoji: item.emoji,
      sourceItemId: item.id,
    });
  });

  items.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0).forEach(item => {
    (item.steps || []).filter(s => s.today && !s.done).forEach(step => {
      actions.push({
        id: `step-${item.id}-${step.id}`,
        type: 'project',
        title: step.title,
        description: item.title,
        timeOfDay: 'anytime',
        area: item.area,
        emoji: item.emoji,
        sourceItemId: item.id,
        stepId: step.id,
      });
    });
  });

  items.filter(i => i.status === 'active' && !i.recurrence && !(i.steps?.length)).forEach(item => {
    actions.push({
      id: `action-${item.id}`,
      type: 'action',
      title: item.title,
      description: item.description,
      timeOfDay: item.habit_time_of_day || 'anytime',
      area: item.area,
      emoji: item.emoji,
      sourceItemId: item.id,
    });
  });

  journeyProgresses.filter(j => j.status === 'active').forEach(jp => {
    const prog = journeyCatalog.find(p => p.id === jp.journey_id);
    if (!prog) return;
    const weekNum = jp.current_week;
    const dayNum = jp.current_day || 1;
    const weekTitle = prog.wp[Math.min(weekNum - 1, prog.wp.length - 1)] || `Week ${weekNum}`;
    actions.push({
      id: `journey-${jp.journey_id}`,
      type: 'journey',
      title: `${prog.t}: ${weekTitle}`,
      description: `Week ${weekNum}, Day ${dayNum}`,
      timeOfDay: 'morning',
      duration: prog.m,
      area: prog.a,
      emoji: '',
      journeyId: jp.journey_id,
      weekNum,
      dayNum,
      dayTitle: weekTitle,
    });
  });

  return actions;
}

const TIME_ORDER: Record<TimeOfDay, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
  anytime: 3,
};

export function groupByTimeOfDay(actions: TodayAction[]): Record<TimeOfDay, TodayAction[]> {
  const groups: Record<TimeOfDay, TodayAction[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    anytime: [],
  };
  actions.forEach(a => {
    groups[a.timeOfDay].push(a);
  });
  return groups;
}

export function sortedTimeSlots(): TimeOfDay[] {
  return ['morning', 'afternoon', 'evening', 'anytime'];
}

export function timeSlotLabel(slot: TimeOfDay): string {
  switch (slot) {
    case 'morning': return 'Morning';
    case 'afternoon': return 'Afternoon';
    case 'evening': return 'Evening';
    case 'anytime': return 'Anytime';
  }
}

export function timeSlotIcon(slot: TimeOfDay): string {
  switch (slot) {
    case 'morning': return 'sunrise';
    case 'afternoon': return 'sun';
    case 'evening': return 'moon';
    case 'anytime': return 'clock';
  }
}

export function pickSessionActions(
  actions: TodayAction[],
  statuses: Record<string, string>,
  skippedSet: Set<string>
): TodayAction[] {
  return actions.filter(a =>
    !statuses[a.id] && !skippedSet.has(a.id)
  );
}
