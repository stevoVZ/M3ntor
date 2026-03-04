import { getApiUrl } from '@/lib/query-client';
import { suggestArea, inferType } from '@/utils/nlp';

export interface AiSuggestion {
  area?: string;
  kind?: string;
  description?: string;
  steps?: string[];
  timeOfDay?: string;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL(path, baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getLocalSuggestion(title: string): Partial<AiSuggestion> {
  const area = suggestArea(title) ?? undefined;
  const kind = inferType(title);
  return { area, kind };
}

export async function fetchAiSuggestion(prompt: string): Promise<AiSuggestion> {
  const result = await postJson<AiSuggestion>('/api/ai/assist', { prompt });
  return result ?? {};
}

export async function fetchItemHint(kind: string, title: string): Promise<string> {
  const result = await postJson<{ hint: string }>('/api/ai/hint', { kind, title });
  return result?.hint ?? '';
}

export async function fetchProjectTasks(title: string, description?: string): Promise<string[]> {
  const result = await postJson<{ tasks: string[] }>('/api/ai/tasks', { title, description });
  return result?.tasks ?? [];
}

export async function fetchSubtasks(stepTitle: string, projectTitle: string): Promise<string[]> {
  const result = await postJson<{ subtasks: string[] }>('/api/ai/subtasks', { stepTitle, projectTitle });
  return result?.subtasks ?? [];
}
