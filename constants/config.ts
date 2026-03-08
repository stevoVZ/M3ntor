import { T } from './theme';
import type { Journey } from '../types';

export { WA } from './weekly-actions';
export type { WeeklyAction } from './weekly-actions';

// ─────────────────────────────────────────────────────────
// ITEM_AREAS — life areas with display config
// ─────────────────────────────────────────────────────────
export const ITEM_AREAS: Record<string, { n: string; c: string; e: string }> = {
  health:        { n: 'Health & Fitness',  c: '#34C759', e: '❤️' },
  home:          { n: 'Home & Living',     c: '#FF9500', e: '🏠' },
  career:        { n: 'Career & Work',     c: '#007AFF', e: '💼' },
  finance:       { n: 'Finance',           c: '#FFCC00', e: '💰' },
  learning:      { n: 'Learning & Growth', c: '#4F46E5', e: '📚' },
  relationships: { n: 'Relationships',     c: '#FF2D55', e: '💜' },
  fun:           { n: 'Fun & Adventure',   c: '#FF9500', e: '✨' },
  life:          { n: 'Life Tasks',        c: '#8E8E93', e: '📌' },
  spirituality:  { n: 'Mind & Spirit',     c: '#AF52DE', e: '🌿' },
};

// ─────────────────────────────────────────────────────────
// AREAS — Wheel of Life areas (10 life dimensions)
// ─────────────────────────────────────────────────────────
export interface LifeArea {
  id: string;
  n: string;
  c: string;
  score: number;
  start: number;
  icon: string;
  desc: string;
}

export const AREAS: LifeArea[] = [
  { id: 'health',        n: 'Health',          c: '#34C759', score: 3, start: 5, icon: 'heart',     desc: 'Your physical wellbeing — energy levels, sleep quality, exercise habits, nutrition, and how your body feels day to day.' },
  { id: 'career',        n: 'Career',          c: '#007AFF', score: 4, start: 3, icon: 'briefcase', desc: 'Your professional life — job satisfaction, growth opportunities, skills development, work-life balance, and sense of purpose at work.' },
  { id: 'finances',      n: 'Finances',        c: '#FF9500', score: 5, start: 4, icon: 'dollar',    desc: 'Your financial health — income, savings, debt management, spending habits, and confidence in your financial future.' },
  { id: 'relationships', n: 'Relationships',   c: '#FF2D55', score: 7, start: 6, icon: 'people',    desc: 'Your close connections — quality of friendships, communication with family, trust, boundaries, and feeling supported.' },
  { id: 'personal',      n: 'Personal Growth', c: '#AF52DE', score: 6, start: 5, icon: 'star',      desc: 'Your self-development — habits, mindset, learning, confidence, self-awareness, and progress toward becoming who you want to be.' },
  { id: 'social',        n: 'Social',          c: '#5AC8FA', score: 5, start: 5, icon: 'chat',      desc: 'Your social life — community, belonging, social activities, meeting new people, and the richness of your social connections.' },
  { id: 'love',          n: 'Love',            c: '#FF375F', score: 8, start: 8, icon: 'heart2',    desc: 'Your romantic life — intimacy, partnership quality, emotional connection, shared goals, and feeling loved and valued.' },
  { id: 'fun',           n: 'Fun',             c: '#FF6B2C', score: 4, start: 3, icon: 'zap',       desc: 'Your joy and play — hobbies, creativity, adventure, laughter, and making time for things that light you up.' },
  { id: 'environment',   n: 'Environment',     c: '#30D158', score: 6, start: 5, icon: 'home',      desc: 'Your physical spaces — home comfort, workspace setup, organization, surroundings that support your goals and calm your mind.' },
  { id: 'spirituality',  n: 'Spirituality',    c: '#BF5AF2', score: 5, start: 4, icon: 'sun',       desc: 'Your inner life — mindfulness, meditation, sense of meaning, gratitude, connection to something bigger, and inner peace.' },
];

export const getArea = (id: string): LifeArea | undefined => AREAS.find((a) => a.id === id);

// ─────────────────────────────────────────────────────────
// AREA_BRIDGE — maps Wheel area IDs to ITEM_AREAS IDs
// ─────────────────────────────────────────────────────────
const AREA_BRIDGE: Record<string, string> = {
  finances: 'finance',
  personal: 'learning',
  environment: 'home',
};

export function normalizeAreaId(id: string): string {
  return AREA_BRIDGE[id] || id;
}

export function resolveArea(id: string): { c: string; n: string; e: string } {
  const normalized = normalizeAreaId(id);
  const ia = ITEM_AREAS[normalized];
  const la = getArea(id);
  return { c: ia?.c || la?.c || T.brand, n: ia?.n || la?.n || id, e: ia?.e || '' };
}

export function scoreLabel(score: number): string {
  if (score <= 3) return 'Needs focus';
  if (score <= 5) return 'Building';
  if (score <= 7) return 'Growing';
  return 'Strong';
}

export function scoreTier(score: number): { label: string; color: string } {
  if (score <= 3) return { label: 'Needs focus', color: '#FF3B30' };
  if (score <= 5) return { label: 'Building', color: '#FF9500' };
  if (score <= 7) return { label: 'Growing', color: '#34C759' };
  return { label: 'Strong', color: '#007AFF' };
}

// ─────────────────────────────────────────────────────────
// KIND_CONFIG — display config per item kind
// ─────────────────────────────────────────────────────────
export const KIND_CONFIG = {
  habit:   { label: 'Habit',   color: T.orange,  icon: 'repeat',  order: 0 },
  journey: { label: 'Journey', color: T.brand,   icon: 'compass', order: 1 },
  project: { label: 'Project', color: T.green,   icon: 'folder',  order: 2 },
  action:  { label: 'Action',  color: T.t3,      icon: 'check',   order: 3 },
  goal:    { label: 'Goal',    color: '#AF52DE',  icon: 'target',  order: 4 },
} as const;

// ─────────────────────────────────────────────────────────
// PRIORITY config
// ─────────────────────────────────────────────────────────
export const PRIORITY = {
  urgent: { label: 'Urgent', color: '#E53E3E', bg: '#FFF5F5', icon: '⚡' },
  high:   { label: 'High',   color: '#DD6B20', bg: '#FFFAF0', icon: '🔺' },
  normal: { label: 'Normal', color: T.t3,      bg: T.fill,    icon: ''   },
  low:    { label: 'Low',    color: '#718096',  bg: T.fill,    icon: '🔽' },
} as const;

// ─────────────────────────────────────────────────────────
// EFFORT config
// ─────────────────────────────────────────────────────────
export const EFFORT = {
  quick:  { label: 'Quick',  sub: '< 15 min',  color: T.green,  emoji: '⚡' },
  medium: { label: 'Medium', sub: '~1–2 hrs',   color: T.orange, emoji: '🔧' },
  deep:   { label: 'Deep',   sub: 'Half day+',  color: T.brand,  emoji: '🧠' },
} as const;

// ─────────────────────────────────────────────────────────
// STEP_STATUS config
// ─────────────────────────────────────────────────────────
export const STEP_STATUS = {
  todo:    { label: 'To do',       color: T.t3,      dot: '#CBD5E0' },
  doing:   { label: 'In progress', color: T.brand,   dot: T.brand   },
  blocked: { label: 'Blocked',     color: '#E53E3E',  dot: '#E53E3E' },
  done:    { label: 'Done',        color: T.green,   dot: T.green   },
} as const;

// ─────────────────────────────────────────────────────────
// PRG — Journey catalog (static, expert-curated programs)
// ─────────────────────────────────────────────────────────
export const PRG: Journey[] = [
  { id: 'sleep',       a: 'health',        sa: ['learning'],           t: 'Optimize Your Sleep',      e: 'Andrew Huberman',  w: 6, d: 'beginner', m: 15,  u: 2840, rt: 4.8, f: true,  ds: 'Transform your sleep using neuroscience-backed protocols.',    wp: ['Sleep audit','Morning light','Wind-down design','Temperature','Consistency','Maintenance'], scope: 'global' },
  { id: 'strength',    a: 'health',                                     t: 'Strength Foundations',     e: 'Jeff Nippard',     w: 8, d: 'moderate', m: 30,  u: 1920, rt: 4.7,           ds: 'Build sustainable strength training from scratch.',            wp: ['Assessment','Push/pull','Lower body','Full-body','Overload','Volume','Deload','Programming'], scope: 'global' },
  { id: 'nutrition',   a: 'health',        sa: ['learning'],           t: 'Science-Based Nutrition',  e: 'Layne Norton',     w: 6, d: 'beginner', m: 10,  u: 3100, rt: 4.9,           ds: 'Sustainable eating based on actual science.',                  wp: ['Diet audit','Macros','Meal prep','Social eating','Psychology','Maintenance'], scope: 'global' },
  { id: 'running',     a: 'health',        sa: ['fun','learning'],     t: 'Couch to Runner',          e: 'Research-based',   w: 8, d: 'beginner', m: 25,  u: 1560, rt: 4.6,           ds: 'Zero to 3× per week without burnout.',                        wp: ['Walk/run','15-min run','Consistency','Distance','Form','Speed','30 min','Race prep'], scope: 'global' },
  { id: 'deepwork',    a: 'career',                                     t: 'Deep Work Protocol',       e: 'Cal Newport',      w: 4, d: 'moderate', m: 20,  u: 4200, rt: 4.8, f: true,  ds: 'Eliminate distraction. Build focus blocks.',                   wp: ['Distraction audit','First block','Daily practice','Long-term ritual'], scope: 'global' },
  { id: 'leadership',  a: 'career',                                     t: 'Leadership Essentials',    e: 'Research-based',   w: 6, d: 'moderate', m: 15,  u: 1800, rt: 4.5,           ds: 'Develop communication and delegation skills.',                 wp: ['Style assessment','Listening','Delegation','Hard conversations','Culture','Vision'], scope: 'global' },
  { id: 'negotiate',   a: 'career',                                     t: 'Negotiation Mastery',      e: 'Chris Voss',       w: 4, d: 'advanced', m: 15,  u: 2100, rt: 4.7,           ds: 'Tactical empathy from a former FBI negotiator.',               wp: ['Empathy','Mirroring','Questions','Closing'], scope: 'global' },
  { id: 'career-pivot',a: 'career',                                     t: 'Career Pivot Blueprint',   e: 'Research-based',   w: 6, d: 'moderate', m: 20,  u: 980,  rt: 4.4,           ds: 'Systematic career change planning.',                           wp: ['Values','Exploration','Interviews','Skill gaps','Transition','First steps'], scope: 'global' },
  { id: 'financial',   a: 'finance',       sa: ['learning','career'],  t: 'Financial Foundations',    e: 'Ramit Sethi',      w: 4, d: 'beginner', m: 15,  u: 3600, rt: 4.8,           ds: 'Automate finances on autopilot.',                              wp: ['Automation','Spending plan','Debt strategy','Investing'], scope: 'regional', regions: ['US','CA'] },
  { id: 'investing',   a: 'finance',                                    t: 'Investing Fundamentals',   e: 'Morgan Housel',    w: 4, d: 'beginner', m: 15,  u: 2400, rt: 4.7,           ds: 'Behaviour over stock picks.',                                  wp: ['Psychology','Allocation','Accounts','Strategy'], scope: 'global' },
  { id: 'side-income', a: 'finance',                                    t: 'Side Income Builder',      e: 'Research-based',   w: 6, d: 'moderate', m: 20,  u: 1340, rt: 4.3,           ds: 'Validate ideas without quitting.',                             wp: ['Skills','Validation','MVP','Customers','Time','Scaling'], scope: 'global' },
  { id: 'communication',a:'relationships',                              t: 'Communication Mastery',    e: 'John Gottman',     w: 4, d: 'beginner', m: 15,  u: 2900, rt: 4.8,           ds: '40 years of relationship research.',                           wp: ['Patterns','Listening','Repair','Positivity'], scope: 'global' },
  { id: 'boundaries',  a: 'relationships',                              t: 'Healthy Boundaries',       e: 'Nedra Tawwab',     w: 3, d: 'beginner', m: 10,  u: 2200, rt: 4.6,           ds: 'Say no without guilt.',                                        wp: ['Patterns','Setting','Difficult people'], scope: 'global' },
  { id: 'habits',      a: 'learning',                                   t: 'Atomic Habits Builder',    e: 'James Clear',      w: 6, d: 'beginner', m: 10,  u: 5200, rt: 4.9, f: true,  ds: 'Systems that make good habits automatic.',                     wp: ['Audit','Cues','Response','Rewards','Stacking','Systems'], scope: 'global' },
  { id: 'mindfulness', a: 'spirituality',  sa: ['health','learning'],  t: 'Mindfulness & Meditation', e: 'Jon Kabat-Zinn',   w: 4, d: 'beginner', m: 10,  u: 3400, rt: 4.8,           ds: 'Build a sustainable meditation habit.',                        wp: ['Breath','Body scan','Walking','Anchoring'], scope: 'global' },
  { id: 'gratitude',   a: 'spirituality',                              t: 'Gratitude Practice',       e: 'Research-based',   w: 3, d: 'beginner', m: 5,   u: 2100, rt: 4.6,           ds: 'Structured gratitude beyond simple lists.',                    wp: ['Journaling','Expressing','Adversity'], scope: 'global' },
  { id: 'creativity',  a: 'fun',                                        t: 'Creative Spark',           e: 'Research-based',   w: 4, d: 'beginner', m: 15,  u: 720,  rt: 4.4,           ds: 'Unlock creativity regardless of your job.',                    wp: ['Identity','Micro-creation','Frameworks','Launch'], scope: 'global' },
  { id: 'space',       a: 'environment',                                t: 'Space Design',             e: 'Research-based',   w: 3, d: 'beginner', m: 15,  u: 680,  rt: 4.3,           ds: 'Redesign your environment for goals.',                         wp: ['Friction mapping','Workspace','Home'], scope: 'global' },
  { id: 'barefoot',    a: 'finance',       sa: ['learning'],           t: 'Barefoot Money Plan',      e: 'Scott Pape',       w: 4, d: 'beginner', m: 15,  u: 1850, rt: 4.7,           ds: 'The Barefoot Investor system for Australians.',                wp: ['Bucket setup','Super check','Insurance','Mojo account'], scope: 'regional', regions: ['AU','NZ'] },
  { id: 'moneysave-uk',a: 'finance',       sa: ['learning'],           t: 'Money Saving Expert Plan', e: 'Martin Lewis',     w: 4, d: 'beginner', m: 10,  u: 2200, rt: 4.8,           ds: 'UK-focused saving, ISAs, and deals strategy.',                 wp: ['Bill audit','ISA setup','Credit score','Cashback'], scope: 'regional', regions: ['GB','IE'] },
  { id: 'fire-india',  a: 'finance',       sa: ['career'],             t: 'FIRE for India',           e: 'Research-based',   w: 6, d: 'moderate', m: 15,  u: 920,  rt: 4.5,           ds: 'Financial independence using Indian investment vehicles.',     wp: ['EPF/PPF','Mutual funds','Tax saving','SIP setup','Insurance','Goal mapping'], scope: 'regional', regions: ['IN'] },
];

export const DIFF = { beginner: { l: 'Beginner', c: '#34C759', n: 1 }, moderate: { l: 'Moderate', c: '#FF9500', n: 2 }, advanced: { l: 'Advanced', c: '#FF3B30', n: 3 } } as const;

export const JOURNEY_ICONS: Record<string, string> = { sleep: '🌙', strength: '💪', nutrition: '🥗', running: '🏃', deepwork: '🎯', leadership: '⭐', negotiate: '🤝', 'career-pivot': '🔄', financial: '💳', investing: '📈', 'side-income': '💡', communication: '💬', boundaries: '🛡️', habits: '⛓️', mindfulness: '🧘', gratitude: '🙏', creativity: '🎨', space: '🏠', barefoot: '🦶', 'moneysave-uk': '💷', 'fire-india': '🔥' };

export const MOODS = [
  { value: 1, label: 'Rough', icon: 'frown', color: '#FF3B30' },
  { value: 2, label: 'Low', icon: 'frown', color: '#FF9500' },
  { value: 3, label: 'Okay', icon: 'meh', color: '#FFD60A' },
  { value: 4, label: 'Good', icon: 'smile', color: '#34C759' },
  { value: 5, label: 'Great', icon: 'smile', color: '#30D158' },
] as const;

