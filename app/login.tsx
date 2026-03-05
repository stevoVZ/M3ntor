import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { T, S, F, R, shadow } from '../constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
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
        // Auth state change in _layout.tsx will handle navigation
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // Apple Sign In — install expo-apple-authentication and enable in app.json
  // async function handleAppleSignIn() { ... }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>

        {/* Brand hero */}
        <LinearGradient
          colors={[T.dark, '#1E1E2A']}
          style={styles.hero}>
          <Image
            source={require('../assets/images/m3ntor-logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTagline}>Build the life you actually want</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['signin', 'signup'] as Mode[]).map(m => (
              <Pressable key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}>
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Name (sign-up only) */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={T.t3}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.t3}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPass}
              placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              placeholderTextColor={T.t3}
              style={styles.input}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleEmailAuth}
            />
          </View>

          {/* Primary CTA */}
          <Pressable onPress={handleEmailAuth} disabled={loading} style={{ marginTop: S.sm }}>
            <LinearGradient
              colors={T.gradColors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}>
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
              }
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple Sign In placeholder — wire up expo-apple-authentication */}
          <Pressable style={styles.appleBtn}>
            <Text style={styles.appleBtnText}>🍎  Continue with Apple</Text>
          </Pressable>

          {/* Legal */}
          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: T.dark },
  kav:      { flex: 1 },

  hero:        { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 32, alignItems: 'center' },
  heroLogo:    { width: 200, height: 120 },
  heroTagline: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 8, textAlign: 'center' },

  form: {
    flex: 1, backgroundColor: T.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: S.lg, paddingTop: 28,
  },

  modeToggle: {
    flexDirection: 'row', backgroundColor: T.sep,
    borderRadius: R.lg, padding: 3, marginBottom: S.lg,
  },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: R.md - 2,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: 'white', ...shadow.sm },
  modeBtnText:   { fontSize: F.sm, fontWeight: '600', color: T.t3 },
  modeBtnTextActive: { color: T.brand, fontWeight: '800' },

  inputGroup: { marginBottom: S.md },
  inputLabel: { fontSize: F.xs, fontWeight: '700', color: T.t2, marginBottom: 6, letterSpacing: 0.2 },
  input: {
    backgroundColor: 'white', borderRadius: R.md,
    borderWidth: 1, borderColor: T.sep,
    paddingHorizontal: S.md, paddingVertical: 13,
    fontSize: F.md, color: T.text,
  },

  primaryBtn:     { borderRadius: R.xl, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: F.lg, fontWeight: '800', color: 'white', letterSpacing: -0.3 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: S.md },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: T.sep },
  dividerText: { fontSize: F.xs, color: T.t3 },

  appleBtn:     { backgroundColor: '#1C1C1E', borderRadius: R.xl, paddingVertical: 15, alignItems: 'center' },
  appleBtnText: { fontSize: F.md, fontWeight: '700', color: 'white' },

  legal: { fontSize: 10, color: T.t3, textAlign: 'center', lineHeight: 14, marginTop: S.md },
});
