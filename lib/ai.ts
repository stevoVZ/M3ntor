import { getApiUrl } from '@/lib/query-client';
import { fetch as expoFetch } from 'expo/fetch';

async function post(path: string, body: Record<string, unknown>): Promise<any> {
  const base = getApiUrl();
  const url = new URL(path, base).toString();
  const res = await expoFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export async function aiAssist(prompt: string): Promise<string> {
  const data = await post('/api/ai/assist', { prompt });
  return typeof data === 'string' ? data : JSON.stringify(data);
}

export interface AiHint {
  why?:           string;
  effort?:        string;
  tip?:           string;
  firstStep?:     string;
  timeline?:      string;
  suggestedType?: string;
  typeReason?:    string;
}

export async function getItemHint(text: string, _type?: string, country?: string): Promise<AiHint> {
  try {
    return await post('/api/ai/item-hint', { text, country }) as AiHint;
  } catch {
    return {};
  }
}

export interface AiComplexity {
  complex: boolean;
  questions: string[];
}

export async function assessProjectComplexity(title: string, country?: string): Promise<AiComplexity> {
  try {
    return await post('/api/ai/complexity', { title, country }) as AiComplexity;
  } catch {
    return { complex: false, questions: [] };
  }
}

export interface AiTaskItem {
  title: string;
  effort?: 'quick' | 'medium' | 'deep';
  phase?: string;
}

export interface AiTasks {
  tasks: AiTaskItem[];
  emoji?: string;
  why?:   string;
}

export async function generateProjectTasks(title: string, existing: string[] = [], country?: string, context?: string): Promise<AiTasks> {
  try {
    return await post('/api/ai/project-tasks', { title, existing, country, context }) as AiTasks;
  } catch {
    return { tasks: [] };
  }
}

export interface AiHabitPlan {
  schedule?: string;
  tip?: string;
  why?: string;
  emoji?: string;
  area?: string;
}

export async function generateHabitPlan(title: string, context?: string, country?: string): Promise<AiHabitPlan> {
  try {
    return await post('/api/ai/habit-plan', { title, context, country }) as AiHabitPlan;
  } catch {
    return {};
  }
}

export interface AiActionPlan {
  tip?: string;
  bestTime?: string;
  emoji?: string;
  area?: string;
}

export async function generateActionPlan(title: string, context?: string, country?: string): Promise<AiActionPlan> {
  try {
    return await post('/api/ai/action-plan', { title, context, country }) as AiActionPlan;
  } catch {
    return {};
  }
}

export async function expandProjectPhase(
  projectTitle: string,
  phaseTitle: string,
  existingSubtasks: string[] = [],
  siblingPhases: string[] = [],
  country?: string,
): Promise<AiTasks> {
  try {
    return await post('/api/ai/expand-phase', { projectTitle, phaseTitle, existingSubtasks, siblingPhases, country }) as AiTasks;
  } catch {
    return { tasks: [] };
  }
}

export async function generateSubtasks(taskTitle: string, projectTitle: string): Promise<string[]> {
  try {
    const data = await post('/api/ai/subtasks', { stepTitle: taskTitle, projectTitle });
    return data.subtasks ?? [];
  } catch {
    return [];
  }
}

export interface AiGoalSuggestion {
  title: string;
  emoji?: string;
  area?: string;
  why?: string;
  journeyHints?: string[];
  firstSteps?: string[];
}

export async function generateGoal(description: string, country?: string): Promise<AiGoalSuggestion> {
  try {
    return await post('/api/ai/goal', { description, country }) as AiGoalSuggestion;
  } catch {
    return { title: description };
  }
}
