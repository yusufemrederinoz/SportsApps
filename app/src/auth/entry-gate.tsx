import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Colors } from '@/constants/theme';

import { useAuth } from './auth-provider';
import type { Entry } from './session';

type Destination = Exclude<Entry, 'loading'>;

const ROUTES: Record<Destination, Href> = {
  onboarding: '/onboarding',
  welcome: '/welcome',
  app: '/',
};

function Waiting() {
  return (
    <Screen contentStyle={styles.waiting}>
      <ActivityIndicator size="large" color={Colors.volt} />
    </Screen>
  );
}

function Leave({ to }: { to: Href }) {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (router.canDismiss()) {
        router.dismissAll();
      } else {
        router.replace(to);
      }
    }, [router, to]),
  );

  return <Waiting />;
}

export function EntryGate({ allow, children }: PropsWithChildren<{ allow: Destination }>) {
  const { entry } = useAuth();
  if (entry === 'loading') {
    return <Waiting />;
  }
  if (entry !== allow) {
    return <Leave to={ROUTES[entry]} />;
  }
  return children;
}

const styles = StyleSheet.create({
  waiting: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
