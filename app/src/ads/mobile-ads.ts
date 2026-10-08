import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

let preparation: Promise<boolean> | null = null;

async function prepare(): Promise<boolean> {
  const consent = await AdsConsent.gatherConsent().catch(() => AdsConsent.getConsentInfo());
  if (consent.canRequestAds) {
    await mobileAds().initialize();
  }
  return consent.canRequestAds;
}

export function prepareAds(): Promise<boolean> {
  preparation ??= prepare().catch(() => {
    preparation = null;
    return false;
  });
  return preparation;
}

export interface RewardedAdEvents {
  onLoaded: () => void;
  onClosed: (earned: boolean) => void;
  onError: () => void;
}

export interface LoadedRewardedAd {
  show: () => void;
  release: () => void;
}

export function loadRewardedAd(unitId: string, userId: string, events: RewardedAdEvents): LoadedRewardedAd {
  const ad = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : unitId, {
    serverSideVerificationOptions: { userId },
  });
  let earned = false;
  ad.addAdEventListener(RewardedAdEventType.LOADED, events.onLoaded);
  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    earned = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => events.onClosed(earned));
  ad.addAdEventListener(AdEventType.ERROR, events.onError);
  ad.load();
  return {
    show: () => void ad.show().catch(events.onError),
    release: () => ad.removeAllListeners(),
  };
}

export async function needsPrivacyOptions(): Promise<boolean> {
  const consent = await AdsConsent.requestInfoUpdate();
  return consent.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export function showPrivacyOptions(): Promise<unknown> {
  return AdsConsent.showPrivacyOptionsForm();
}
