import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Switch, Platform, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNeuroStore } from '../../lib/neuroStore';
import {
  BASE_PROFILES, STATE_PROFILES,
  getBaseProfile, getStateProfile,
  fontScaleFromLevel,
} from '../../constants/neuro';
import type {
  FontSizeLevel, TaskLimitOption, BaseProfileId, StateProfileId,
} from '../../constants/neuro';
import { T, S, R, F, shadow } from '../../constants/theme';

type SheetStep = 'base' | 'state' | 'custom';

const FONT_LEVELS: { value: FontSizeLevel; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];
const TASK_LIMITS: { value: TaskLimitOption; label: string }[] = [
  { value: 1, label: '1' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: null, label: 'All' },
];

function SegmentControl<V extends string | number | null>({
  options,
  value,
  onChange,
  color,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  color: string;
}) {
  return (
    <View style={seg.row}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            style={[seg.btn, active && { backgroundColor: color }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[seg.label, active && { color: 'white' }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: T.fill,
    borderRadius: R.sm,
    padding: 2,
    gap: 2,
  },
  btn: {
    flex: 1, paddingVertical: 7,
    alignItems: 'center', borderRadius: 7,
  },
  label: { fontSize: 12, fontWeight: '700' as const, color: T.t3 },
});

function ProfileCard({
  profile, active, onPress, compact = false,
}: {
  profile: { id: BaseProfileId | StateProfileId; label: string; subtitle: string; icon: string; tagline: string; description: string; color: string };
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[
        card.wrap,
        active && { backgroundColor: profile.color + '0E', borderColor: profile.color + '35' },
      ]}
      onPress={onPress}
    >
      <View style={[card.iconWrap, { backgroundColor: profile.color + '16' }]}>
        <Feather name={profile.icon as any} size={compact ? 18 : 20} color={profile.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={card.labelRow}>
          <Text style={[card.label, active && { color: profile.color }]}>{profile.label}</Text>
          <Text style={[card.subtitle, { color: profile.color + '80' }]}>{profile.subtitle}</Text>
        </View>
        {!compact && (
          <Text style={card.desc}>{profile.description}</Text>
        )}
      </View>
      {active
        ? <Feather name="check-circle" size={16} color={profile.color} />
        : <View style={card.emptyCheck} />
      }
    </Pressable>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: R.md, borderWidth: 1,
    borderColor: 'transparent', marginBottom: 6,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, flexWrap: 'wrap', marginBottom: 3 },
  label: { fontSize: F.sm + 1, fontWeight: '700' as const, color: T.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, fontWeight: '500' as const },
  desc: { fontSize: 11, color: T.t3, lineHeight: 15 },
  emptyCheck: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: T.sep },
});

function CustomisePanel() {
  const { customOverrides, patchCustom, resetCustom, adaptations, baseProfileId, stateProfileId } = useNeuroStore();

  const activeColor =
    getStateProfile(stateProfileId)?.color ??
    getBaseProfile(baseProfileId)?.color ??
    T.brand;

  const currentFontLevel: FontSizeLevel = customOverrides.fontSizeLevel ?? 'md';
  const currentTaskLimit: TaskLimitOption = customOverrides.taskLimit !== undefined
    ? customOverrides.taskLimit
    : adaptations.taskLimit;

  const hasOverrides = Object.keys(customOverrides).length > 0;

  return (
    <View style={cust.wrap}>
      <View style={cust.header}>
        <Feather name="sliders" size={13} color={activeColor} />
        <Text style={[cust.title, { color: activeColor }]}>Customise</Text>
        {hasOverrides && (
          <Pressable onPress={resetCustom} hitSlop={8}>
            <Text style={cust.reset}>Reset</Text>
          </Pressable>
        )}
      </View>

      <View style={cust.row}>
        <View style={cust.rowLeft}>
          <Text style={cust.rowLabel}>Text size</Text>
          <Text style={cust.rowSub}>Affects titles and body text</Text>
        </View>
        <SegmentControl<FontSizeLevel>
          options={FONT_LEVELS}
          value={currentFontLevel}
          onChange={v => patchCustom({ fontSizeLevel: v })}
          color={activeColor}
        />
      </View>

      <View style={cust.row}>
        <View style={cust.rowLeft}>
          <Text style={cust.rowLabel}>Tasks at once</Text>
          <Text style={cust.rowSub}>Shown per group before "complete one first"</Text>
        </View>
        <SegmentControl<TaskLimitOption>
          options={TASK_LIMITS}
          value={currentTaskLimit}
          onChange={v => patchCustom({ taskLimit: v })}
          color={activeColor}
        />
      </View>

      <View style={cust.divider} />

      {(
        [
          { key: 'hideTaskCounts',     label: 'Hide progress counts',  sub: 'No "3 of 7 done" counters' },
          { key: 'alwaysShowDuration', label: 'Always show durations', sub: 'Time estimate on every task' },
          { key: 'reduceMotion',       label: 'Reduce motion',         sub: 'Fewer animations' },
          { key: 'largerTouchTargets', label: 'Large tap targets',     sub: 'Bigger checkboxes and buttons' },
        ] as const
      ).map(({ key, label, sub }) => {
        const val: boolean = customOverrides[key] !== undefined
          ? !!customOverrides[key]
          : !!(adaptations as any)[key];
        return (
          <View key={key} style={cust.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={cust.rowLabel}>{label}</Text>
              <Text style={cust.rowSub}>{sub}</Text>
            </View>
            <Switch
              value={val}
              onValueChange={v => patchCustom({ [key]: v })}
              trackColor={{ true: activeColor, false: T.sep }}
              thumbColor="white"
              ios_backgroundColor={T.sep}
            />
          </View>
        );
      })}
    </View>
  );
}

const cust = StyleSheet.create({
  wrap: {
    marginTop: 8,
    backgroundColor: T.fill,
    borderRadius: R.lg,
    padding: 14,
    gap: 2,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  title: { fontSize: 13, fontWeight: '700' as const, flex: 1 },
  reset: { fontSize: 12, color: T.t3, fontWeight: '600' as const },
  row: {
    paddingVertical: 10, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.sep,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '600' as const, color: T.text, marginBottom: 2 },
  rowSub: { fontSize: 11, color: T.t3, lineHeight: 15 },
  divider: { height: 1, backgroundColor: T.sep, marginVertical: 6 },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.sep,
  },
});

export default function NeuroBanner() {
  const { baseProfileId, stateProfileId, setBase, setState } = useNeuroStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SheetStep>('base');
  const insets = useSafeAreaInsets();

  const base = getBaseProfile(baseProfileId);
  const state = getStateProfile(stateProfileId);

  const pillColor = state?.color ?? base?.color ?? T.t3;
  const pillLabel = base && state
    ? `${base.label}  ·  ${state.label}`
    : base
      ? base.label
      : state
        ? state.label
        : null;
  const pillIcon = base?.icon ?? state?.icon ?? 'cpu';

  function openSheet() {
    setStep('base');
    setOpen(true);
  }

  return (
    <>
      <Pressable
        style={[
          pill.wrap,
          pillLabel && { backgroundColor: pillColor + '14', borderColor: pillColor + '28' },
        ]}
        onPress={openSheet}
        hitSlop={8}
      >
        <Feather name={pillIcon as any} size={13} color={pillColor} />
        <Text style={[pill.label, pillLabel && { color: pillColor }]} numberOfLines={1}>
          {pillLabel ?? 'Neuro'}
        </Text>
        <Feather name="chevron-down" size={11} color={pillColor} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={sh.backdrop} onPress={() => setOpen(false)} />

          <View style={[sh.sheet, { paddingBottom: Math.max(insets.bottom, 28) }]}>
            <View style={sh.handle} />

            <View style={sh.header}>
              <View style={{ flex: 1 }}>
                {step === 'base' && (
                  <>
                    <Text style={sh.title}>Who you are</Text>
                    <Text style={sh.sub}>Persists across all sessions</Text>
                  </>
                )}
                {step === 'state' && (
                  <>
                    <Text style={sh.title}>How today feels</Text>
                    <Text style={sh.sub}>Resets at midnight</Text>
                  </>
                )}
                {step === 'custom' && (
                  <>
                    <Text style={sh.title}>Fine-tune</Text>
                    <Text style={sh.sub}>Overrides profile defaults</Text>
                  </>
                )}
              </View>

              <View style={sh.tabs}>
                {(['base', 'state', 'custom'] as SheetStep[]).map((s, i) => (
                  <Pressable
                    key={s}
                    style={[sh.tab, step === s && sh.tabActive]}
                    onPress={() => setStep(s)}
                  >
                    <Text style={[sh.tabLabel, step === s && sh.tabLabelActive]}>{i + 1}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Feather name="x" size={18} color={T.t3} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {step === 'base' && (
                <>
                  <Pressable
                    style={[card.wrap, !baseProfileId && { backgroundColor: T.brand + '0E', borderColor: T.brand + '30' }]}
                    onPress={() => setBase(null)}
                  >
                    <View style={[card.iconWrap, { backgroundColor: T.fill }]}>
                      <Feather name="star" size={20} color={T.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[card.label, !baseProfileId && { color: T.brand }]}>Default</Text>
                      <Text style={card.desc}>Standard M3NTOR experience</Text>
                    </View>
                    {!baseProfileId
                      ? <Feather name="check-circle" size={16} color={T.brand} />
                      : <View style={card.emptyCheck} />
                    }
                  </Pressable>

                  <View style={sh.divider} />

                  {BASE_PROFILES.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      active={baseProfileId === p.id}
                      onPress={() => setBase(p.id as any)}
                    />
                  ))}

                  <Pressable style={[sh.nextBtn, { backgroundColor: T.brand }]} onPress={() => setStep('state')}>
                    <Text style={sh.nextBtnText}>Next: How does today feel?</Text>
                    <Feather name="arrow-right" size={14} color="white" />
                  </Pressable>
                </>
              )}

              {step === 'state' && (
                <>
                  <Pressable
                    style={[card.wrap, !stateProfileId && { backgroundColor: T.brand + '0E', borderColor: T.brand + '30' }]}
                    onPress={() => setState(null)}
                  >
                    <View style={[card.iconWrap, { backgroundColor: T.fill }]}>
                      <Feather name="smile" size={20} color={T.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[card.label, !stateProfileId && { color: T.brand }]}>All good today</Text>
                      <Text style={card.desc}>Just using my base profile</Text>
                    </View>
                    {!stateProfileId
                      ? <Feather name="check-circle" size={16} color={T.brand} />
                      : <View style={card.emptyCheck} />
                    }
                  </Pressable>

                  <View style={sh.divider} />

                  {STATE_PROFILES.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      active={stateProfileId === p.id}
                      onPress={() => setState(p.id as any)}
                    />
                  ))}

                  {(baseProfileId || stateProfileId) && (
                    <View style={sh.mergePreview}>
                      <Feather name="layers" size={12} color={T.t3} />
                      <Text style={sh.mergeText}>
                        {[
                          baseProfileId && getBaseProfile(baseProfileId)?.label,
                          stateProfileId && getStateProfile(stateProfileId)?.label,
                        ].filter(Boolean).join('  +  ')}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={[sh.nextBtn, { backgroundColor: base?.color ?? state?.color ?? T.brand }]}
                    onPress={() => setStep('custom')}
                  >
                    <Text style={sh.nextBtnText}>Fine-tune settings</Text>
                    <Feather name="sliders" size={14} color="white" />
                  </Pressable>
                </>
              )}

              {step === 'custom' && (
                <>
                  <View style={sh.summaryRow}>
                    {base && <ProfileCard profile={base} active compact onPress={() => setStep('base')} />}
                    {state && <ProfileCard profile={state} active compact onPress={() => setStep('state')} />}
                  </View>

                  <CustomisePanel />

                  <Pressable style={[sh.nextBtn, { backgroundColor: T.green }]} onPress={() => setOpen(false)}>
                    <Feather name="check" size={14} color="white" />
                    <Text style={sh.nextBtnText}>Done</Text>
                  </Pressable>
                </>
              )}

              <View style={{ height: 8 }} />
            </ScrollView>
          </View>
      </Modal>
    </>
  );
}

const pill = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: R.pill, borderWidth: 1,
    borderColor: T.sep, backgroundColor: T.fill,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  label: { fontSize: 11, fontWeight: '600' as const, color: T.t3, flexShrink: 1 },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: S.md, paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.sep, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 16,
  },
  title: { fontSize: F.lg, fontWeight: '800' as const, color: T.text, letterSpacing: -0.4, marginBottom: 3 },
  sub: { fontSize: F.xs, color: T.t3 },

  tabs: { flexDirection: 'row', gap: 4 },
  tab: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.fill,
  },
  tabActive: { backgroundColor: T.brand },
  tabLabel: { fontSize: 11, fontWeight: '700' as const, color: T.t3 },
  tabLabelActive: { color: 'white' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: T.sep, marginVertical: 8 },

  mergePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    padding: 12, backgroundColor: T.fill, borderRadius: R.md, marginTop: 4,
  },
  mergeText: { fontSize: 12, fontWeight: '600' as const, color: T.t2 },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: R.lg, marginTop: 16,
  },
  nextBtnText: { fontSize: 14, fontWeight: '700' as const, color: 'white' },

  summaryRow: { gap: 4, marginBottom: 4 },
});
