import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  color: string;
  tint: string;
  size?: 'small' | 'medium';
}

export function Badge({ label, color, tint, size = 'small' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: tint }, size === 'medium' && styles.badgeMedium]}>
      <Text style={[styles.label, { color }, size === 'medium' && styles.labelMedium]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  labelMedium: {
    fontSize: 13,
  },
});
