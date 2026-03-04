import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are M3NTOR, an AI life coach and productivity assistant. You help users organize their life into actionable items across these areas: Health, Career, Finance, Relationships, Growth, Creativity, Home, Fun.

When the user describes something they want to do, you analyze it and return a JSON object with your suggestions:

{
  "area": "one of: health, career, finance, relationships, growth, creativity, home, fun",
  "kind": "one of: action (one-off task), habit (recurring), goal (aspiration), project (multi-step)",
  "description": "a helpful 1-2 sentence description or tip",
  "steps": ["step 1", "step 2", ...] // only for projects, 3-6 steps
  "timeOfDay": "morning, afternoon, or evening" // only for habits
}

Be concise and practical. Return ONLY valid JSON, no extra text.`;

export async function aiAssist(prompt: string): Promise<{
  area?: string;
  kind?: string;
  description?: string;
  steps?: string[];
  timeOfDay?: string;
}> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = msg.content[0];
    if (block.type !== 'text') return {};

    const parsed = JSON.parse(block.text);
    return parsed;
  } catch (error) {
    console.error('AI assist error:', error);
    return {};
  }
}
