import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KIND_CONFIG } from '@/constants/config';
import Colors from '@/constants/colors';
import { ItemKind } from '@/types';

interface FabActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: ItemKind) => void;
}

const OPTIONS: { kind: ItemKind; label: string; subtitle: string; icon: string }[] = [
  { kind: 'action', label: 'Action', subtitle: 'One-off task', icon: 'checkmark-circle' },
  { kind: 'habit', label: 'Habit', subtitle: 'Recurring activity', icon: 'repeat' },
  { kind: 'goal', label: 'Goal', subtitle: 'Future aspiration', icon: 'flag' },
  { kind: 'project', label: 'Project', subtitle: 'Multi-step plan', icon: 'layers' },
];

export function FabActionSheet({ visible, onClose, onSelect }: FabActionSheetProps) {
  const handleSelect = (kind: ItemKind) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(kind);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Create New</Text>
          {OPTIONS.map((opt) => {
            const cfg = KIND_CONFIG[opt.kind];
            return (
              <Pressable
                key={opt.kind}
                onPress={() => handleSelect(opt.kind)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={[styles.optionIcon, { backgroundColor: cfg.tint }]}>
                  <Ionicons name={opt.icon as any} size={22} color={cfg.color} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </Pressable>
            );
          })}
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 34,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  optionPressed: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
    marginTop: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.separator,
  },
  cancelText: {
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.systemRed,
  },
});
