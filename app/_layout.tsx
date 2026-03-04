import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../lib/store';
import { T } from '../constants/theme';

function useAuthRedirect(userId: string | null, loading: boolean) {
  const segments = useSegments();
  useEffect(() => {
    if (loading) return;
    if (!isSupabaseConfigured) return;
    const inLogin = segments[0] === 'login';
    if (!userId && !inLogin) router.replace('/login');
    else if (userId && inLogin) router.replace('/(tabs)/today');
  }, [userId, loading, segments]);
}

export default function RootLayout() {
  const { userId, setUserId, loadAll } = useStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setBooting(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadAll(uid).finally(() => setBooting(false));
      else setBooting(false);
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

  useAuthRedirect(userId, booting);

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: '#16103A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.brand} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
          <Stack.Screen name="login"     options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
