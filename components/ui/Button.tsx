import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tinted' | 'plain';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'filled',
  color = Colors.light.systemBlue,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && [styles.filled, { backgroundColor: color }],
        variant === 'tinted' && [styles.tinted, { backgroundColor: color + '18' }],
        variant === 'plain' && styles.plain,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'filled' ? '#fff' : color} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'filled' && styles.filledText,
            variant === 'tinted' && { color },
            variant === 'plain' && { color },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  filled: {
    backgroundColor: Colors.light.systemBlue,
  },
  tinted: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  plain: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  filledText: {
    color: '#FFFFFF',
  },
});
