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
  why?:           string;
  effort?:        string;
  tip?:           string;
  firstStep?:     string;
  timeline?:      string;
  suggestedType?: string;
  typeReason?:    string;
}

export async function getItemHint(text: string, type: string, country?: string): Promise<AiHint> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const typeInfer = `\nAlso suggest the best item type for this. Reply with "suggestedType":"action|habit|goal|project" and "typeReason":"one short sentence explaining why this type fits".`;
  const prompts: Record<string, string> = {
    action:  `Task: "${text}"${countryCtx}${noApps}${typeInfer}\nReply JSON only: {"why":"one short sentence why this matters","effort":"quick|medium|deep","suggestedType":"...","typeReason":"..."}`,
    habit:   `Habit: "${text}"${countryCtx}${noApps}${typeInfer}\nReply JSON only: {"why":"one short sentence life impact","tip":"one practical tip to make it stick","suggestedType":"...","typeReason":"..."}`,
    goal:    `Goal: "${text}"${countryCtx}${noApps}${typeInfer}\nReply JSON only: {"why":"one emotional sentence why this goal matters","firstStep":"single best first action","suggestedType":"...","typeReason":"..."}`,
    project: `Project: "${text}"${countryCtx}${noApps}${typeInfer}\nReply JSON only: {"why":"one sentence why this matters","firstStep":"the very first task to start","suggestedType":"...","typeReason":"..."}`,
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

export async function generateProjectTasks(title: string, existing: string[] = [], country?: string): Promise<AiTasks> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const prompt = existing.length
    ? `Project: "${title}"${countryCtx}${noApps}\nExisting tasks: ${existing.join(', ')}\nGenerate 3-5 MORE missing tasks. Reply JSON only: {"tasks":["task 1"],"emoji":"emoji"}`
    : `Project: "${title}"${countryCtx}${noApps}\nGenerate 5-7 concrete actionable tasks. Reply JSON only: {"tasks":["task 1"],"emoji":"emoji","why":"one sentence"}`;
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

export interface AiGoalSuggestion {
  title: string;
  emoji?: string;
  area?: string;
  why?: string;
  journeyHints?: string[];
  firstSteps?: string[];
}

export async function generateGoal(description: string, country?: string): Promise<AiGoalSuggestion> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const prompt = `Goal: "${description}"${countryCtx}${noApps}\nEnrich this goal. Reply JSON only: {"title":"polished goal title","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality","why":"one emotional sentence about why this matters","journeyHints":["suggested journey/program name 1","name 2"],"firstSteps":["first concrete action","second action"]}`;
  try {
    const raw   = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiGoalSuggestion;
  } catch {
    return { title: description };
  }
}

