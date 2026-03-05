import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { T, S, F, R, shadow } from '../constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 20,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 20,
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

          <View style={styles.modeToggle}>
            {(['signin', 'signup'] as Mode[]).map(m => (
              <Pressable key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}>
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.formCard}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
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

            <View style={styles.inputGroup}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#C7C7CC"
                style={[styles.input, mode === 'signup' && styles.inputBorderTop]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                value={password}
                onChangeText={setPass}
                placeholder="Password"
                placeholderTextColor="#C7C7CC"
                style={[styles.input, styles.inputBorderTop]}
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
            style={[styles.primaryBtn, (!canSubmit && !loading) && styles.primaryBtnDisabled]}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.primaryBtnText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialBtn}>
            <View style={styles.socialIcon}>
              <Feather name="smartphone" size={18} color="white" />
            </View>
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
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  kav:  { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 32 },
  heroLogo: { width: 280, height: 180 },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadow.sm,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.t3,
  },
  modeBtnTextActive: {
    color: T.text,
    fontWeight: '600',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  inputGroup: {},
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: T.text,
    backgroundColor: '#FFFFFF',
  },
  inputBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: T.brand,
  },

  primaryBtn: {
    backgroundColor: T.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D1D1D6',
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
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 24,
  },
  socialIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
