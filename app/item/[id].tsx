import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useItems } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TaskRow } from '@/components/items/TaskRow';
import { ProgressBar } from '@/components/items/ProgressBar';
import { Button } from '@/components/ui/Button';
import { itemKind } from '@/types';
import { getAreaConfig, getKindConfig, projectProgress, generateId } from '@/utils/items';
import { KIND_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG } from '@/constants/config';
import Colors from '@/constants/colors';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateItem, removeItem, toggleDone, toggleStep, addStep, removeStep } = useItems();
  const item = items.find((i) => i.id === id);

  const [newStepTitle, setNewStepTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const startEditing = () => {
    if (item) {
      setEditTitle(item.title);
      setEditDesc(item.description ?? '');
    }
    setIsEditing(true);
  };

  if (!item) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color="#C7C7CC" />
        <Text style={styles.notFoundText}>Item not found</Text>
        <Button title="Go Back" variant="tinted" onPress={() => router.back()} />
      </View>
    );
  }

  const kind = itemKind(item);
  const kindCfg = getKindConfig(kind);
  const areaCfg = getAreaConfig(item.area);
  const progress = kind === 'project' ? projectProgress(item) : 0;

  const handleSaveEdit = () => {
    updateItem(item.id, { title: editTitle.trim(), description: editDesc.trim() || undefined });
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleStatusChange = (status: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateItem(item.id, {
      status: status as any,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: undefined }),
      ...(status === 'paused' ? { paused_at: new Date().toISOString() } : { paused_at: undefined }),
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeItem(item.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    const now = new Date().toISOString();
    addStep(item.id, {
      id: generateId(),
      item_id: item.id,
      title: newStepTitle.trim(),
      done: false,
      status: 'todo' as const,
      priority: 'normal' as const,
      effort: 'medium' as const,
      today: false,
      sort_order: (item.steps?.length ?? 0),
      created_at: now,
    });
    setNewStepTitle('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
        </Pressable>
        <View style={styles.topBarRight}>
          {isEditing ? (
            <Pressable onPress={handleSaveEdit} hitSlop={12}>
              <Ionicons name="checkmark" size={24} color={Colors.light.systemBlue} />
            </Pressable>
          ) : (
            <Pressable onPress={startEditing} hitSlop={12}>
              <Ionicons name="create-outline" size={22} color={Colors.light.systemBlue} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          <View style={[styles.kindBadge, { backgroundColor: kindCfg.tint }]}>
            <Ionicons name={kindCfg.icon as any} size={16} color={kindCfg.color} />
            <Text style={[styles.kindText, { color: kindCfg.color }]}>{kindCfg.label}</Text>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.editTitleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />
          ) : (
            <Text style={styles.itemTitle}>{item.title}</Text>
          )}

          {isEditing ? (
            <TextInput
              style={styles.editDescInput}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Add description..."
              placeholderTextColor="#C7C7CC"
              multiline
            />
          ) : item.description ? (
            <Text style={styles.itemDescription}>{item.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {areaCfg && <Badge label={areaCfg.label} color={areaCfg.color} tint={areaCfg.tint} size="medium" />}
            <Badge
              label={STATUS_CONFIG[item.status]?.label ?? item.status}
              color={STATUS_CONFIG[item.status]?.color ?? '#8E8E93'}
              tint={(STATUS_CONFIG[item.status]?.color ?? '#8E8E93') + '18'}
              size="medium"
            />
          </View>
        </View>

        {kind === 'project' && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar progress={progress} color={kindCfg.color} height={6} />
          </View>
        )}

        <Text style={styles.sectionLabel}>STATUS</Text>
        <View style={styles.statusRow}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <Pressable
              key={key}
              onPress={() => handleStatusChange(key)}
              style={[styles.statusChip, item.status === key && { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}
            >
              <Text style={[styles.statusChipText, item.status === key && { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {(kind === 'project' || (item.steps && item.steps.length > 0)) && (
          <>
            <Text style={styles.sectionLabel}>
              STEPS ({item.steps?.filter((s) => s.done).length ?? 0}/{item.steps?.length ?? 0})
            </Text>
            <Card variant="grouped" style={{ marginBottom: 12 }}>
              {(item.steps ?? []).map((step, idx) => (
                <TaskRow
                  key={step.id}
                  step={step}
                  onToggle={() => toggleStep(item.id, step.id)}
                  isLast={idx === (item.steps?.length ?? 0) - 1}
                />
              ))}
            </Card>

            <View style={styles.addStepRow}>
              <TextInput
                style={styles.addStepInput}
                placeholder="Add a step..."
                placeholderTextColor="#C7C7CC"
                value={newStepTitle}
                onChangeText={setNewStepTitle}
                onSubmitEditing={handleAddStep}
                returnKeyType="done"
              />
              <Pressable onPress={handleAddStep} hitSlop={8}>
                <Ionicons name="add-circle" size={26} color={Colors.light.systemBlue} />
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.dangerZone}>
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={Colors.light.systemRed} />
            <Text style={styles.deleteText}>Delete Item</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#fff',
  },
  notFoundText: {
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.textTertiary,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    gap: 10,
    marginBottom: 24,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  kindText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  itemTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  editTitleInput: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.systemBlue,
    paddingVertical: 4,
  },
  itemDescription: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  editDescInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.separator,
    paddingVertical: 4,
    minHeight: 44,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  progressSection: {
    gap: 8,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(120,120,128,0.12)',
    backgroundColor: 'rgba(120,120,128,0.04)',
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8E8E93',
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    backgroundColor: Colors.light.secondaryBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  addStepInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.text,
    paddingVertical: 10,
  },
  dangerZone: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.separator,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  deleteText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.systemRed,
  },
});
