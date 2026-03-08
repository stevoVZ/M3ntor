import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore, isGuestChosen } from '../lib/store';
import { T } from '../constants/theme';

function useAuthRedirect(userId: string | null, loading: boolean, guestMode: boolean) {
  const segments = useSegments();
  useEffect(() => {
    if (loading) return;
    if (!isSupabaseConfigured) return;
    if (guestMode) return;
    const inLogin = segments[0] === 'login';
    const inReset = segments[0] === 'reset-password';
    if (!userId && !inLogin && !inReset) router.replace('/login');
    else if (userId && inLogin) router.replace('/(tabs)/today');
  }, [userId, loading, segments, guestMode]);
}

export default function RootLayout() {
  const { userId, guestMode, setUserId, setGuestMode, loadAll } = useStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadAll('guest').finally(() => setBooting(false));
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        const uid = session?.user?.id ?? null;
        setUserId(uid);
        if (uid) {
          await loadAll(uid);
        } else {
          const chosen = await isGuestChosen();
          if (chosen) {
            setGuestMode(true);
            await loadAll('guest');
          }
        }
      } catch (e) {
        console.error('Boot error:', e);
      } finally {
        setBooting(false);
      }
    }).catch(() => {
      setBooting(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          setBooting(false);
          router.replace('/reset-password');
          return;
        }
        const uid = session?.user?.id ?? null;
        setUserId(uid);
        if (uid) {
          setGuestMode(false);
          try { await loadAll(uid); } catch (e) { console.error('Auth load error:', e); }
        }
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
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
          <Stack.Screen name="login"     options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="step/[stepId]" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen
            name="create"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
