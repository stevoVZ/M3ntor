import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Feedback = { type: 'success' | 'error'; message: string } | null;

const ACCENT = '#007AFF';
const DARK = '#1C1C1E';
const SUBTLE = '#8E8E93';
const SEPARATOR = 'rgba(60,60,67,0.08)';
const CARD_BG = 'rgba(255,255,255,0.68)';
const CARD_BORDER = 'rgba(255,255,255,0.72)';
const INPUT_BG = 'rgba(245,245,247,0.7)';

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === 'web') {
    return <View style={[styles.glassCardWeb, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={48} tint="systemChromeMaterialLight" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleReset() {
    setFeedback(null);
    if (!isSupabaseConfigured || !supabase) {
      setFeedback({ type: 'error', message: 'Supabase is not configured.' });
      return;
    }
    if (!password.trim() || !confirm.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in both fields.' });
      return;
    }
    if (password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setFeedback({ type: 'error', message: 'No active session. Please use the reset link from your email.' });
        setLoading(false);
        return;
      }

      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000)
      );
      const { error } = await Promise.race([updatePromise, timeoutPromise]);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Password updated successfully.' });
      setTimeout(() => router.replace('/(tabs)/today'), 1500);
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = password.trim().length > 0 && confirm.trim().length > 0;
  const topPad = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F2F2F7', '#E8E8ED', '#F5F5FA', '#FFFFFF']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.meshCircle1} />
      <View style={styles.meshCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {
            paddingTop: topPad + 48,
            paddingBottom: bottomPad + 24,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Feather name="lock" size={28} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>

          <GlassCard style={styles.mainCard}>
            {feedback && (
              <View style={[styles.feedbackBanner, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                <Feather
                  name={feedback.type === 'error' ? 'alert-circle' : 'check-circle'}
                  size={15}
                  color={feedback.type === 'error' ? '#FF3B30' : '#34C759'}
                />
                <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess]}>
                  {feedback.message}
                </Text>
              </View>
            )}

            <View style={styles.formFields}>
              <View style={styles.inputRow}>
                <Feather name="lock" size={17} color={SUBTLE} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New Password"
                  placeholderTextColor="#C7C7CC"
                  style={styles.input}
                  secureTextEntry
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputRow, styles.inputRowBorder]}>
                <Feather name="check-circle" size={17} color={SUBTLE} style={styles.inputIcon} />
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Confirm Password"
                  placeholderTextColor="#C7C7CC"
                  style={styles.input}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>
            </View>

            <Pressable
              onPress={handleReset}
              disabled={loading || !canSubmit}
              style={[styles.primaryBtn, { marginTop: 20, opacity: (!canSubmit && !loading) ? 0.4 : 1 }]}>
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.primaryBtnText}>Update Password</Text>
              }
            </Pressable>
          </GlassCard>

          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/login')}>
            <Feather name="arrow-left" size={16} color={ACCENT} />
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },

  meshCircle1: {
    position: 'absolute',
    right: -90,
    top: -30,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(174,174,178,0.06)',
  },
  meshCircle2: {
    position: 'absolute',
    left: -70,
    bottom: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(199,199,204,0.08)',
  },

  iconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK,
  },

  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: DARK,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: SUBTLE,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: -0.2,
  },

  glassCard: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
  },
  glassCardWeb: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 20,
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    } as any : {}),
  },
  mainCard: {
    marginBottom: 20,
  },

  formFields: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SEPARATOR,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: DARK,
    letterSpacing: -0.2,
  },

  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 14,
  },
  feedbackError: {
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(52,199,89,0.08)',
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  feedbackTextError: {
    color: '#FF3B30',
  },
  feedbackTextSuccess: {
    color: '#34C759',
  },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: DARK,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: ACCENT,
    letterSpacing: -0.2,
  },
});
