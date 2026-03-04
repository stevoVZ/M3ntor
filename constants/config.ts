export interface AreaConfig {
  key: string;
  label: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons' | 'Feather';
  color: string;
  tint: string;
}

export const ITEM_AREAS: AreaConfig[] = [
  { key: 'health', label: 'Health', icon: 'heart', iconFamily: 'Ionicons', color: '#FF3B30', tint: 'rgba(255, 59, 48, 0.1)' },
  { key: 'career', label: 'Career', icon: 'briefcase', iconFamily: 'Ionicons', color: '#007AFF', tint: 'rgba(0, 122, 255, 0.1)' },
  { key: 'finance', label: 'Finance', icon: 'wallet', iconFamily: 'Ionicons', color: '#34C759', tint: 'rgba(52, 199, 89, 0.1)' },
  { key: 'relationships', label: 'Relationships', icon: 'people', iconFamily: 'Ionicons', color: '#FF9500', tint: 'rgba(255, 149, 0, 0.1)' },
  { key: 'growth', label: 'Growth', icon: 'trending-up', iconFamily: 'Ionicons', color: '#5856D6', tint: 'rgba(88, 86, 214, 0.1)' },
  { key: 'creativity', label: 'Creativity', icon: 'color-palette', iconFamily: 'Ionicons', color: '#FF2D55', tint: 'rgba(255, 45, 85, 0.1)' },
  { key: 'home', label: 'Home', icon: 'home', iconFamily: 'Ionicons', color: '#5AC8FA', tint: 'rgba(90, 200, 250, 0.1)' },
  { key: 'fun', label: 'Fun', icon: 'game-controller', iconFamily: 'Ionicons', color: '#FFCC00', tint: 'rgba(255, 204, 0, 0.1)' },
];

export interface KindConfig {
  label: string;
  icon: string;
  color: string;
  tint: string;
}

export const KIND_CONFIG: Record<string, KindConfig> = {
  action: { label: 'Action', icon: 'checkmark-circle', color: '#007AFF', tint: 'rgba(0, 122, 255, 0.1)' },
  habit: { label: 'Habit', icon: 'repeat', color: '#34C759', tint: 'rgba(52, 199, 89, 0.1)' },
  goal: { label: 'Goal', icon: 'flag', color: '#FF9500', tint: 'rgba(255, 149, 0, 0.1)' },
  project: { label: 'Project', icon: 'layers', color: '#5856D6', tint: 'rgba(88, 86, 214, 0.1)' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#FF3B30' },
  high: { label: 'High', color: '#FF9500' },
  normal: { label: 'Normal', color: '#8E8E93' },
  low: { label: 'Low', color: '#C7C7CC' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#007AFF' },
  someday: { label: 'Someday', color: '#FF9500' },
  paused: { label: 'Paused', color: '#8E8E93' },
  done: { label: 'Done', color: '#34C759' },
};

export const JOURNEYS = [
  {
    id: 'fitness-30',
    title: '30-Day Fitness',
    description: 'Build a consistent exercise routine with progressive workouts tailored to your fitness level.',
    weeks: 4,
    category: 'Health',
    color: '#FF3B30',
    icon: 'fitness',
  },
  {
    id: 'morning-routine',
    title: 'Morning Routine Builder',
    description: 'Design your ideal morning with habits that energize and focus your day ahead.',
    weeks: 3,
    category: 'Growth',
    color: '#FF9500',
    icon: 'sunny',
  },
  {
    id: 'career-growth',
    title: 'Career Growth Sprint',
    description: 'Advance your career with structured networking, skill-building, and goal-setting.',
    weeks: 6,
    category: 'Career',
    color: '#007AFF',
    icon: 'rocket',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness Journey',
    description: 'Cultivate inner calm through daily meditation, breathing, and awareness exercises.',
    weeks: 4,
    category: 'Growth',
    color: '#5856D6',
    icon: 'leaf',
  },
  {
    id: 'financial-reset',
    title: 'Financial Reset',
    description: 'Take control of your finances with budgeting, saving, and investing habits.',
    weeks: 5,
    category: 'Finance',
    color: '#34C759',
    icon: 'cash',
  },
  {
    id: 'creative-spark',
    title: 'Creative Spark',
    description: 'Reignite your creativity with daily prompts, experiments, and artistic exploration.',
    weeks: 3,
    category: 'Creativity',
    color: '#FF2D55',
    icon: 'sparkles',
  },
];
