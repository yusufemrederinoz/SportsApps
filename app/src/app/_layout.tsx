import '@/i18n';

import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed/800ExtraBold_Italic';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { Colors } from '@/constants/theme';
import { DatabaseProvider } from '@/data/database-provider';

void SplashScreen.preventAutoHideAsync();

const NIGHT_STADIUM_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.panel,
    text: Colors.text,
    border: Colors.stroke,
    primary: Colors.volt,
  },
};

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { state, onboarded } = useAuth();
  const ready = fontsReady && state.status !== 'loading' && onboarded !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const entered = state.status === 'signed-in' || state.status === 'offline';
  const onboarding = !entered && !onboarded;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={entered}>
        <Stack.Screen name="index" />
        <Stack.Screen name="match" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={onboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!entered && !onboarding}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_500Medium,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold_Italic,
  });

  return (
    <ThemeProvider value={NIGHT_STADIUM_THEME}>
      <StatusBar style="light" />
      <AuthProvider>
        <DatabaseProvider>
          <RootNavigator fontsReady={loaded || error !== null} />
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
