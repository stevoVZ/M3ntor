import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { PRG } from '@/constants/config';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';

const SETTINGS_SECTIONS = [
  {
    title: 'Preferences',
    items: [
      { label: 'Notification Settings', icon: 'bell' },
      { label: 'Daily Reminder Time', icon: 'clock' },
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
  const setCountry = useStore(s => s.setCountry);
  const signOut = useStore(s => s.signOut);
  const userId = useStore(s => s.userId);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const isGuest = !userId || userId === 'guest';

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await signOut();
            router.replace('/login');
          },
        },
      ],
    );
  }

  const userName = profile?.name || 'You';
  const userInitial = userName.charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  const activeJourneys = journeys.filter(j => j.status === 'active');
  const currentCountry = profile?.country ? getCountryByCode(profile.country) : null;

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Region</Text>
          <View style={[styles.sectionCard, shadow.xs]}>
            <Pressable
              style={styles.settingRow}
              onPress={() => { setShowCountryPicker(true); setCountrySearch(''); }}
              testID="country-picker-btn"
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Feather name="globe" size={15} color={T.t2} />
                </View>
                <Text style={styles.settingLabel}>Country / Region</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {currentCountry ? (
                  <Text style={{ fontSize: 13, color: T.t2 }}>{currentCountry.flag} {currentCountry.name}</Text>
                ) : (
                  <Text style={{ fontSize: 13, color: T.t3 }}>Not set</Text>
                )}
                <Feather name="chevron-right" size={14} color={T.t3} />
              </View>
            </Pressable>
          </View>
        </View>

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

        <View style={styles.section}>
          <View style={[styles.sectionCard, shadow.xs]}>
            <Pressable
              style={styles.signOutRow}
              onPress={isGuest ? () => { onClose(); router.replace('/login'); } : handleSignOut}
              testID="sign-out-btn"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: T.red + '10' }]}>
                  <Feather name="log-out" size={15} color={T.red} />
                </View>
                <Text style={styles.signOutText}>{isGuest ? 'Sign In' : 'Sign Out'}</Text>
              </View>
              <Feather name="chevron-right" size={14} color={T.red + '60'} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.versionText}>M3NTOR v1.0 {'\u00B7'} Made with intention</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {showCountryPicker && (
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowCountryPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Country</Text>
              <Pressable onPress={() => setShowCountryPicker(false)} hitSlop={8}>
                <Feather name="x" size={18} color={T.text} />
              </Pressable>
            </View>
            <View style={styles.pickerSearchWrap}>
              <Feather name="search" size={14} color={T.t3} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search countries..."
                placeholderTextColor={T.t3}
                style={styles.pickerSearchInput}
                autoFocus
                testID="country-search-input"
              />
            </View>
            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {currentCountry && (
                <Pressable
                  style={styles.pickerCountryRow}
                  onPress={() => { setCountry(null); setShowCountryPicker(false); }}
                >
                  <View style={styles.pickerCountryLeft}>
                    <Feather name="x-circle" size={16} color={T.t3} />
                    <Text style={[styles.pickerCountryName, { color: T.t3 }]}>Clear selection</Text>
                  </View>
                </Pressable>
              )}
              {filteredCountries.map(c => {
                const selected = profile?.country === c.code;
                return (
                  <Pressable
                    key={c.code}
                    style={[styles.pickerCountryRow, selected && styles.pickerCountrySelected]}
                    onPress={() => { setCountry(c.code); setShowCountryPicker(false); }}
                    testID={`country-${c.code}`}
                  >
                    <View style={styles.pickerCountryLeft}>
                      <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                      <Text style={[styles.pickerCountryName, selected && { color: T.brand, fontWeight: '700' as const }]}>{c.name}</Text>
                    </View>
                    {selected && <Feather name="check" size={16} color={T.brand} />}
                  </Pressable>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}
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

  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: T.red,
  },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: T.t3,
    paddingVertical: 12,
  },

  pickerOverlay: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    justifyContent: 'flex-end' as const,
  },
  pickerBackdrop: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,8,22,0.45)',
  },
  pickerSheet: {
    backgroundColor: 'rgba(253,252,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'web' ? 34 : 20,
  },
  pickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: S.md,
    paddingTop: 18,
    paddingBottom: 10,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: T.text,
  },
  pickerSearchWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginHorizontal: S.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.fill,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    padding: 0,
  },
  pickerList: {
    flex: 1,
    paddingHorizontal: S.md,
  },
  pickerCountryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerCountrySelected: {
    backgroundColor: T.brand + '0A',
  },
  pickerCountryLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  pickerCountryName: {
    fontSize: 15,
    color: T.text,
  },
});
