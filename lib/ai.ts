import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_KEY,
  // Required for React Native / Expo environment
  dangerouslyAllowBrowser: true,
});

// ── Core AI helper — same pattern as prototype ────────────

export async function aiAssist(prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 600,
    messages:   [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

// ── Typed AI helpers ──────────────────────────────────────

export interface AiHint {
  why?:       string;
  effort?:    string;
  tip?:       string;
  firstStep?: string;
  timeline?:  string;
}

export async function getItemHint(text: string, type: string): Promise<AiHint> {
  const prompts: Record<string, string> = {
    action:  `Task: "${text}"\nReply JSON only: {"why":"one short sentence why this matters","effort":"quick|medium|deep"}`,
    habit:   `Habit: "${text}"\nReply JSON only: {"why":"one short sentence life impact","tip":"one practical tip to make it stick"}`,
    goal:    `Goal: "${text}"\nReply JSON only: {"why":"one emotional sentence why this goal matters","firstStep":"single best first action"}`,
    project: `Project: "${text}"\nReply JSON only: {"why":"one sentence why this matters","firstStep":"the very first task to start"}`,
  };
  try {
    const raw   = await aiAssist(prompts[type] ?? prompts.action);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiHint;
  } catch {
    return {};
  }
}

export interface AiTasks {
  tasks: string[];
  emoji?: string;
  why?:   string;
}

export async function generateProjectTasks(title: string, existing: string[] = []): Promise<AiTasks> {
  const prompt = existing.length
    ? `Project: "${title}"\nExisting tasks: ${existing.join(', ')}\nGenerate 3-5 MORE missing tasks. Reply JSON only: {"tasks":["task 1"],"emoji":"emoji"}`
    : `Project: "${title}"\nGenerate 5-7 concrete actionable tasks. Reply JSON only: {"tasks":["task 1"],"emoji":"emoji","why":"one sentence"}`;
  try {
    const raw    = await aiAssist(prompt);
    const clean  = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiTasks;
  } catch {
    return { tasks: [] };
  }
}

export async function generateSubtasks(taskTitle: string, projectTitle: string): Promise<string[]> {
  const prompt = `Break down this task into 3-4 subtasks:\n"${taskTitle}"\nProject context: "${projectTitle}"\nReply JSON only: {"subtasks":["subtask 1","subtask 2"]}`;
  try {
    const raw    = await aiAssist(prompt);
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { subtasks: string[] };
    return parsed.subtasks ?? [];
  } catch {
    return [];
  }
}
