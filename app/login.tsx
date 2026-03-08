import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../lib/store';

type Mode = 'signin' | 'signup';
type Feedback = { type: 'success' | 'error'; message: string } | null;

const ACCENT = '#007AFF';
const DARK = '#1C1C1E';
const LABEL = '#3A3A3C';
const SUBTLE = '#8E8E93';
const SEPARATOR = 'rgba(60,60,67,0.08)';
const CARD_BG = 'rgba(255,255,255,0.68)';
const CARD_BORDER = 'rgba(255,255,255,0.72)';
const INPUT_BG = 'rgba(245,245,247,0.7)';

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.glassCardWeb, style]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={48} tint="systemChromeMaterialLight" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mode, setMode]       = useState<Mode>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setFeedback(null);
  }

  async function handleForgotPassword() {
    setFeedback(null);
    if (!isSupabaseConfigured || !supabase) {
      setFeedback({ type: 'error', message: 'Supabase is not configured.' });
      return;
    }
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email address first.' });
      return;
    }
    setLoading(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const redirectTo = domain ? `https://${domain.replace(/:5000$/, '')}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Password reset email sent. Check your inbox.' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAuth() {
    setFeedback(null);
    if (!isSupabaseConfigured || !supabase) {
      setFeedback({ type: 'error', message: 'Supabase is not configured. Please add your Supabase credentials.' });
      return;
    }
    if (!email.trim() || !password.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email and password.' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email:    email.trim(),
          password: password.trim(),
          options:  { data: { name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace('/(tabs)/today');
        } else {
          setFeedback({ type: 'success', message: 'Check your email for a confirmation link.' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email:    email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        router.replace('/(tabs)/today');
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;
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
            paddingTop: topPad + 16,
            paddingBottom: bottomPad + 24,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.hero}>
            <Image
              source={require('../assets/images/m3ntor-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>

          <GlassCard style={styles.mainCard}>
            <View style={styles.segmentedControl}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <Pressable key={m} onPress={() => switchMode(m)}
                  style={[styles.segment, mode === m && styles.segmentActive]}>
                  <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                </Pressable>
              ))}
            </View>

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
              {mode === 'signup' && (
                <View style={styles.inputRow}>
                  <Feather name="user" size={17} color={SUBTLE} style={styles.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#C7C7CC"
                    style={styles.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={[styles.inputRow, mode === 'signup' && styles.inputRowBorder]}>
                <Feather name="mail" size={17} color={SUBTLE} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#C7C7CC"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputRow, styles.inputRowBorder]}>
                <Feather name="lock" size={17} color={SUBTLE} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPass}
                  placeholder="Password"
                  placeholderTextColor="#C7C7CC"
                  style={styles.input}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleEmailAuth}
                />
              </View>
            </View>

            {mode === 'signin' && (
              <Pressable style={styles.forgotBtn} onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleEmailAuth}
              disabled={loading || !canSubmit}
              style={[styles.primaryBtn, { marginTop: mode === 'signin' ? 0 : 20, opacity: (!canSubmit && !loading) ? 0.4 : 1 }]}>
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
              }
            </Pressable>
          </GlassCard>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.appleBtn}>
            <Feather name="smartphone" size={19} color="white" />
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={styles.guestBtn}
            onPress={async () => {
              const store = useStore.getState();
              store.setGuestMode(true);
              await store.loadAll('guest');
              router.replace('/(tabs)/today');
            }}>
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
            <Feather name="arrow-right" size={16} color={LABEL} />
          </Pressable>

          <Text style={styles.legal}>
            By continuing you agree to our{'\n'}Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav:  { flex: 1 },
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

  hero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 36,
  },
  heroLogo: { width: 320, height: 210 },

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

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118,118,128,0.08)',
    borderRadius: 10,
    padding: 2,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SUBTLE,
    letterSpacing: -0.1,
  },
  segmentTextActive: {
    color: DARK,
    fontWeight: '600' as const,
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

  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: ACCENT,
    letterSpacing: -0.1,
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

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: SEPARATOR,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#C7C7CC',
  },

  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 10,
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: LABEL,
    letterSpacing: -0.2,
  },

  legal: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
});
