import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { PRG } from '@/constants/config';

const SETTINGS_SECTIONS = [
  {
    title: 'Preferences',
    items: [
      { label: 'Notification Settings', icon: 'bell' },
      { label: 'Daily Reminder Time', icon: 'clock' },
      { label: 'Preferred Coaching Style', icon: 'message-circle' },
      { label: 'Dark Mode', icon: 'moon' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Subscription', icon: 'credit-card' },
      { label: 'Export Data', icon: 'download' },
      { label: 'Privacy Settings', icon: 'shield' },
      { label: 'Help & Support', icon: 'help-circle' },
    ],
  },
];

interface ProfileScreenProps {
  onClose: () => void;
}

export default function ProfileScreen({ onClose }: ProfileScreenProps) {
  const profile = useStore(s => s.profile);
  const journeys = useStore(s => s.journeys);

  const userName = profile?.name || 'You';
  const userInitial = userName.charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  const activeJourneys = journeys.filter(j => j.status === 'active');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Feather name="x" size={18} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.userCard, shadow.sm]}>
          <LinearGradient
            colors={T.gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userSince}>Member since {memberSince}</Text>
          </View>
        </View>

        {activeJourneys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Programs</Text>
            <View style={[styles.sectionCard, shadow.xs]}>
              {activeJourneys.map((jp, idx) => {
                const program = PRG.find(p => p.id === jp.journey_id);
                if (!program) return null;
                const totalDays = program.w * 7;
                const completedDays = ((jp.current_week - 1) * 7) + (jp.current_day || 1);
                const progress = Math.min(1, completedDays / totalDays);

                return (
                  <View key={jp.id} style={[styles.programRow, idx < activeJourneys.length - 1 && styles.programRowBorder]}>
                    <View style={[styles.programIcon, { backgroundColor: T.brand + '14' }]}>
                      <Feather name="compass" size={16} color={T.brand} />
                    </View>
                    <View style={styles.programInfo}>
                      <Text style={styles.programTitle} numberOfLines={1}>{program.t}</Text>
                      <Text style={styles.programMeta}>
                        Week {jp.current_week} of {program.w} {'\u00B7'} Day {jp.current_day || 1}
                      </Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeJourneys.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Programs</Text>
            <View style={[styles.emptyCard, shadow.xs]}>
              <Feather name="compass" size={20} color={T.t3} />
              <Text style={styles.emptyText}>No active programs yet</Text>
              <Text style={styles.emptySubtext}>Explore the Discover tab to find a journey</Text>
            </View>
          </View>
        )}

        {SETTINGS_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionCard, shadow.xs]}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={[styles.settingRow, idx < section.items.length - 1 && styles.settingRowBorder]}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Feather name={item.icon as any} size={15} color={T.t2} />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={T.t3} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.versionText}>M3NTOR v1.0 {'\u00B7'} Made with intention</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: T.sep,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: F.lg,
    fontWeight: '700' as const,
    color: T.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: S.md,
    paddingTop: S.md,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: T.glass,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: T.sep,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: T.text,
  },
  userSince: {
    fontSize: 13,
    color: T.t3,
    marginTop: 2,
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: T.t3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: T.glass,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: T.sep,
    overflow: 'hidden',
  },

  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  programRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: T.sep,
  },
  programIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: T.text,
  },
  programMeta: {
    fontSize: 12,
    color: T.t3,
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: T.brand + '14',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: T.brand,
    borderRadius: 2,
  },

  emptyCard: {
    backgroundColor: T.glass,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: T.t2,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: T.t3,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: T.sep,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: T.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: T.text,
  },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: T.t3,
    paddingVertical: 12,
  },
});
