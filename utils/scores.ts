import type { Item, JourneyProgress, Journey } from '../types';
import { normalizeAreaId } from '../constants/config';

export function taskProgress(step: { done: boolean; subtasks?: { done: boolean }[] }): number {
  if (step.done) return 1;
  if (!step.subtasks || step.subtasks.length === 0) return 0;
  return step.subtasks.filter(st => st.done).length / step.subtasks.length;
}

export function projectProgress(item: Item): number {
  const steps = item.steps;
  if (!steps || steps.length === 0) return 0;
  return steps.reduce((sum, s) => sum + taskProgress(s), 0) / steps.length;
}

export function journeyProgress(committed: JourneyProgress, totalWeeks: number): number {
  if (!committed) return 0;
  return Math.min(1, committed.current_week / totalWeeks);
}

export function areaWeight(item: Item, areaId: string): number {
  const normId = normalizeAreaId(areaId);
  const primary = normalizeAreaId(item.area);
  const secondary = (item.secondary_areas || []).map(normalizeAreaId);
  if (primary === normId) return 1.0;
  const secIdx = secondary.indexOf(normId);
  if (secIdx === 0) return 0.5;
  if (secIdx === 1) return 0.25;
  return 0;
}

export function journeyAreaWeight(journey: Journey, areaId: string): number {
  if (!journey) return 0;
  if (journey.a === areaId) return 1.0;
  const sa = journey.sa || [];
  const secIdx = sa.indexOf(areaId);
  if (secIdx === 0) return 0.5;
  if (secIdx === 1) return 0.25;
  return 0;
}

export function computeAppScore(
  areaId: string,
  items: Item[],
  journeyProgresses: JourneyProgress[],
  journeyCatalog: Journey[]
): number {
  let points = 0;

  journeyProgresses.forEach(c => {
    const prog = journeyCatalog.find(p => p.id === c.journey_id);
    if (!prog) return;
    const w = journeyAreaWeight(prog, areaId);
    if (w === 0) return;
    let contribution = 0;
    if (c.status === 'active') {
      const progress = Math.min(1, c.current_week / prog.w);
      contribution = 1.5 + progress * 2.5;
    } else if (c.status === 'done') {
      contribution = 1.0;
    }
    points += contribution * w;
  });

  items.filter(i => i.status === 'active' && i.recurrence).forEach(item => {
    const w = areaWeight(item, areaId);
    if (w === 0) return;
    points += 0.8 * w;
  });

  items.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0).forEach(item => {
    const w = areaWeight(item, areaId);
    if (w === 0) return;
    const pp = projectProgress(item);
    const contribution = 0.4 + pp * 1.2;
    points += contribution * w;
  });

  return Math.max(1, Math.min(10, Math.round((1 + points) * 10) / 10));
}

export function appScoreInsight(selfScore: number, appScore: number): { type: 'aligned' | 'overconfident' | 'undervalued'; msg: string } {
  const gap = selfScore - appScore;
  if (Math.abs(gap) <= 1) return { type: 'aligned', msg: 'Your effort and self-rating are well aligned.' };
  if (gap > 1) return { type: 'overconfident', msg: `You rate this ${gap.toFixed(1)} higher than your activity suggests. Are you coasting?` };
  return { type: 'undervalued', msg: `You're putting in more work than you give yourself credit for. ${Math.abs(gap).toFixed(1)} points of hidden effort.` };
}

export function goalProgress(
  goal: Item,
  items: Item[],
  journeyProgresses: JourneyProgress[],
  journeyCatalog: Journey[]
): number {
  const linkedProjects = (goal.linked_items || [])
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as Item[];
  const linkedJourneys = (goal.linked_journeys || [])
    .map(id => {
      const c = journeyProgresses.find(cc => cc.journey_id === id);
      const prog = journeyCatalog.find(p => p.id === id);
      return c && prog ? { progress: journeyProgress(c, prog.w) } : null;
    })
    .filter(Boolean) as { progress: number }[];

  const allProgress = [
    ...linkedProjects.map(p => projectProgress(p)),
    ...linkedJourneys.map(j => j.progress),
  ];
  if (allProgress.length === 0) return 0;
  return allProgress.reduce((a, b) => a + b, 0) / allProgress.length;
}

export function getUnlinkedItems(items: Item[]): Item[] {
  const linkedIds = new Set<string>();
  items.filter(i => i.status === 'someday').forEach(g => {
    (g.linked_items || []).forEach(id => linkedIds.add(id));
  });
  return items.filter(i =>
    i.status !== 'someday' && !linkedIds.has(i.id) && i.status !== 'done'
  );
}
