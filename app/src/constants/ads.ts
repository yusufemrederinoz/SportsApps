import { Platform, TurboModuleRegistry } from 'react-native';

const REWARDED_AD_UNITS: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'ca-app-pub-1202798518025462/4145935545',
  android: 'ca-app-pub-1202798518025462/8520294827',
};

export const rewardedAdUnit = REWARDED_AD_UNITS[Platform.OS] ?? null;
export const adsBuiltIn = TurboModuleRegistry.get('RNGoogleMobileAdsModule') !== null;
