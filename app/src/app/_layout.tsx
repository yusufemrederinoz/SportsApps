import '@/i18n';

import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { DatabaseProvider } from '@/data/database-provider';

void SplashScreen.preventAutoHideAsync();

const NIGHT_STADIUM_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    primary: Colors.pitch,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_500Medium,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={NIGHT_STADIUM_THEME}>
      <StatusBar style="light" />
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
