export type BaseProfileId = 'adhd' | 'autism' | 'dyslexia' | 'sensory' | null;
export type StateProfileId = 'anxiety' | 'low_energy' | null;

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl';
export type TaskLimitOption = 1 | 3 | 5 | null;

export interface NeuroAdaptations {
  fontScale: number;
  lineHeightScale: number;
  noItalics: boolean;
  taskLimit: TaskLimitOption;
  hideTaskCounts: boolean;
  alwaysShowDuration: boolean;
  accentColor: string;
  bgTint: string;
  mutedSaturation: boolean;
  largerTouchTargets: boolean;
  reduceMotion: boolean;
  greeting: string;
  encouragement: string;
}

export interface NeuroCustomOverrides {
  fontSizeLevel?: FontSizeLevel;
  taskLimit?: TaskLimitOption;
  hideTaskCounts?: boolean;
  alwaysShowDuration?: boolean;
  reduceMotion?: boolean;
  largerTouchTargets?: boolean;
}

const FONT_SCALE: Record<FontSizeLevel, number> = {
  sm: 0.9,
  md: 1.0,
  lg: 1.12,
  xl: 1.25,
};

export function fontScaleFromLevel(level: FontSizeLevel): number {
  return FONT_SCALE[level];
}

export interface NeuroProfile {
  id: BaseProfileId | StateProfileId;
  label: string;
  subtitle: string;
  icon: string;
  tagline: string;
  description: string;
  color: string;
  adaptations: Partial<NeuroAdaptations>;
}

export const DEFAULT_ADAPTATIONS: NeuroAdaptations = {
  fontScale: 1,
  lineHeightScale: 1,
  noItalics: false,
  taskLimit: null,
  hideTaskCounts: false,
  alwaysShowDuration: false,
  accentColor: '#4F46E5',
  bgTint: '#FFFFFF',
  mutedSaturation: false,
  largerTouchTargets: false,
  reduceMotion: false,
  greeting: 'Ready to go.',
  encouragement: '',
};

export const BASE_PROFILES: NeuroProfile[] = [
  {
    id: 'adhd',
    label: 'ADHD',
    subtitle: 'I get scattered easily',
    icon: 'zap',
    tagline: 'One chunk at a time',
    description: 'Limits task groups to 3, always shows time estimates, larger tap targets.',
    color: '#FF9500',
    adaptations: {
      fontScale: 1.05,
      lineHeightScale: 1.15,
      taskLimit: 3,
      alwaysShowDuration: true,
      accentColor: '#FF9500',
      bgTint: '#FFFBF5',
      largerTouchTargets: true,
      greeting: 'Let\'s focus.',
      encouragement: 'Three things at a time.',
    },
  },
  {
    id: 'autism',
    label: 'Autism / ASD',
    subtitle: 'I need predictable structure',
    icon: 'circle',
    tagline: 'Same structure, every time',
    description: 'Reduces motion, always shows duration, consistent layout and clear labels.',
    color: '#007AFF',
    adaptations: {
      alwaysShowDuration: true,
      accentColor: '#007AFF',
      bgTint: '#F5F8FF',
      reduceMotion: true,
      largerTouchTargets: true,
      greeting: 'Today\'s schedule.',
      encouragement: 'Same structure, every day.',
    },
  },
  {
    id: 'dyslexia',
    label: 'Dyslexia',
    subtitle: 'Reading takes more effort',
    icon: 'book-open',
    tagline: 'Easier to read',
    description: 'Larger text (+25%), generous line spacing, no italic fonts.',
    color: '#AF52DE',
    adaptations: {
      fontScale: 1.2,
      lineHeightScale: 1.55,
      noItalics: true,
      accentColor: '#AF52DE',
      bgTint: '#FDF8FF',
      greeting: 'Ready.',
      encouragement: 'Take your time.',
    },
  },
  {
    id: 'sensory',
    label: 'Sensory sensitivity',
    subtitle: 'Bright screens overwhelm me',
    icon: 'droplet',
    tagline: 'Quiet and calm',
    description: 'Muted palette, no animations, large tap targets, minimal visual noise.',
    color: '#5AC8FA',
    adaptations: {
      accentColor: '#5AC8FA',
      bgTint: '#F5FBFF',
      mutedSaturation: true,
      reduceMotion: true,
      largerTouchTargets: true,
      greeting: 'Today.',
      encouragement: 'Calm and steady.',
    },
  },
];

export const STATE_PROFILES: NeuroProfile[] = [
  {
    id: 'anxiety',
    label: 'Anxiety',
    subtitle: 'Feeling overwhelmed today',
    icon: 'wind',
    tagline: 'One step at a time',
    description: 'Shows only 1 task at a time, hides all counts, calming green tones.',
    color: '#34C759',
    adaptations: {
      taskLimit: 1,
      hideTaskCounts: true,
      accentColor: '#34C759',
      bgTint: '#F5FFF8',
      mutedSaturation: true,
      reduceMotion: true,
      greeting: 'You\'re doing great.',
      encouragement: 'Just the next one thing.',
    },
  },
  {
    id: 'low_energy',
    label: 'Low energy day',
    subtitle: 'Running on empty',
    icon: 'moon',
    tagline: 'Small wins count',
    description: 'Shows 3 tasks max, hides counts, warm encouraging tone.',
    color: '#FF6B2C',
    adaptations: {
      fontScale: 1.05,
      lineHeightScale: 1.2,
      taskLimit: 3,
      hideTaskCounts: true,
      accentColor: '#FF6B2C',
      bgTint: '#FFFAF5',
      largerTouchTargets: true,
      greeting: 'Small steps count.',
      encouragement: 'Do what you can \u2014 that\'s enough.',
    },
  },
];

export function mergeAdaptations(
  baseId: BaseProfileId,
  stateId: StateProfileId,
  custom: NeuroCustomOverrides,
): NeuroAdaptations {
  const base = BASE_PROFILES.find(p => p.id === baseId)?.adaptations ?? {};
  const state = STATE_PROFILES.find(p => p.id === stateId)?.adaptations ?? {};

  const merged: NeuroAdaptations = {
    ...DEFAULT_ADAPTATIONS,
    ...base,
    ...state,
  };

  if (custom.fontSizeLevel !== undefined) {
    merged.fontScale = fontScaleFromLevel(custom.fontSizeLevel);
    if (custom.fontSizeLevel === 'lg' || custom.fontSizeLevel === 'xl') {
      merged.lineHeightScale = Math.max(merged.lineHeightScale, 1.4);
    }
  }
  if (custom.taskLimit !== undefined) merged.taskLimit = custom.taskLimit;
  if (custom.hideTaskCounts !== undefined) merged.hideTaskCounts = custom.hideTaskCounts;
  if (custom.alwaysShowDuration !== undefined) merged.alwaysShowDuration = custom.alwaysShowDuration;
  if (custom.reduceMotion !== undefined) merged.reduceMotion = custom.reduceMotion;
  if (custom.largerTouchTargets !== undefined) merged.largerTouchTargets = custom.largerTouchTargets;

  return merged;
}

export function getBaseProfile(id: BaseProfileId): NeuroProfile | null {
  return BASE_PROFILES.find(p => p.id === id) ?? null;
}

export function getStateProfile(id: StateProfileId): NeuroProfile | null {
  return STATE_PROFILES.find(p => p.id === id) ?? null;
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
