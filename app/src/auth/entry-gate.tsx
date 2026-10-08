import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Colors } from '@/constants/theme';

import { useAuth } from './auth-provider';
import type { Entry } from './session';

type Destination = Exclude<Entry, 'loading'>;

const ROUTE_NAMES: Record<Destination, string> = {
  onboarding: 'onboarding',
  welcome: 'welcome',
  username: 'username',
  app: 'index',
};

function Waiting() {
  return (
    <Screen contentStyle={styles.waiting}>
      <ActivityIndicator size="large" color={Colors.volt} />
    </Screen>
  );
}

function Leave({ to }: { to: string }) {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.reset({ index: 0, routes: [{ name: to as never }] });
    }, [navigation, to]),
  );

  return <Waiting />;
}

export function EntryGate({ allow, children }: PropsWithChildren<{ allow: Destination }>) {
  const { entry } = useAuth();
  if (entry === 'loading') {
    return <Waiting />;
  }
  if (entry !== allow) {
    return <Leave to={ROUTE_NAMES[entry]} />;
  }
  return children;
}

const styles = StyleSheet.create({
  waiting: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
