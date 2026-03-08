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

export async function getItemHint(text: string, _type?: string, country?: string): Promise<AiHint> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const prompt = `The user wants to do: "${text}"${countryCtx}${noApps}\nAnalyze this and reply JSON only: {"why":"one short motivational sentence why this matters","tip":"one practical tip to get started or stay consistent","firstStep":"the single best first action to take","effort":"quick|medium|deep","suggestedType":"action|habit|goal|project","typeReason":"one short sentence explaining why this type fits best"}`;
  try {
    const raw   = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiHint;
  } catch {
    return {};
  }
}

export interface AiComplexity {
  complex: boolean;
  questions: string[];
}

export async function assessProjectComplexity(title: string, country?: string): Promise<AiComplexity> {
  const countryCtx = country ? `\nThe user is based in ${country}.` : '';
  const prompt = `Assess this project: "${title}"${countryCtx}\nIs this a complex project (multi-phase, multi-month, requires domain knowledge, many dependencies, or involves significant planning)? If yes, generate 2-3 short clarifying questions that would help create a better task breakdown. If it's simple (can be done in a day or two, straightforward steps), mark as not complex.\nReply JSON only: {"complex":true/false,"questions":["question 1","question 2"]}`;
  try {
    const raw = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiComplexity;
  } catch {
    return { complex: false, questions: [] };
  }
}

export interface AiTaskItem {
  title: string;
  effort?: 'quick' | 'medium' | 'deep';
}

export interface AiTasks {
  tasks: AiTaskItem[];
  emoji?: string;
  why?:   string;
}

export async function generateProjectTasks(title: string, existing: string[] = [], country?: string, context?: string): Promise<AiTasks> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const effortNote = `\nFor each task, estimate effort: "quick" (< 15 min), "medium" (~1-2 hrs), or "deep" (half day+).`;
  const prompt = existing.length
    ? `Project: "${title}"${countryCtx}${noApps}${contextCtx}${effortNote}\nExisting phases/steps: ${existing.join(', ')}\nGenerate 3-5 additional major phases or steps NOT yet covered. Focus on significant project phases that are missing, not minor sub-tasks of existing steps. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium"}],"emoji":"emoji"}`
    : `Project: "${title}"${countryCtx}${noApps}${contextCtx}${effortNote}\nGenerate 5-7 concrete actionable tasks in logical order. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium"}],"emoji":"emoji","why":"one sentence"}`;
  try {
    const raw    = await aiAssist(prompt);
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      if (typeof parsed.tasks[0] === 'string') {
        parsed.tasks = parsed.tasks.map((t: string) => ({ title: t, effort: 'medium' }));
      }
    }
    return parsed as AiTasks;
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
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const prompt = `Habit: "${title}"${countryCtx}${noApps}${contextCtx}\nHelp plan this habit. Reply JSON only: {"schedule":"a brief recommended schedule, e.g. 'Every morning for 10 minutes'","tip":"one practical tip for building this habit consistently","why":"one motivational sentence about why this habit matters","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality"}`;
  try {
    const raw = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiHabitPlan;
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
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const prompt = `Action: "${title}"${countryCtx}${noApps}${contextCtx}\nHelp plan this action. Reply JSON only: {"tip":"one practical tip for completing this effectively","bestTime":"morning|afternoon|evening","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality"}`;
  try {
    const raw = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as AiActionPlan;
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
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const noApps = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;
  const effortNote = `\nFor each task, estimate effort: "quick" (< 15 min), "medium" (~1-2 hrs), or "deep" (half day+).`;
  const siblingsCtx = siblingPhases.length
    ? `\nOther phases in this project: ${siblingPhases.join(', ')}. Do NOT generate tasks that belong to those phases.`
    : '';
  const existingCtx = existingSubtasks.length
    ? `\nAlready has these sub-steps: ${existingSubtasks.join(', ')}. Do NOT repeat them.`
    : '';
  const prompt = `Project: "${projectTitle}"${countryCtx}${noApps}${effortNote}\nPhase to expand: "${phaseTitle}"${siblingsCtx}${existingCtx}\nBreak down this specific phase into 3-5 detailed, actionable sub-steps. These should be concrete tasks that someone would do during the "${phaseTitle}" phase only. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium"}]}`;
  try {
    const raw = await aiAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      if (typeof parsed.tasks[0] === 'string') {
        parsed.tasks = parsed.tasks.map((t: string) => ({ title: t, effort: 'medium' }));
      }
    }
    return parsed as AiTasks;
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

