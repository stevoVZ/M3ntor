import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { T, S, F, R, shadow } from '../constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mode, setMode]       = useState<Mode>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Not configured', 'Supabase is not configured. Please add your Supabase credentials.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
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
        if (!data.session) {
          Alert.alert('Check your email', 'We sent you a confirmation link.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email:    email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;
  const topPad = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0);
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0);

  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    if (Platform.OS === 'web') {
      return <View style={[styles.glassCardWeb, style]}>{children}</View>;
    }
    return (
      <BlurView intensity={60} tint="light" style={[styles.glassCard, style]}>
        {children}
      </BlurView>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F8F7FF', '#EDE9FE', '#F0EAFF', '#F5F3FF']}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.orbTopRight, { top: topPad - 40 }]} />
      <View style={styles.orbBottomLeft} />

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
            <View style={styles.modeToggle}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <Pressable key={m} onPress={() => setMode(m)}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}>
                  {mode === m ? (
                    <LinearGradient
                      colors={['#FFFFFF', '#FAFAFF']}
                      style={styles.modeBtnGrad}>
                      <Text style={[styles.modeBtnText, styles.modeBtnTextActive]}>
                        {m === 'signin' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.modeBtnText}>
                      {m === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.formFields}>
              {mode === 'signup' && (
                <View style={styles.inputWrap}>
                  <Feather name="user" size={18} color="#AEAEB2" style={styles.inputIcon} />
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

              <View style={[styles.inputWrap, mode === 'signup' && styles.inputWrapBorder]}>
                <Feather name="mail" size={18} color="#AEAEB2" style={styles.inputIcon} />
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

              <View style={[styles.inputWrap, styles.inputWrapBorder]}>
                <Feather name="lock" size={18} color="#AEAEB2" style={styles.inputIcon} />
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
              <Pressable style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleEmailAuth}
              disabled={loading || !canSubmit}
              style={{ marginTop: mode === 'signin' ? 0 : 20, opacity: (!canSubmit && !loading) ? 0.5 : 1 }}>
              <LinearGradient
                colors={[T.brand, '#7B79E8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.primaryBtnText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                }
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialBtn}>
            <Feather name="smartphone" size={20} color="white" />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
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

  orbTopRight: {
    position: 'absolute',
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(88,86,214,0.08)',
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

  hero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 36,
  },
  heroLogo: { width: 320, height: 210 },

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

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  modeBtnGrad: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeBtnTextActive: {
    color: T.brand,
    fontWeight: '700',
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

  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.brand,
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
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#AEAEB2',
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  socialBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  legal: {
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 18,
  },
});
