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

export interface AiGoalSuggestion {
  title: string;
  emoji?: string;
  area?: string;
  why?: string;
  journeyHints?: string[];
  firstSteps?: string[];
}

export async function generateGoal(description: string): Promise<AiGoalSuggestion> {
  const prompt = `Goal: "${description}"\nEnrich this goal. Reply JSON only: {"title":"polished goal title","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality","why":"one emotional sentence about why this matters","journeyHints":["suggested journey/program name 1","name 2"],"firstSteps":["first concrete action","second action"]}`;
  try {
    const raw   = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiGoalSuggestion;
  } catch {
    return { title: description };
  }
}

export interface AiProjectFromGoal {
  title: string;
  steps: string[];
  emoji?: string;
  area?: string;
}

export async function generateProjectFromGoal(goalTitle: string): Promise<AiProjectFromGoal> {
  const prompt = `Convert this goal into an actionable project:\n"${goalTitle}"\nGenerate 5-7 concrete tasks. Reply JSON only: {"title":"project title","steps":["step 1","step 2"],"emoji":"single emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality"}`;
  try {
    const raw   = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiProjectFromGoal;
  } catch {
    return { title: goalTitle, steps: [] };
  }
}

export interface JourneyPlanResult {
  title: string;
  area: string;
  description: string;
  weeks: number;
  minutesPerDay: number;
  weekPlan: {
    week: number;
    focus: string;
    actions: { title: string; duration: string; description: string }[];
  }[];
}

export async function generateJourneyPlan(
  goal: string,
  options: { area?: string | null; weeks?: number; minsPerDay?: number; areasCatalog?: string }
): Promise<JourneyPlanResult> {
  const { area, weeks = 4, minsPerDay = 15, areasCatalog = '' } = options;
  const prompt = `You are an AI journey designer. Create a structured self-improvement journey based on the user's goal.\n\nAvailable life areas: ${areasCatalog}\n\nUser preferences: ${area ? `Area: ${area}` : 'Auto-detect best area'}, Duration: ${weeks} weeks, Time commitment: ${minsPerDay} min/day.\n\nRespond ONLY with valid JSON, no markdown backticks:\n{\n  "title": "Journey title (concise, action-oriented)",\n  "area": "area_id from list above",\n  "description": "1-2 sentence description",\n  "weeks": ${weeks},\n  "minutesPerDay": ${minsPerDay},\n  "weekPlan": [\n    {\n      "week": 1,\n      "focus": "Week theme (2-3 words)",\n      "actions": [\n        {"title": "Action name", "duration": "X minutes", "description": "Brief how-to"}\n      ]\n    }\n  ]\n}\n\nEach week should have 3-4 daily actions. Make actions specific, actionable, and progressive. Never use em dashes.\n\nMy goal: ${goal}`;

  try {
    const raw  = await aiAssist(prompt);
    const text = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(text) as JourneyPlanResult;
  } catch {
    return {
      title: `Custom: ${goal.slice(0, 30)}`,
      area: area || 'personal',
      description: `A personalized journey to help you ${goal.toLowerCase()}.`,
      weeks,
      minutesPerDay: minsPerDay,
      weekPlan: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        focus: i === 0 ? 'Foundation' : i === weeks - 1 ? 'Integration' : `Week ${i + 1} Focus`,
        actions: [
          { title: 'Morning intention setting', duration: '5 minutes', description: 'Start each day by writing your specific intention for this week\'s focus.' },
          { title: 'Core practice', duration: `${Math.max(5, minsPerDay - 10)} minutes`, description: 'Dedicated time for your main activity this week.' },
          { title: 'Evening reflection', duration: '5 minutes', description: 'Review what worked, what did not, and what to adjust tomorrow.' },
        ],
      })),
    };
  }
}
