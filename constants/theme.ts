import { Platform } from 'react-native';

export const T = {
  brand:   '#5856D6',
  green:   '#34C759',
  orange:  '#FF9500',
  red:     '#FF3B30',
  blue:    '#007AFF',
  purple:  '#AF52DE',

  text:    '#1C1C1E',
  t2:      '#48484A',
  t3:      '#8E8E93',

  sep:     '#E5E5EA',
  fill:    '#F2F2F7',
  bg:      '#FFFFFF',

  gradStart: '#5856D6',
  gradEnd:   '#7B79E8',
  gradColors: ['#5856D6', '#7B79E8'] as const,

  glass:     'rgba(242,242,247,0.72)',
  glassHeavy:'rgba(255,255,255,0.94)',

  dark:    '#141419',
} as const;

export const shadow = {
  xs: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,  elevation: 1 },
    android: { elevation: 1 },
    default: {},
  }),
  sm: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,  elevation: 2 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8,  elevation: 4 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios:     { shadowColor: T.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    android: { elevation: 8 },
    default: {},
  }),
  fab: Platform.select({
    ios:     { shadowColor: T.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.42, shadowRadius: 16, elevation: 12 },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

export const S = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const R = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  pill:99,
} as const;

export const F = {
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  h3:  22,
  h2:  26,
  h1:  32,
} as const;
