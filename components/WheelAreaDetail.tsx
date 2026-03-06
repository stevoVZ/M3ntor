import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { T, S, F } from '@/constants/theme';
import { scoreLabel, scoreTier } from './WheelOfLife';
import type { LifeArea } from '@/constants/config';
import { PRG, WA } from '@/constants/config';
import { useStore } from '@/lib/store';
import { appScoreInsight, journeyProgress as calcJourneyProgress, areaWeight, journeyAreaWeight, goalProgress } from '@/utils/scores';
import { formatRecurrence, formatDuration } from '@/utils/items';

interface Props {
  area: LifeArea;
  appScore?: number;
}

export default function WheelAreaDetail({ area, appScore }: Props) {
  const items = useStore(s => s.items);
  const journeys = useStore(s => s.journeys);
  const tier = scoreTier(area.score);

  const areaItems = items.filter(
    i => (i.status === 'active' || i.status === 'paused' || i.status === 'someday') &&
         (areaWeight(i, area.id) > 0)
  );

  const habits = areaItems.filter(i => i.status === 'active' && !!i.recurrence);
  const projects = areaItems.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0 && !i.recurrence);
  const actions = areaItems.filter(i => i.status === 'active' && !i.recurrence && !(i.steps?.length ?? 0));
  const pausedItems = areaItems.filter(i => i.status === 'paused');
  const goals = areaItems.filter(i => i.status === 'someday');

  const areaJourneys = journeys.filter(j => {
    const prog = PRG.find(p => p.id === j.journey_id);
    return prog && journeyAreaWeight(prog, area.id) > 0;
  });
  const activeJourneys = areaJourneys.filter(j => j.status === 'active');

  const availableJourneys = PRG.filter(p => {
    if (journeyAreaWeight(p, area.id) === 0) return false;
    return !journeys.some(j => j.journey_id === p.id);
  });

  const totalContributing = activeJourneys.length + projects.length + habits.length;
  const totalItems = areaJourneys.length + projects.length + habits.length + actions.length;

  const projectedScore = totalContributing > 0
    ? Math.min(10, area.score + Math.min(2, Math.round(totalContributing * 0.5)))
    : null;

  const change = area.score - area.start;

  return (
    <View style={[styles.container, { backgroundColor: area.c + '0A', borderColor: area.c + '18' }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: area.c + '18' }]}>
          <Feather name={getFeatherName(area.icon)} size={20} color={area.c} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.areaName}>{area.n}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
              <Text style={[styles.tierText, { color: tier.color }]}>{scoreLabel(area.score)}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {totalContributing > 0
              ? `${totalContributing} thing${totalContributing !== 1 ? 's' : ''} actively improving your score`
              : 'Nothing active yet'}
          </Text>
        </View>
        <View style={styles.dualScoreWrap}>
          <View style={[styles.scoreBox, { backgroundColor: area.c }]}>
            <Text style={styles.scoreBoxValue}>{area.score}</Text>
            <Text style={styles.scoreBoxLabel}>YOU</Text>
          </View>
          {appScore != null && (
            <View style={[styles.scoreBoxOutline, { backgroundColor: area.c + '12', borderColor: area.c + '50' }]}>
              <Text style={[styles.scoreBoxValueOutline, { color: area.c }]}>{appScore}</Text>
              <Text style={[styles.scoreBoxLabelOutline, { color: area.c }]}>APP</Text>
            </View>
          )}
        </View>
      </View>

      {appScore != null && (() => {
        const insight = appScoreInsight(area.score, appScore);
        const insightColors = {
          aligned: T.green,
          overconfident: '#FF9500',
          undervalued: '#007AFF',
        };
        const ic = insightColors[insight.type];
        return (
          <View style={[styles.insightBanner, { backgroundColor: ic + '08', borderColor: ic + '20' }]}>
            <Feather
              name={(insight.type === 'aligned' ? 'check-circle' : insight.type === 'overconfident' ? 'alert-circle' : 'award') as any}
              size={14}
              color={ic}
            />
            <Text style={[styles.insightBannerText, { color: T.t2 }]}>{insight.msg}</Text>
          </View>
        );
      })()}

      <View style={[styles.descBox, { backgroundColor: area.c + '06' }]}>
        <Text style={styles.desc}>{area.desc}</Text>
      </View>

      <View style={styles.scoreBarSection}>
        <View style={styles.scoreBarHeader}>
          <Text style={styles.scoreBarLeft}>Started at {area.start}/10</Text>
          <View style={styles.scoreBarRight}>
            {projectedScore != null && projectedScore > area.score && (
              <Text style={[styles.projectedText, { color: area.c }]}>
                {'\u2192'} {projectedScore} projected
              </Text>
            )}
            <Text style={[styles.changeText, { color: change > 0 ? T.green : change < 0 ? T.red : T.t3 }]}>
              {change > 0 ? `+${change}` : change < 0 ? `${change}` : 'No change'}
            </Text>
          </View>
        </View>
        <View style={[styles.scoreBarTrack, { backgroundColor: area.c + '12' }]}>
          <View style={[styles.scoreBarFill, { width: `${area.score * 10}%`, backgroundColor: area.c }]} />
          <View style={[styles.scoreBarMarker, { left: `${area.start * 10}%`, backgroundColor: area.c + '40' }]} />
          {projectedScore != null && projectedScore > area.score && (
            <View style={[styles.scoreBarMarker, { left: `${projectedScore * 10}%`, backgroundColor: area.c, opacity: 0.3 }]} />
          )}
        </View>
        <View style={styles.scoreBarLabels}>
          <Text style={styles.scoreBarNum}>1</Text>
          <Text style={styles.scoreBarNum}>5</Text>
          <Text style={styles.scoreBarNum}>10</Text>
        </View>
      </View>

      {areaJourneys.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journeys</Text>
          {areaJourneys.map(j => {
            const prog = PRG.find(p => p.id === j.journey_id);
            if (!prog) return null;
            const w = journeyAreaWeight(prog, area.id);
            const pct = Math.round(calcJourneyProgress(j, prog.w) * 100);
            return (
              <Pressable key={j.id} style={styles.journeyCard} onPress={() => router.push(`/item/${j.journey_id}`)}>
                <View style={styles.journeyRow}>
                  <View style={[styles.journeyIcon, { backgroundColor: area.c + '10' }]}>
                    <Feather name="compass" size={16} color={area.c} />
                  </View>
                  <View style={styles.journeyInfo}>
                    <View style={styles.journeyNameRow}>
                      <Text style={styles.journeyName} numberOfLines={1}>{prog.t}</Text>
                      {j.status === 'active' && <ContribBadge type="journey" />}
                      {w < 1 && <RoleBadge weight={w} />}
                    </View>
                    <Text style={styles.journeyExpert}>{prog.e}</Text>
                  </View>
                  <StatusBadge status={j.status} />
                  <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.4 }} />
                </View>
                {j.status === 'active' && (
                  <View style={styles.journeyProgress}>
                    <View style={styles.journeyProgressHeader}>
                      <Text style={styles.journeyProgressLabel}>Week {j.current_week}, Day {j.current_day || 1}</Text>
                      <Text style={[styles.journeyProgressPct, { color: area.c }]}>{pct}%</Text>
                    </View>
                    <View style={[styles.miniBar, { backgroundColor: area.c + '12' }]}>
                      <View style={[styles.miniBarFill, { width: `${pct}%`, backgroundColor: area.c }]} />
                    </View>
                  </View>
                )}
                {j.status === 'active' && WA[j.journey_id] && (() => {
                  const weekIdx = Math.min(j.current_week - 1, (WA[j.journey_id]?.length ?? 1) - 1);
                  const weekActions = WA[j.journey_id]?.[weekIdx];
                  if (!weekActions || weekActions.length === 0) return null;
                  return (
                    <View style={styles.waActionsWrap}>
                      <Text style={styles.waActionsLabel}>This week's actions</Text>
                      {weekActions.slice(0, 3).map((wa, idx) => (
                        <View key={idx} style={styles.waActionRow}>
                          <Feather name="arrow-right" size={9} color={area.c} style={{ marginTop: 3 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.waActionTitle} numberOfLines={1}>{wa.t}</Text>
                            <Text style={styles.waActionDur}>{wa.dur}</Text>
                          </View>
                        </View>
                      ))}
                      {weekActions.length > 3 && (
                        <Text style={styles.waActionMore}>+{weekActions.length - 3} more</Text>
                      )}
                    </View>
                  );
                })()}
                {j.status === 'done' && (
                  <View style={styles.completedRow}>
                    <Feather name="check" size={12} color={T.green} />
                    <Text style={styles.completedText}>Completed all {prog.w} weeks</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {projects.map(item => {
            const doneSteps = item.steps?.filter(s => s.done).length || 0;
            const totalSteps = item.steps?.length || 0;
            const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
            const w = areaWeight(item, area.id);
            return (
              <Pressable key={item.id} style={styles.projectCard} onPress={() => router.push(`/item/${item.id}`)}>
                <View style={styles.projectRow}>
                  <View style={[styles.projectIcon, { backgroundColor: area.c + '08' }]}>
                    <Feather name="folder" size={16} color={area.c} />
                  </View>
                  <View style={styles.projectInfo}>
                    <View style={styles.journeyNameRow}>
                      <Text style={styles.projectName} numberOfLines={1}>{item.title}</Text>
                      <ContribBadge type="project" />
                      {w < 1 && <RoleBadge weight={w} />}
                    </View>
                    <Text style={styles.projectSub}>
                      {item.deadline
                        ? `Due ${new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : totalSteps > 0 ? `${doneSteps} of ${totalSteps} steps done` : ''}
                    </Text>
                  </View>
                  {totalSteps > 0 && (
                    <View style={styles.circularProgress}>
                      <Text style={styles.circularPct}>{pct}%</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.4 }} />
                </View>
                {totalSteps > 0 && (
                  <View style={styles.stepsList}>
                    {(item.steps || []).slice(0, 3).map(step => (
                      <View key={step.id} style={styles.stepRow}>
                        <View style={[styles.stepCircle, step.done && { backgroundColor: T.green, borderColor: T.green }]}>
                          {step.done && <Feather name="check" size={7} color="white" />}
                        </View>
                        <Text style={[styles.stepTitle, step.done && styles.stepDone]} numberOfLines={1}>{step.title}</Text>
                        {step.today && !step.done && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>TODAY</Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {(item.steps?.length ?? 0) > 3 && (
                      <Text style={styles.moreSteps}>+{(item.steps?.length ?? 0) - 3} more steps</Text>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {habits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habits</Text>
          {habits.map(item => {
            const w = areaWeight(item, area.id);
            return (
              <Pressable key={item.id} style={styles.habitCard} onPress={() => router.push(`/item/${item.id}`)}>
                <View style={[styles.habitIcon, { backgroundColor: area.c + '08' }]}>
                  <Feather name="repeat" size={16} color={T.orange} />
                </View>
                <View style={styles.habitInfo}>
                  <View style={styles.journeyNameRow}>
                    <Text style={styles.habitName} numberOfLines={1}>{item.title}</Text>
                    <ContribBadge type="habit" />
                    {w < 1 && <RoleBadge weight={w} />}
                  </View>
                  <Text style={styles.habitSub}>{formatRecurrence(item)}</Text>
                </View>
                <View style={styles.habitMeta}>
                  <Text style={styles.habitDuration}>{formatDuration(item.habit_duration)}</Text>
                  <Feather name="refresh-cw" size={12} color={T.orange} style={{ opacity: 0.5 }} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To-Do</Text>
          {actions.map(item => (
            <Pressable key={item.id} style={styles.habitCard} onPress={() => router.push(`/item/${item.id}`)}>
              <View style={[styles.habitIcon, { backgroundColor: area.c + '08' }]}>
                <Feather name="check-square" size={16} color={T.t3} />
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitName} numberOfLines={1}>{item.title}</Text>
              </View>
              <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.4 }} />
            </Pressable>
          ))}
        </View>
      )}

      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          {goals.map(item => {
            const gp = goalProgress(item, items, journeys, PRG);
            const linked = (item.linked_items || []).length + (item.linked_journeys || []).length;
            return (
              <Pressable key={item.id} style={[styles.goalRow, { backgroundColor: T.purple + '08', borderColor: T.purple + '1A' }]} onPress={() => router.push(`/item/${item.id}`)}>
                <Feather name="target" size={14} color={T.purple} style={{ flexShrink: 0 }} />
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName} numberOfLines={1}>{item.title}</Text>
                  {linked > 0 && (
                    <Text style={styles.goalSub}>{linked} linked · {Math.round(gp * 100)}%</Text>
                  )}
                </View>
                {linked > 0 && (
                  <View style={[styles.goalBar, { backgroundColor: area.c + '15' }]}>
                    <View style={[styles.goalBarFill, { width: `${Math.round(gp * 100)}%`, backgroundColor: area.c }]} />
                  </View>
                )}
                <Feather name="chevron-right" size={10} color={T.t3} style={{ opacity: 0.3 }} />
              </Pressable>
            );
          })}
        </View>
      )}

      {pausedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paused</Text>
          <View style={styles.pausedWrap}>
            {pausedItems.map(item => (
              <Pressable key={item.id} style={styles.pausedChip} onPress={() => router.push(`/item/${item.id}`)}>
                <Feather name="pause" size={10} color={T.t3} />
                <Text style={styles.pausedText} numberOfLines={1}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {availableJourneys.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Journeys</Text>
          {availableJourneys.slice(0, 3).map(p => (
            <Pressable key={p.id} style={styles.availJourneyRow} onPress={() => router.push({ pathname: '/(tabs)/discover', params: { area: area.id } })}>
              <View style={[styles.journeyIcon, { backgroundColor: area.c + '10' }]}>
                <Feather name="compass" size={14} color={area.c} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.availJourneyName}>{p.t}</Text>
                <Text style={styles.availJourneySub}>{p.e} · {p.w}w</Text>
              </View>
              <DifficultyDots difficulty={p.d} />
            </Pressable>
          ))}
          {availableJourneys.length > 3 && (
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/discover', params: { area: area.id } })}>
              <Text style={[styles.moreJourneys, { color: area.c }]}>+{availableJourneys.length - 3} more journeys</Text>
            </Pressable>
          )}
        </View>
      )}

      {totalItems === 0 && availableJourneys.length === 0 && (
        <View style={styles.emptySection}>
          <Feather name="inbox" size={20} color={T.t3} />
          <Text style={styles.emptyTitle}>Nothing in {area.n} yet</Text>
          <Text style={styles.emptySub}>Add a goal, habit, or start a journey</Text>
        </View>
      )}

      <Pressable
        style={[styles.ctaButton, { borderColor: area.c, backgroundColor: area.c + '08' }]}
        onPress={() => router.push({ pathname: '/(tabs)/discover', params: { area: area.id } })}
      >
        <Feather name="zap" size={14} color={area.c} />
        <Text style={[styles.ctaText, { color: area.c }]}>Improve {area.n}</Text>
      </Pressable>
    </View>
  );
}

function ContribBadge({ type }: { type: 'journey' | 'project' | 'habit' }) {
  const cfg = {
    journey: { label: 'Learning', color: T.brand },
    project: { label: 'Executing', color: T.green },
    habit: { label: 'Practising', color: T.orange },
  }[type];
  return (
    <View style={[styles.contribBadge, { backgroundColor: cfg.color + '12' }]}>
      <Text style={[styles.contribBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function RoleBadge({ weight }: { weight: number }) {
  if (weight >= 1.0) return null;
  const label = weight >= 0.5 ? 'Also improves' : 'Minor benefit';
  return (
    <View style={[styles.contribBadge, { backgroundColor: T.t3 + '10' }]}>
      <Text style={[styles.contribBadgeText, { color: T.t3 }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    active: { label: 'In Progress', color: T.green },
    paused: { label: 'Paused', color: T.orange },
    done: { label: 'Completed', color: T.brand },
  };
  const s = cfg[status] || cfg.active;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.color + '10' }]}>
      <Text style={[styles.statusBadgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function DifficultyDots({ difficulty }: { difficulty: string }) {
  const count = difficulty === 'beginner' ? 1 : difficulty === 'moderate' ? 2 : 3;
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.dot, i <= count ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

function getFeatherName(icon: string): any {
  const map: Record<string, string> = {
    heart: 'heart', briefcase: 'briefcase', dollar: 'dollar-sign', people: 'users',
    star: 'star', chat: 'message-circle', heart2: 'heart', zap: 'zap',
    home: 'home', sun: 'sun',
  };
  return map[icon] || 'star';
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: S.md,
    marginTop: 8,
    padding: S.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  areaName: {
    fontSize: F.md,
    fontWeight: '700',
    color: T.text,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: T.t3,
    marginTop: 2,
  },
  dualScoreWrap: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  scoreBox: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 44,
  },
  scoreBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    lineHeight: 20,
  },
  scoreBoxLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'white',
    opacity: 0.75,
    marginTop: 1,
  },
  scoreBoxOutline: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 44,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
  },
  scoreBoxValueOutline: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  scoreBoxLabelOutline: {
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 1,
  },
  insightBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
  },
  insightBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
  descBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  desc: {
    fontSize: 12.5,
    color: T.t2,
    lineHeight: 19,
  },
  scoreBarSection: {
    marginTop: 14,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  scoreBarLeft: {
    fontSize: 11,
    color: T.t3,
  },
  scoreBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectedText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.7,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreBarTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreBarMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  scoreBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  scoreBarNum: {
    fontSize: 9,
    color: T.t3,
  },
  section: {
    marginTop: 14,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.t2,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  journeyCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  journeyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  journeyInfo: {
    flex: 1,
  },
  journeyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  journeyName: {
    fontSize: 13,
    fontWeight: '650',
    color: T.text,
    flexShrink: 1,
  },
  journeyExpert: {
    fontSize: 11,
    color: T.t3,
  },
  journeyProgress: {
    marginTop: 8,
  },
  journeyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  journeyProgressLabel: {
    fontSize: 10,
    color: T.t3,
  },
  journeyProgressPct: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  completedText: {
    fontSize: 11,
    color: T.green,
    fontWeight: '500',
  },
  projectCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  projectIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 13,
    fontWeight: '650',
    color: T.text,
    flexShrink: 1,
  },
  projectSub: {
    fontSize: 11,
    color: T.t3,
  },
  circularProgress: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: T.sep,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circularPct: {
    fontSize: 9,
    fontWeight: '700',
    color: T.text,
  },
  stepsList: {
    marginTop: 8,
    gap: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: T.sep,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: T.t2,
    flex: 1,
  },
  stepDone: {
    color: T.t3,
    textDecorationLine: 'line-through',
  },
  todayBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: T.brand + '0D',
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: T.brand,
  },
  moreSteps: {
    fontSize: 10,
    color: T.t3,
    paddingLeft: 20,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
  },
  habitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 13,
    fontWeight: '650',
    color: T.text,
    flexShrink: 1,
  },
  habitSub: {
    fontSize: 11,
    color: T.t3,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  habitDuration: {
    fontSize: 11,
    fontWeight: '600',
    color: T.t3,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  goalInfo: {
    flex: 1,
    minWidth: 0,
  },
  goalName: {
    fontSize: 12,
    fontWeight: '600',
    color: T.text,
  },
  goalSub: {
    fontSize: 10,
    color: T.t3,
    marginTop: 1,
  },
  goalBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  pausedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    opacity: 0.55,
  },
  pausedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
  },
  pausedText: {
    fontSize: 12,
    fontWeight: '500',
    color: T.t2,
  },
  availJourneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
  },
  availJourneyName: {
    fontSize: 12,
    fontWeight: '600',
    color: T.text,
  },
  availJourneySub: {
    fontSize: 10,
    color: T.t3,
  },
  moreJourneys: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotFilled: {
    backgroundColor: T.brand,
  },
  dotEmpty: {
    backgroundColor: T.sep,
  },
  emptySection: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: T.glass,
    borderWidth: 0.5,
    borderColor: T.sep,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
  },
  emptySub: {
    fontSize: 12,
    color: T.t3,
  },
  ctaButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '650',
  },
  contribBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  contribBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '650',
  },
  waActionsWrap: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  waActionsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  waActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  waActionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: T.text,
    lineHeight: 15,
  },
  waActionDur: {
    fontSize: 9,
    color: T.t3,
  },
  waActionMore: {
    fontSize: 9,
    color: T.t3,
    fontWeight: '600',
    marginTop: 2,
  },
});
