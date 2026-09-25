import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, AppState, useColorScheme, View } from 'react-native';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getAccessToken, getSession, loadSession, subscribeSession } from '@/services/session';
import { getProfileState, getServerProfileState, loadProfile, subscribeProfile } from '@/services/profile';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const profile = useSyncExternalStore(subscribeProfile, getProfileState, getServerProfileState);
  const [restored, setRestored] = useState(false);
  useEffect(() => { void loadSession().finally(() => setRestored(true)); }, []);
  useEffect(() => { if (session) void loadProfile(); }, [session]);
  useEffect(() => {
    if (!session) return;
    const validate = () => { void getAccessToken().catch(() => {}); };
    const timeout = setTimeout(validate, Math.max(0, session.expiresAt - Date.now() - 30_000));
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') validate(); });
    return () => { clearTimeout(timeout); subscription.remove(); };
  }, [session]);
  const ready = restored && !!session && profile.status === 'ready';
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {!restored ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restoring your session" /></View> :
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!ready}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          <Stack.Protected guard={ready}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="review/new" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Screen name="oauth" />
        </Stack>}
    </ThemeProvider>
  );
}
