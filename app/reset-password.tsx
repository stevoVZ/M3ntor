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
import { T } from '../constants/theme';

type Feedback = { type: 'success' | 'error'; message: string } | null;

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === 'web') {
    return <View style={[styles.glassCardWeb, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={60} tint="light" style={[styles.glassCard, style]}>
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
      const { error } = await supabase.auth.updateUser({ password });
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
        colors={['#F8F7FF', '#EDE9FE', '#F0EAFF', '#F5F3FF']}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {
            paddingTop: topPad + 40,
            paddingBottom: bottomPad + 24,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.iconWrap}>
            <LinearGradient
              colors={T.gradColors as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}>
              <Feather name="lock" size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>

          <GlassCard style={styles.mainCard}>
            {feedback && (
              <View style={[styles.feedbackBanner, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                <Feather
                  name={feedback.type === 'error' ? 'alert-circle' : 'check-circle'}
                  size={16}
                  color={feedback.type === 'error' ? '#DC2626' : '#16A34A'}
                />
                <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess]}>
                  {feedback.message}
                </Text>
              </View>
            )}

            <View style={styles.formFields}>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color="#AEAEB2" style={styles.inputIcon} />
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

              <View style={[styles.inputWrap, styles.inputWrapBorder]}>
                <Feather name="check-circle" size={18} color="#AEAEB2" style={styles.inputIcon} />
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
              style={{ marginTop: 20, opacity: (!canSubmit && !loading) ? 0.5 : 1 }}>
              <LinearGradient
                colors={T.gradColors as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.primaryBtnText}>Update Password</Text>
                }
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/login')}>
            <Feather name="arrow-left" size={18} color={T.brand} />
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

  orbTopRight: {
    position: 'absolute',
    right: -60,
    top: 20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: T.brand + '14',
  },
  orbBottomLeft: {
    position: 'absolute',
    left: -80,
    bottom: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(123,121,232,0.06)',
  },

  iconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: T.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 28,
  },

  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassCardWeb: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    } as any : {}),
  },
  mainCard: {
    marginBottom: 20,
  },

  formFields: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: T.text,
  },

  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: 'rgba(220,38,38,0.08)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  feedbackTextError: {
    color: '#DC2626',
  },
  feedbackTextSuccess: {
    color: '#16A34A',
  },

  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: T.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.brand + '33',
    backgroundColor: T.brand + '0A',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: T.brand,
    letterSpacing: -0.2,
  },
});
