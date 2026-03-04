import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { fetchProjectTasks } from '@/lib/ai';
import Colors from '@/constants/colors';

interface ProjectAddSheetProps {
  onTasksGenerated: (tasks: string[]) => void;
  projectTitle: string;
}

export function ProjectAddSheet({ onTasksGenerated, projectTitle }: ProjectAddSheetProps) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!projectTitle.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tasks = await fetchProjectTasks(projectTitle);
    if (tasks.length > 0) {
      onTasksGenerated(tasks);
      setGenerated(true);
    }
    setLoading(false);
  };

  if (generated) {
    return (
      <View style={styles.doneRow}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.light.systemGreen} />
        <Text style={styles.doneText}>Tasks generated</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={handleGenerate} style={styles.generateButton} disabled={loading || !projectTitle.trim()}>
      {loading ? (
        <>
          <ActivityIndicator size="small" color={Colors.light.systemBlue} />
          <Text style={styles.generateText}>Generating tasks...</Text>
        </>
      ) : (
        <>
          <Ionicons name="sparkles" size={16} color={Colors.light.systemBlue} />
          <Text style={styles.generateText}>Generate tasks with AI</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: 10,
    marginBottom: 12,
  },
  generateText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.systemBlue,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  doneText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.systemGreen,
  },
});
