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

export async function getItemHint(kind: string, title: string): Promise<string> {
  try {
    const prompts: Record<string, string> = {
      action: `Give a brief, practical one-sentence tip for completing this task: "${title}"`,
      habit: `Give a brief, motivating one-sentence tip for building this habit: "${title}"`,
      goal: `Give a brief, inspiring one-sentence insight about pursuing this goal: "${title}"`,
      project: `Give a brief, strategic one-sentence tip for managing this project: "${title}"`,
    };

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: 'You are a concise life coach. Respond with exactly one sentence, no quotes.',
      messages: [{ role: 'user', content: prompts[kind] || prompts.action }],
    });

    const block = msg.content[0];
    if (block.type !== 'text') return '';
    return block.text.trim();
  } catch (error) {
    console.error('getItemHint error:', error);
    return '';
  }
}

export async function generateProjectTasks(title: string, description?: string): Promise<string[]> {
  try {
    const prompt = description
      ? `Break down this project into 4-8 concrete, actionable tasks:\n\nProject: ${title}\nDescription: ${description}\n\nReturn ONLY a JSON array of task title strings.`
      : `Break down this project into 4-8 concrete, actionable tasks:\n\nProject: ${title}\n\nReturn ONLY a JSON array of task title strings.`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: 'You are a project planning assistant. Return ONLY valid JSON arrays, no extra text.',
      messages: [{ role: 'user', content: prompt }],
    });

    const block = msg.content[0];
    if (block.type !== 'text') return [];
    return JSON.parse(block.text) as string[];
  } catch (error) {
    console.error('generateProjectTasks error:', error);
    return [];
  }
}

export async function generateSubtasks(stepTitle: string, projectTitle: string): Promise<string[]> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: 'You are a task breakdown assistant. Return ONLY valid JSON arrays, no extra text.',
      messages: [{
        role: 'user',
        content: `Break down this task into 2-5 smaller subtasks:\n\nProject: ${projectTitle}\nTask: ${stepTitle}\n\nReturn ONLY a JSON array of subtask title strings.`,
      }],
    });

    const block = msg.content[0];
    if (block.type !== 'text') return [];
    return JSON.parse(block.text) as string[];
  } catch (error) {
    console.error('generateSubtasks error:', error);
    return [];
  }
}
