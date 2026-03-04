import { getApiUrl } from '@/lib/query-client';

export interface AiSuggestion {
  area?: string;
  kind?: string;
  description?: string;
  steps?: string[];
  timeOfDay?: string;
}

export async function fetchAiSuggestion(prompt: string): Promise<AiSuggestion> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL('/api/ai/assist', baseUrl);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
