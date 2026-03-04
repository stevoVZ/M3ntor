import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { JOURNEYS } from '@/constants/config';
import Colors from '@/constants/colors';

function JourneyCard({ journey }: { journey: typeof JOURNEYS[0] }) {
  return (
    <Pressable style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
      <LinearGradient
        colors={[journey.color + 'CC', journey.color + '99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.journeyCard}
      >
        <View style={styles.journeyIcon}>
          <Ionicons name={journey.icon as any} size={28} color="#fff" />
        </View>
        <View style={styles.journeyContent}>
          <Text style={styles.journeyCategory}>{journey.category}</Text>
          <Text style={styles.journeyTitle}>{journey.title}</Text>
          <Text style={styles.journeyDescription}>{journey.description}</Text>
        </View>
        <View style={styles.journeyFooter}>
          <View style={styles.journeyMeta}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.journeyWeeks}>{journey.weeks} weeks</Text>
          </View>
          <View style={styles.startButton}>
            <Text style={styles.startButtonText}>Start</Text>
            <Ionicons name="arrow-forward" size={14} color={journey.color} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
      >
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Curated journeys to level up your life</Text>

        <View style={styles.journeyList}>
          {JOURNEYS.map((journey) => (
            <JourneyCard key={journey.id} journey={journey} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.groupedBackground,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 24,
  },
  journeyList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  journeyCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  journeyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  journeyContent: {
    flex: 1,
    gap: 4,
  },
  journeyCategory: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  journeyTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: -0.3,
  },
  journeyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginTop: 4,
  },
  journeyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  journeyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  journeyWeeks: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
});
