import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

async function askForTracking(): Promise<void> {
  const tracking = await import('expo-tracking-transparency');
  const current = await tracking.getTrackingPermissionsAsync();
  if (current.status === tracking.PermissionStatus.UNDETERMINED) {
    await tracking.requestTrackingPermissionsAsync();
  }
}

export function useTrackingRequest(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS !== 'ios') {
      return undefined;
    }
    let asked = false;
    const ask = () => {
      if (asked || AppState.currentState !== 'active') {
        return;
      }
      asked = true;
      void askForTracking().catch((error: unknown) => {
        console.warn('Could not ask for tracking permission', error);
      });
    };
    ask();
    const subscription = AppState.addEventListener('change', ask);
    return () => subscription.remove();
  }, [ready]);
}
