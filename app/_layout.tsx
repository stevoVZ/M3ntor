import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../lib/store';
import { T } from '../constants/theme';

function useAuthRedirect(userId: string | null, loading: boolean, guestMode: boolean) {
  const segments = useSegments();
  useEffect(() => {
    if (loading) return;
    if (!isSupabaseConfigured) return;
    if (guestMode) return;
    const inLogin = segments[0] === 'login';
    if (!userId && !inLogin) router.replace('/login');
    else if (userId && inLogin) router.replace('/(tabs)/today');
  }, [userId, loading, segments, guestMode]);
}

export default function RootLayout() {
  const { userId, setUserId, loadAll } = useStore();
  const [booting, setBooting] = useState(true);
  const guestRef = useRef(false);
  const segments = useSegments();
  const inApp = segments[0] === '(tabs)' || segments[0] === 'item';

  if (!guestRef.current && !userId && inApp) guestRef.current = true;
  if (userId) guestRef.current = false;
  const guestMode = guestRef.current;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadAll('guest').finally(() => setBooting(false));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadAll(uid).finally(() => setBooting(false));
      else loadAll('guest').finally(() => setBooting(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const uid = session?.user?.id ?? null;
        setUserId(uid);
        if (uid) await loadAll(uid);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useAuthRedirect(userId, booting, guestMode);

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: '#141419', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.brand} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
            <Stack.Screen name="login"     options={{ headerShown: false }} />
            <Stack.Screen name="item/[id]" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
