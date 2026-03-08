import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const MODEL = 'claude-sonnet-4-5';

async function rawAssist(prompt: string, system?: string): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

function buildSystemPrompt(country?: string): string {
  const countryCtx = country ? `\nThe user is based in ${country}. Tailor all advice, examples, platforms, financial systems, and cultural references to their region. Use locally relevant services and terminology.` : '';
  return `You are M3NTOR, an AI life coach and productivity assistant. You help users organize their life into actionable items across these areas: Health, Career, Finance, Relationships, Growth, Creativity, Home, Fun.${countryCtx}

When the user describes something they want to do, you analyze it and return a JSON object with your suggestions:

{
  "area": "one of: health, career, finance, relationships, growth, creativity, home, fun",
  "kind": "one of: action (one-off task), habit (recurring), goal (aspiration), project (multi-step)",
  "description": "a helpful 1-2 sentence description or tip",
  "steps": ["step 1", "step 2", ...] // only for projects, 3-6 steps
  "timeOfDay": "morning, afternoon, or evening" // only for habits
}

Be concise and practical. Return ONLY valid JSON, no extra text.`;
}

export async function aiAssist(prompt: string, country?: string): Promise<{
  area?: string;
  kind?: string;
  description?: string;
  steps?: string[];
  timeOfDay?: string;
}> {
  try {
    const raw = await rawAssist(prompt, buildSystemPrompt(country));
    return JSON.parse(raw);
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
    const raw = await rawAssist(
      prompts[kind] || prompts.action,
      'You are a concise life coach. Respond with exactly one sentence, no quotes.',
    );
    return raw.trim();
  } catch (error) {
    console.error('getItemHint error:', error);
    return '';
  }
}

const NO_APPS = `\nNever recommend apps, websites, software, or third-party services. Only suggest actions the user can do themselves.`;

export async function getItemHintRich(text: string, country?: string): Promise<Record<string, unknown>> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const prompt = `The user wants to do: "${text}"${countryCtx}${NO_APPS}\nAnalyze this and reply JSON only: {"why":"one short motivational sentence why this matters","tip":"one practical tip to get started or stay consistent","firstStep":"the single best first action to take","effort":"quick|medium|deep","suggestedType":"action|habit|goal|project","typeReason":"one short sentence explaining why this type fits best"}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

export async function assessProjectComplexity(title: string, country?: string): Promise<{ complex: boolean; questions: string[] }> {
  const countryCtx = country ? `\nThe user is based in ${country}.` : '';
  const prompt = `Assess this project: "${title}"${countryCtx}\nIs this a complex project (multi-phase, multi-month, requires domain knowledge, many dependencies, or involves significant planning)? If yes, generate 2-3 short clarifying questions that would help create a better task breakdown. If it's simple (can be done in a day or two, straightforward steps), mark as not complex.\nReply JSON only: {"complex":true/false,"questions":["question 1","question 2"]}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { complex: false, questions: [] };
  }
}

export async function generateProjectTasksRich(title: string, existing: string[] = [], country?: string, context?: string): Promise<{ tasks: { title: string; effort?: string; phase?: string }[]; emoji?: string; why?: string }> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const effortNote = `\nFor each task, estimate effort: "quick" (< 15 min), "medium" (~1-2 hrs), or "deep" (half day+).`;
  const phaseNote = `\nGroup tasks into logical phases. Each task must include a "phase" field — a short label for the group it belongs to (e.g. "Planning", "Execution", "Review"). Tasks in the same phase share the same phase string.`;
  const prompt = existing.length
    ? `Project: "${title}"${countryCtx}${NO_APPS}${contextCtx}${effortNote}${phaseNote}\nExisting phases/steps: ${existing.join(', ')}\nGenerate 3-5 additional major phases or steps NOT yet covered. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium","phase":"Phase Name"}],"emoji":"emoji"}`
    : `Project: "${title}"${countryCtx}${NO_APPS}${contextCtx}${effortNote}${phaseNote}\nGenerate 5-7 concrete actionable tasks in logical order, grouped into 2-4 phases. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium","phase":"Phase Name"}],"emoji":"emoji","why":"one sentence"}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0 && typeof parsed.tasks[0] === 'string') {
      parsed.tasks = parsed.tasks.map((t: string) => ({ title: t, effort: 'medium' }));
    }
    return parsed;
  } catch {
    return { tasks: [] };
  }
}

export async function generateHabitPlan(title: string, context?: string, country?: string): Promise<Record<string, unknown>> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const prompt = `Habit: "${title}"${countryCtx}${NO_APPS}${contextCtx}\nHelp plan this habit. Reply JSON only: {"schedule":"a brief recommended schedule, e.g. 'Every morning for 10 minutes'","tip":"one practical tip for building this habit consistently","why":"one motivational sentence about why this habit matters","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality"}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

export async function generateActionPlan(title: string, context?: string, country?: string): Promise<Record<string, unknown>> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const contextCtx = context ? `\nAdditional context from the user:\n${context}` : '';
  const prompt = `Action: "${title}"${countryCtx}${NO_APPS}${contextCtx}\nHelp plan this action. Reply JSON only: {"tip":"one practical tip for completing this effectively","bestTime":"morning|afternoon|evening","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality"}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

export async function expandProjectPhase(projectTitle: string, phaseTitle: string, existingSubtasks: string[] = [], siblingPhases: string[] = [], country?: string): Promise<{ tasks: { title: string; effort?: string; phase?: string }[] }> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const effortNote = `\nFor each task, estimate effort: "quick" (< 15 min), "medium" (~1-2 hrs), or "deep" (half day+).`;
  const siblingsCtx = siblingPhases.length ? `\nOther phases in this project: ${siblingPhases.join(', ')}. Do NOT generate tasks that belong to those phases.` : '';
  const existingCtx = existingSubtasks.length ? `\nAlready has these sub-steps: ${existingSubtasks.join(', ')}. Do NOT repeat them.` : '';
  const prompt = `Project: "${projectTitle}"${countryCtx}${NO_APPS}${effortNote}\nPhase to expand: "${phaseTitle}"${siblingsCtx}${existingCtx}\nBreak down this specific phase into 3-5 detailed, actionable sub-steps. Reply JSON only: {"tasks":[{"title":"task 1","effort":"medium","phase":"${phaseTitle}"}]}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0 && typeof parsed.tasks[0] === 'string') {
      parsed.tasks = parsed.tasks.map((t: string) => ({ title: t, effort: 'medium' }));
    }
    return parsed;
  } catch {
    return { tasks: [] };
  }
}

export async function generateProjectTasks(title: string, description?: string): Promise<string[]> {
  try {
    const prompt = description
      ? `Break down this project into 4-8 concrete, actionable tasks:\n\nProject: ${title}\nDescription: ${description}\n\nReturn ONLY a JSON array of task title strings.`
      : `Break down this project into 4-8 concrete, actionable tasks:\n\nProject: ${title}\n\nReturn ONLY a JSON array of task title strings.`;
    const raw = await rawAssist(prompt, 'You are a project planning assistant. Return ONLY valid JSON arrays, no extra text.');
    return JSON.parse(raw) as string[];
  } catch (error) {
    console.error('generateProjectTasks error:', error);
    return [];
  }
}

export async function generateSubtasks(stepTitle: string, projectTitle: string): Promise<string[]> {
  try {
    const raw = await rawAssist(
      `Break down this task into 2-5 smaller subtasks:\n\nProject: ${projectTitle}\nTask: ${stepTitle}\n\nReturn ONLY a JSON array of subtask title strings.`,
      'You are a task breakdown assistant. Return ONLY valid JSON arrays, no extra text.',
    );
    return JSON.parse(raw) as string[];
  } catch (error) {
    console.error('generateSubtasks error:', error);
    return [];
  }
}

export async function generateGoal(description: string, country?: string): Promise<Record<string, unknown>> {
  const countryCtx = country ? `\nThe user is based in ${country}. Use locally relevant examples.` : '';
  const prompt = `Goal: "${description}"${countryCtx}${NO_APPS}\nEnrich this goal. Reply JSON only: {"title":"polished goal title","emoji":"single relevant emoji","area":"one of: health, career, finance, learning, relationships, fun, life, spirituality","why":"one emotional sentence about why this matters","journeyHints":["suggested journey/program name 1","name 2"],"firstSteps":["first concrete action","second action"]}`;
  try {
    const raw = await rawAssist(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { title: description };
  }
}

export async function generateBriefing(context: {
  journeyTitle: string;
  weekNum: number;
  dayNum: number;
  dayTitle: string;
  actionCount: number;
  streak: number;
}): Promise<string> {
  try {
    const raw = await rawAssist(
      `Write a brief morning briefing for someone on Day ${context.dayNum}, Week ${context.weekNum} of their "${context.journeyTitle}" journey. Today's focus: "${context.dayTitle}". They have ${context.actionCount} actions today. ${context.streak > 1 ? `They're on a ${context.streak}-day streak.` : ''} Keep it concise and motivating.`,
      'You are M3NTOR, a motivational life coach. Write a short, warm morning briefing (2-3 sentences). Be specific to the context given. No emojis. No bullet points.',
    );
    return raw.trim();
  } catch (error) {
    console.error('generateBriefing error:', error);
    return '';
  }
}
