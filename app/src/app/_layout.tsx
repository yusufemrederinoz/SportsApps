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

import { AuthProvider } from '@/auth/auth-provider';
import { OfflineBanner } from '@/components/offline-banner';
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

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_500Medium,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold_Italic,
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
      <AuthProvider>
        <DatabaseProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />
          <OfflineBanner />
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
