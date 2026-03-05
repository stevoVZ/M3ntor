export interface Person {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface SampleSubtask {
  id: string;
  title: string;
  done: boolean;
  assignees: string[];
}

export interface SampleStep {
  id: string;
  title: string;
  done: boolean;
  assignees: string[];
  status?: string;
  priority?: string;
  effort?: string;
  description?: string;
  blockedBy?: string[];
  today?: boolean;
  subtasks?: SampleSubtask[];
}

export interface SampleItem {
  id: string;
  title: string;
  emoji: string;
  area: string;
  secondaryAreas?: string[];
  source: string;
  status: string;
  why?: string;
  description?: string;
  collaborators?: string[];
  deadline?: string;
  linkedItems?: string[];
  linkedJourneys?: string[];
  steps?: SampleStep[];
}

export interface CommittedDayAction {
  d: number;
  title: string;
  actions: string[];
  done: boolean;
}

export interface CommittedWeek {
  w: number;
  title: string;
  days: CommittedDayAction[];
}

export interface CommittedEntry {
  id: string;
  status: 'active' | 'queued' | 'completed';
  week: number;
  day: number;
  pct: number;
  weeks: CommittedWeek[];
}

export const PEOPLE: Person[] = [
  { id: 'me', name: 'Stevo', avatar: 'S', color: '#6C5CE7' },
  { id: 'p1', name: 'Sarah', avatar: 'S', color: '#E84393' },
  { id: 'p2', name: 'Jake', avatar: 'J', color: '#0984E3' },
  { id: 'p3', name: 'Mum', avatar: 'M', color: '#00B894' },
];

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    id: 'goal-finance', title: 'Buy a Porsche 911', emoji: '🏎️', area: 'finance',
    source: 'self', status: 'someday',
    collaborators: ['p1', 'p2', 'p3'],
    why: 'Life is short. I want to feel something every time I turn the key.',
    description: 'Buy a 992 Carrera S in GT Silver Metallic, manual. Target: 2027.',
    linkedItems: ['proj-porsche-savings', 'proj-porsche-research', 'proj-side-income'],
    linkedJourneys: ['financial', 'investing'],
  },
  {
    id: 'goal-health', title: 'Get healthier', emoji: '🌿', area: 'health',
    source: 'self', status: 'someday',
    linkedItems: [],
    linkedJourneys: ['nutrition', 'running'],
  },
  {
    id: 'proj-porsche-savings', title: 'Build the Porsche fund', emoji: '💰',
    area: 'finance', source: 'self', status: 'active',
    deadline: '2027-06-01',
    description: 'Dedicated savings account targeting $90k AUD by mid-2027. Covers car + on-roads + first year insurance.',
    collaborators: ['p2'],
    steps: [
      { id: 'ps1', title: 'Open a dedicated high-interest savings account', done: true, assignees: ['me'], status: 'done', priority: 'high', effort: 'quick' },
      { id: 'ps2', title: 'Set up $2k auto-transfer each month', done: true, assignees: ['me'], status: 'done', priority: 'high', effort: 'quick', blockedBy: [] },
      { id: 'ps3', title: 'Calculate total target inc. on-roads & insurance', done: false, assignees: ['me', 'p2'], status: 'doing', priority: 'normal', effort: 'medium', description: 'Get real quotes, don\'t just guess', today: true },
      { id: 'ps4', title: 'Review and cut 3 unnecessary subscriptions', done: false, assignees: [], status: 'todo', priority: 'low', effort: 'quick', blockedBy: ['ps3'] },
      { id: 'ps5', title: 'Hit $50k milestone 🎉', done: false, assignees: [], status: 'todo', priority: 'high', effort: 'deep', blockedBy: ['ps3', 'ps4'], today: true },
    ],
  },
  {
    id: 'proj-porsche-research', title: 'Research the right 911 spec', emoji: '🔍',
    area: 'finance', secondaryAreas: ['fun'], source: 'self', status: 'active',
    description: 'Figure out exactly what I want so I\'m not making a $180k impulse decision.',
    collaborators: ['p1', 'p2'],
    steps: [
      { id: 'pr1', title: 'Decide: new vs. certified pre-owned', done: true, assignees: ['me'], status: 'done', priority: 'urgent', effort: 'medium' },
      { id: 'pr2', title: 'Compare Carrera, Carrera S and GTS trims', done: false, assignees: ['p1'], status: 'doing', priority: 'high', effort: 'medium', description: 'Focus on the S vs GTS value gap at current pricing', blockedBy: [], today: true,
        subtasks: [
          { id: 'pr2a', title: 'Check Porsche configurator pricing', done: false, assignees: ['me'] },
          { id: 'pr2b', title: 'Read Top Gear and Drive reviews', done: true, assignees: ['p1'] },
          { id: 'pr2c', title: 'Watch GTS vs Carrera S video comparison', done: false, assignees: [] },
        ],
      },
      { id: 'pr3', title: 'Book test drive at Porsche Centre', done: false, assignees: ['me'], status: 'todo', priority: 'high', effort: 'quick', blockedBy: ['pr2'] },
      { id: 'pr4', title: 'Get insurance quote for shortlisted models', done: false, assignees: ['p2'], status: 'todo', priority: 'normal', effort: 'quick', blockedBy: ['pr2'] },
    ],
  },
  {
    id: 'proj-side-income', title: 'Grow side income stream', emoji: '📈',
    area: 'career', secondaryAreas: ['finance'], source: 'self', status: 'active',
    collaborators: [],
    steps: [
      { id: 'si1', title: 'Identify 2-3 consulting opportunities', done: true, assignees: ['me'] },
      { id: 'si2', title: 'Close first paid consulting engagement', done: false, assignees: ['me'] },
      { id: 'si3', title: 'Build simple portfolio / one-pager', done: false, assignees: ['me'] },
      { id: 'si4', title: 'Reach $1k/month recurring side income', done: false, assignees: [] },
    ],
  },
];

export const SAMPLE_COMMITTED: CommittedEntry[] = [
  { id: 'sleep', status: 'active', week: 1, day: 5, pct: 79, weeks: [
    { w: 1, title: 'Sleep Foundations', days: [
      { d: 1, title: 'Audit your current sleep', actions: ['Track your bedtime and wake time for the past week', 'Rate your energy level 1-10 at 3 points today', 'Note any screen time in the last hour before bed'], done: true },
      { d: 2, title: 'Understand your chronotype', actions: ['Read about the 4 sleep chronotypes', 'Identify which pattern matches yours', 'Journal: When do you feel most alert?'], done: true },
      { d: 3, title: 'Set your sleep window', actions: ['Choose a consistent bedtime (±15 min)', 'Set a wake-up alarm for the same time daily', 'Calculate your ideal 7-9 hour window'], done: true },
      { d: 4, title: 'Evening wind-down ritual', actions: ['Create a 30-minute pre-bed routine', 'Remove screens from the bedroom', 'Try 5 minutes of deep breathing before bed'], done: true },
      { d: 5, title: 'Optimize your environment', actions: ['Set bedroom temperature to 65-68°F', 'Evaluate light sources — add blackout if needed', 'Rate your mattress/pillow comfort 1-10'], done: false },
      { d: 6, title: 'Caffeine & timing', actions: ['Log all caffeine intake with timestamps', 'Set a caffeine cutoff 8 hours before bed', 'Replace one afternoon coffee with water'], done: false },
      { d: 7, title: 'Week 1 reflection', actions: ['Compare this week\'s sleep scores to baseline', 'Identify the one change that helped most', 'Set an intention for Week 2'], done: false },
    ]},
    { w: 2, title: 'Building Consistency', days: [
      { d: 1, title: 'Morning light exposure', actions: ['Get 10 min of sunlight within 30 min of waking', 'Notice energy shift after morning light', 'Journal your mood at midday'], done: false },
      { d: 2, title: 'Nap strategy', actions: ['If you nap, keep it under 20 min before 2pm', 'Track post-nap energy vs no-nap days', 'Experiment with a coffee nap'], done: false },
      { d: 3, title: 'Movement timing', actions: ['Exercise at least 4 hours before bed', 'Try a gentle evening stretch routine', 'Notice how exercise affects sleep quality'], done: false },
      { d: 4, title: 'Food & sleep', actions: ['Stop eating 2-3 hours before bed', 'Avoid heavy meals at dinner', 'Try a sleep-promoting snack: cherry, kiwi, or almonds'], done: false },
      { d: 5, title: 'Stress dump', actions: ['Write tomorrow\'s to-do list before bed', 'Do a 5-minute brain dump in a journal', 'Practice the 4-7-8 breathing technique'], done: false },
      { d: 6, title: 'Weekend consistency', actions: ['Keep the same wake time on weekends', 'Resist the urge to \'catch up\' on sleep', 'Plan a relaxing Saturday evening routine'], done: false },
      { d: 7, title: 'Week 2 check-in', actions: ['Rate your sleep quality trend 1-10', 'Note which habits are sticking', 'Adjust one thing that isn\'t working'], done: false },
    ]},
  ]},
  { id: 'deepwork', status: 'queued', week: 0, day: 0, pct: 0, weeks: [] },
  { id: 'habits', status: 'completed', week: 6, day: 42, pct: 100, weeks: [] },
  { id: 'mindfulness', status: 'active', week: 2, day: 3, pct: 35, weeks: [
    { w: 1, title: 'Awareness', days: [
      { d: 1, title: 'Your first sit', actions: ['Find a quiet spot and sit for 5 minutes', 'Focus only on your breath', 'Notice when your mind wanders — gently return'], done: true },
      { d: 2, title: 'Body scan', actions: ['Do a 10-minute body scan meditation', 'Notice areas of tension without judging', 'Breathe into tight spots'], done: true },
      { d: 3, title: 'Mindful eating', actions: ['Eat one meal without screens', 'Chew slowly, notice textures and flavors', 'Put your fork down between bites'], done: true },
    ]},
    { w: 2, title: 'Deepening Practice', days: [
      { d: 1, title: 'Extend your sit', actions: ['Sit for 10 minutes today', 'Count breaths: 1 to 10, then restart', 'If you lose count, begin again at 1'], done: true },
      { d: 2, title: 'Walking meditation', actions: ['Take a 10-minute slow walk', 'Focus on the sensation of each step', 'Notice the ground, air, and sounds around you'], done: true },
      { d: 3, title: 'Thought observation', actions: ['Sit for 10 minutes', 'Label thoughts as \'thinking\' when they arise', 'Don\'t follow the thought — let it pass'], done: false },
    ]},
  ]},
  { id: 'communication', status: 'active', week: 3, day: 1, pct: 60, weeks: [] },
  { id: 'strength', status: 'active', week: 2, day: 4, pct: 25, weeks: [] },
  { id: 'nutrition', status: 'active', week: 1, day: 3, pct: 17, weeks: [] },
  { id: 'financial', status: 'active', week: 3, day: 2, pct: 75, weeks: [] },
  { id: 'space', status: 'active', week: 2, day: 1, pct: 50, weeks: [] },
];
