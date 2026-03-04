import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────
// M3NTOR theme — ported from prototype T object
// ─────────────────────────────────────────────────────────

export const T = {
  brand:   '#6C5CE7',
  green:   '#00B894',
  orange:  '#FDCB6E',
  red:     '#E17055',
  blue:    '#0984E3',
  purple:  '#9B59B6',

  text:    '#1A1A2E',
  t2:      '#4A4A6A',
  t3:      '#9090B0',

  sep:     '#E8E4F4',
  fill:    '#F4F2FF',
  bg:      '#F4F2FF',

  // Gradient colours (use with expo-linear-gradient)
  gradStart: '#6C5CE7',
  gradEnd:   '#8E78FF',
  gradColors: ['#6C5CE7', '#8E78FF'] as const,

  // Glass effect background
  glass:     'rgba(255,255,255,0.72)',
  glassHeavy:'rgba(255,255,255,0.94)',
} as const;

// ── Shadows ───────────────────────────────────────────────
// React Native shadows (replaces CSS box-shadow)
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

// ── Spacing ───────────────────────────────────────────────
export const S = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ── Border radii ──────────────────────────────────────────
export const R = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  pill:99,
} as const;

// ── Typography sizes ──────────────────────────────────────
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
