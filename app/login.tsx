import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useItems } from '@/lib/store';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setUserId } = useItems();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      Alert.alert('Not configured', 'Supabase is not configured.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (isSignUp) {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          setUserId(data.user.id);
          Alert.alert('Account created', 'Check your email to confirm your account, then sign in.');
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          setUserId(data.user.id);
          router.replace('/(tabs)/today');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/today');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + webTopInset + 60 }]}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="compass" size={40} color={Colors.light.systemBlue} />
          </View>
          <Text style={styles.appName}>M3NTOR</Text>
          <Text style={styles.tagline}>Your unified life management system</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#C7C7CC"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              testID="login-email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#C7C7CC"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              testID="login-password"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8E8E93" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleAuth}
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            disabled={loading}
            testID="login-submit"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Text style={styles.toggleAction}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSkip} style={styles.skipButton} testID="login-skip">
          <Text style={styles.skipText}>Continue without account</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.light.textTertiary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.groupedBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
    marginTop: 4,
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.light.separator,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.text,
  },
  authButton: {
    backgroundColor: Colors.light.systemBlue,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
  },
  toggleAction: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.systemBlue,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.textTertiary,
  },
});
